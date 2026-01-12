import { getTokenInfo, getTokenHolders, getCreatorTokens, fetchCreatorTokensPage } from './api/fourmeme';
import { getTokenPairs } from './api/dexscreener';
import { getTokenPools } from './api/geckoterminal';
import { getBNBBalance, getTokenBalance } from './api/bsc-rpc';
import { calculateRiskScore } from '@/services/riskScore';
import { analyzeHolderConcentration, findCreatorInHolders } from '@/services/holderAnalysis';
import type { AnalysisResult, MarketData, MessageType, HolderInfo, CreatorTokenInfo } from '@/types';

// Cache for analysis results
const analysisCache = new Map<string, { result: AnalysisResult; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: MessageType & { forceRefresh?: boolean; pageNo?: number }, _sender, sendResponse) => {
  console.log('[Background] Received message:', message);

  if (message.type === 'ANALYZE_TOKEN') {
    const forceRefresh = (message as any).forceRefresh === true;
    console.log('[Background] Starting analysis for:', message.address, 'forceRefresh:', forceRefresh);

    // Clear cache if force refresh
    if (forceRefresh) {
      analysisCache.delete(message.address.toLowerCase());
      console.log('[Background] Cache cleared for:', message.address);
    }

    analyzeToken(message.address)
      .then((result) => {
        console.log('[Background] Analysis complete, holders count:', result.holders.length);
        console.log('[Background] Creator holding:', result.creator.holding);
        sendResponse({ type: 'ANALYSIS_RESULT', result });

        // Start loading more creator tokens in background if there might be more
        if (result.creator.createdTokens && result.creator.createdTokens.length >= 30) {
          loadMoreCreatorTokens(message.address, result.creator.address, result.creator.createdTokens);
        }
      })
      .catch((error) => {
        console.error('[Background] Analysis error:', error);
        sendResponse({ type: 'ANALYSIS_ERROR', error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'LOAD_MORE_CREATOR_TOKENS') {
    const { creatorAddress, pageNo } = message as any;
    console.log('[Background] Loading more creator tokens, page:', pageNo);

    fetchCreatorTokensPage(creatorAddress, pageNo, 30)
      .then((result) => {
        if (result.success && result.data) {
          sendResponse({
            type: 'MORE_CREATOR_TOKENS',
            tokens: result.data.tokens,
            hasMore: result.data.hasMore,
            pageNo,
          });
        } else {
          sendResponse({ type: 'MORE_CREATOR_TOKENS', tokens: [], hasMore: false, pageNo });
        }
      })
      .catch((error) => {
        console.error('[Background] Load more tokens error:', error);
        sendResponse({ type: 'MORE_CREATOR_TOKENS', tokens: [], hasMore: false, pageNo });
      });
    return true;
  }
});

// Load more creator tokens in background and notify popup
async function loadMoreCreatorTokens(
  tokenAddress: string,
  creatorAddress: string,
  existingTokens: CreatorTokenInfo[]
) {
  let pageNo = 2;
  let hasMore = true;
  const allTokens = [...existingTokens];

  while (hasMore && pageNo <= 20) {
    try {
      const result = await fetchCreatorTokensPage(creatorAddress, pageNo, 30);
      if (result.success && result.data) {
        allTokens.push(...result.data.tokens);
        hasMore = result.data.hasMore;

        // Send update to popup
        chrome.runtime.sendMessage({
          type: 'CREATOR_TOKENS_UPDATE',
          tokenAddress,
          tokens: allTokens,
          loading: hasMore,
        }).catch(() => {
          // Popup might be closed, ignore error
        });

        // Update cache
        const cached = analysisCache.get(tokenAddress.toLowerCase());
        if (cached) {
          cached.result.creator.createdTokens = allTokens;
        }

        pageNo++;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('[Background] Error loading more tokens:', error);
      hasMore = false;
    }
  }

  console.log('[Background] Finished loading all creator tokens:', allTokens.length);
}

async function analyzeToken(tokenAddress: string): Promise<AnalysisResult> {
  // Check cache first (disabled for debugging)
  // const cached = analysisCache.get(tokenAddress.toLowerCase());
  // if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  //   console.log('[Background] Returning cached result');
  //   return cached.result;
  // }
  console.log('[Background] Fetching fresh data (cache disabled for debugging)');

  // Fetch all data in parallel
  const [tokenResult, holdersResult, dexScreenerResult, geckoResult] = await Promise.all([
    getTokenInfo(tokenAddress),
    getTokenHolders(tokenAddress),
    getTokenPairs(tokenAddress),
    getTokenPools(tokenAddress),
  ]);

  if (!tokenResult.success || !tokenResult.data) {
    throw new Error(tokenResult.error || 'Failed to fetch token info');
  }

  const token = tokenResult.data;
  let holders: HolderInfo[] = holdersResult.success ? holdersResult.data || [] : [];

  console.log('[Analyzer] Holders count from API:', holders.length);

  // Get creator BNB balance
  const bnbResult = await getBNBBalance(token.userAddress);
  const creatorBnbBalance = bnbResult.success ? parseFloat(bnbResult.data || '0') : 0;

  // Get total supply from token info
  const totalSupply = token.totalAmount;

  // If holders is empty, try to get creator balance directly from chain
  let creatorHolding = findCreatorInHolders(holders, token.userAddress, totalSupply);

  // Always try to get creator balance from chain for accurate data
  console.log('[Analyzer] Getting creator token balance from chain...');
  console.log('[Analyzer] Token address:', tokenAddress);
  console.log('[Analyzer] Creator address:', token.userAddress);
  console.log('[Analyzer] Total supply:', totalSupply);

  const creatorBalanceResult = await getTokenBalance(tokenAddress, token.userAddress);
  console.log('[Analyzer] Creator balance result:', creatorBalanceResult);

  if (creatorBalanceResult.success && creatorBalanceResult.data) {
    const creatorAmount = creatorBalanceResult.data;
    console.log('[Analyzer] Creator token balance:', creatorAmount);

    // Create holder entry for the creator
    if (BigInt(creatorAmount) > 0n) {
      const totalSupplyBigInt = BigInt(totalSupply);
      const percent = Number((BigInt(creatorAmount) * 10000n) / totalSupplyBigInt) / 100;
      console.log('[Analyzer] Creator holding percent:', percent);

      creatorHolding = {
        amount: creatorAmount,
        percent,
        rank: null,
      };

      // Add creator to holders list if not already there
      const creatorInList = holders.find(
        h => h.address.toLowerCase() === token.userAddress.toLowerCase()
      );
      if (!creatorInList) {
        holders.push({
          address: token.userAddress,
          amount: creatorAmount,
          userName: token.userName || '',
        });
      }
    }
  } else {
    console.log('[Analyzer] Failed to get creator balance:', creatorBalanceResult.error);
  }

  // Analyze holder concentration
  const holderConcentration = analyzeHolderConcentration(holders, totalSupply);

  console.log('[Analyzer] Holder concentration:', holderConcentration);

  // Merge market data from multiple sources
  const market = mergeMarketData(
    dexScreenerResult.success ? dexScreenerResult.data : undefined,
    geckoResult.success ? geckoResult.data : undefined,
    token
  );

  // Calculate risk score
  const risk = calculateRiskScore({
    creatorHoldingPercent: creatorHolding.percent,
    holderConcentration,
    liquidity: market.liquidity,
    totalTxns24h: market.buys24h + market.sells24h,
    creatorBnbBalance,
  });

  // Fetch creator's other tokens (first page only for fast loading)
  console.log('[Analyzer] Fetching creator tokens (first page)...');
  const creatorTokensResult = await getCreatorTokens(token.userAddress);
  const creatorTokens = creatorTokensResult.success ? creatorTokensResult.data || [] : [];
  console.log('[Analyzer] Creator tokens first page:', creatorTokens.length);

  const result: AnalysisResult = {
    token,
    creator: {
      address: token.userAddress,
      bnbBalance: creatorBnbBalance.toString(),
      holding: creatorHolding,
      createdTokens: creatorTokens,
    },
    holders,
    holderConcentration,
    market,
    risk,
    timestamp: Date.now(),
  };

  // Cache the result
  analysisCache.set(tokenAddress.toLowerCase(), { result, timestamp: Date.now() });

  return result;
}

function mergeMarketData(
  dexScreener?: MarketData,
  gecko?: Partial<MarketData>,
  token?: { marketCap: number; tokenPrice: number; dayIncrease: number }
): MarketData {
  // Prefer DexScreener, fallback to GeckoTerminal, then Four.meme
  // Use Number() to ensure all values are numbers
  return {
    price: Number(dexScreener?.price) || Number(gecko?.price) || Number(token?.tokenPrice) || 0,
    priceChange24h: Number(dexScreener?.priceChange24h) || Number(gecko?.priceChange24h) || Number(token?.dayIncrease) || 0,
    priceChange1h: Number(dexScreener?.priceChange1h) || Number(gecko?.priceChange1h) || 0,
    marketCap: Number(dexScreener?.marketCap) || Number(gecko?.marketCap) || Number(token?.marketCap) || 0,
    fdv: Number(dexScreener?.fdv) || Number(gecko?.fdv) || 0,
    liquidity: Number(dexScreener?.liquidity) || Number(gecko?.liquidity) || 0,
    volume24h: Number(dexScreener?.volume24h) || Number(gecko?.volume24h) || 0,
    buys24h: Number(dexScreener?.buys24h) || Number(gecko?.buys24h) || 0,
    sells24h: Number(dexScreener?.sells24h) || Number(gecko?.sells24h) || 0,
  };
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_TTL * 5) {
      analysisCache.delete(key);
    }
  }
}, 300000); // Every 5 minutes

console.log('FourMeme Creator Analyzer background service started');

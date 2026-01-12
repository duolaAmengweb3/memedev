import type { MarketData, ApiResponse } from '@/types';

const BASE_URL = 'https://api.dexscreener.com/latest/dex';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h1: number;
  };
  priceChange: {
    h24: number;
    h1: number;
    m5: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
}

export async function getTokenPairs(tokenAddress: string): Promise<ApiResponse<MarketData>> {
  try {
    const response = await fetch(`${BASE_URL}/tokens/${tokenAddress}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result: DexScreenerResponse = await response.json();

    if (!result.pairs || result.pairs.length === 0) {
      throw new Error('No trading pairs found');
    }

    // Get the pair with highest liquidity
    const mainPair = result.pairs.reduce((best, current) =>
      (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
    );

    const marketData: MarketData = {
      price: parseFloat(mainPair.priceUsd) || 0,
      priceChange24h: mainPair.priceChange?.h24 || 0,
      priceChange1h: mainPair.priceChange?.h1 || 0,
      marketCap: mainPair.marketCap || 0,
      fdv: mainPair.fdv || 0,
      liquidity: mainPair.liquidity?.usd || 0,
      volume24h: mainPair.volume?.h24 || 0,
      buys24h: mainPair.txns?.h24?.buys || 0,
      sells24h: mainPair.txns?.h24?.sells || 0,
    };

    return { success: true, data: marketData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

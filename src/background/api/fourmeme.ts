import type { TokenInfo, HolderInfo, ApiResponse, CreatorTokenInfo } from '@/types';

const BASE_URL = 'https://four.meme/meme-api/v1';

interface FourmemeTokenResponse {
  code: number;
  data: TokenInfo;
}


export async function getTokenInfo(tokenAddress: string): Promise<ApiResponse<TokenInfo>> {
  try {
    const response = await fetch(
      `${BASE_URL}/private/token/get?address=${tokenAddress}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result: FourmemeTokenResponse = await response.json();

    if (result.code !== 0) {
      throw new Error(`API error code: ${result.code}`);
    }

    // Ensure numeric fields are numbers
    const data = result.data;
    return {
      success: true,
      data: {
        ...data,
        marketCap: Number(data.marketCap) || 0,
        tokenPrice: Number(data.tokenPrice) || 0,
        dayIncrease: Number(data.dayIncrease) || 0,
        launchTime: Number(data.launchTime) || 0,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getTokenHolders(
  tokenAddress: string,
  pageNo: number = 1,
  pageSize: number = 100
): Promise<ApiResponse<HolderInfo[]>> {
  try {
    const url = `${BASE_URL}/private/token/holder?address=${tokenAddress}&pageNo=${pageNo}&pageSize=${pageSize}`;
    console.log('[FourMeme] Fetching holders from:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('[FourMeme] Holder response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('[FourMeme] Holder response:', JSON.stringify(result).slice(0, 500));

    if (result.code !== 0) {
      throw new Error(`API error code: ${result.code}`);
    }

    // Handle multiple possible response formats
    let holders: HolderInfo[] = [];

    if (Array.isArray(result.data)) {
      // Format: { data: [...] }
      holders = result.data;
    } else if (result.data && typeof result.data === 'object') {
      if ('tokenHolders' in result.data && Array.isArray(result.data.tokenHolders)) {
        // Format: { data: { tokenHolders: [...] } } - This is the actual Four.meme format!
        holders = result.data.tokenHolders;
      } else if ('list' in result.data && Array.isArray(result.data.list)) {
        // Format: { data: { list: [...] } }
        holders = result.data.list;
      } else if ('records' in result.data && Array.isArray(result.data.records)) {
        // Format: { data: { records: [...] } }
        holders = result.data.records;
      }
    }

    console.log('[FourMeme] Parsed holders count:', holders.length);

    // Map holder data to ensure consistent format
    // Note: Four.meme returns amount as a decimal string (e.g., "800843038.8458921")
    // Keep it as-is, we'll handle decimal math in holderAnalysis
    holders = holders.map((h: any) => ({
      address: String(h.address || h.holderAddress || h.holder || ''),
      amount: String(h.amount || h.balance || h.tokenAmount || '0'),
      userName: String(h.userName || h.name || ''),
    }));

    return { success: true, data: holders };
  } catch (error) {
    console.error('[FourMeme] getTokenHolders error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper function to parse token data
function parseTokenData(t: any): CreatorTokenInfo {
  return {
    address: String(t.address || ''),
    name: String(t.name || ''),
    symbol: String(t.symbol || ''),
    imageUrl: t.imageUrl ? String(t.imageUrl) : undefined,
    status: String(t.status || ''),
    marketCap: Number(t.marketCap) || Number(t.tokenPrice?.marketCap) || 0,
    price: Number(t.price) || Number(t.tokenPrice?.price) || Number(t.tokenPrice) || 0,
    dayIncrease: Number(t.dayIncrease) || Number(t.tokenPrice?.dayIncrease) || 0,
    holderCount: Number(t.holderCount) || 0,
    launchTime: Number(t.launchTime) || 0,
    createDate: String(t.createDate || ''),
    dexType: t.dexType ? String(t.dexType) : undefined,
    progress: Number(t.progress) || 0,
  };
}

// Fetch a single page of creator tokens
export async function fetchCreatorTokensPage(
  creatorAddress: string,
  pageNo: number = 1,
  pageSize: number = 30
): Promise<ApiResponse<{ tokens: CreatorTokenInfo[]; hasMore: boolean }>> {
  try {
    const url = `${BASE_URL}/private/token/query?userAddress=${creatorAddress}&pageNo=${pageNo}&pageSize=${pageSize}`;
    console.log('[FourMeme] Fetching creator tokens page', pageNo);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 0) {
      throw new Error(`API error code: ${result.code}`);
    }

    const pageTokens = Array.isArray(result.data) ? result.data : [];
    const tokens = pageTokens.map(parseTokenData);
    const hasMore = pageTokens.length >= pageSize;

    console.log('[FourMeme] Page', pageNo, 'tokens:', tokens.length, 'hasMore:', hasMore);

    return { success: true, data: { tokens, hasMore } };
  } catch (error) {
    console.error('[FourMeme] fetchCreatorTokensPage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get first page of creator tokens (fast, for initial display)
export async function getCreatorTokens(
  creatorAddress: string
): Promise<ApiResponse<CreatorTokenInfo[]>> {
  const result = await fetchCreatorTokensPage(creatorAddress, 1, 30);
  if (result.success && result.data) {
    return { success: true, data: result.data.tokens };
  }
  return { success: false, error: result.error };
}

import type { MarketData, ApiResponse } from '@/types';

const BASE_URL = 'https://api.geckoterminal.com/api/v2';

interface GeckoTokenAttributes {
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
  price_usd: string;
  fdv_usd: string;
  total_reserve_in_usd: string;
  volume_usd: {
    h24: string;
  };
  market_cap_usd: string;
}

interface GeckoPoolAttributes {
  name: string;
  address: string;
  base_token_price_usd: string;
  quote_token_price_usd: string;
  reserve_in_usd: string;
  pool_created_at: string;
  fdv_usd: string;
  market_cap_usd: string;
  price_change_percentage: {
    h1: string;
    h24: string;
  };
  transactions: {
    h24: {
      buys: number;
      sells: number;
      buyers: number;
      sellers: number;
    };
  };
  volume_usd: {
    h24: string;
  };
}

interface GeckoTokenResponse {
  data: {
    id: string;
    type: string;
    attributes: GeckoTokenAttributes;
  };
}

interface GeckoPoolsResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: GeckoPoolAttributes;
  }>;
}

export async function getTokenInfo(tokenAddress: string): Promise<ApiResponse<Partial<MarketData>>> {
  try {
    const response = await fetch(
      `${BASE_URL}/networks/bsc/tokens/${tokenAddress}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result: GeckoTokenResponse = await response.json();
    const attrs = result.data.attributes;

    return {
      success: true,
      data: {
        price: parseFloat(attrs.price_usd) || 0,
        fdv: parseFloat(attrs.fdv_usd) || 0,
        liquidity: parseFloat(attrs.total_reserve_in_usd) || 0,
        volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
        marketCap: parseFloat(attrs.market_cap_usd) || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getTokenPools(tokenAddress: string): Promise<ApiResponse<Partial<MarketData>>> {
  try {
    const response = await fetch(
      `${BASE_URL}/networks/bsc/tokens/${tokenAddress}/pools`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result: GeckoPoolsResponse = await response.json();

    if (!result.data || result.data.length === 0) {
      throw new Error('No pools found');
    }

    // Get the pool with highest liquidity
    const mainPool = result.data.reduce((best, current) =>
      parseFloat(current.attributes.reserve_in_usd) > parseFloat(best.attributes.reserve_in_usd)
        ? current
        : best
    );

    const attrs = mainPool.attributes;

    return {
      success: true,
      data: {
        price: parseFloat(attrs.base_token_price_usd) || 0,
        priceChange24h: parseFloat(attrs.price_change_percentage?.h24) || 0,
        priceChange1h: parseFloat(attrs.price_change_percentage?.h1) || 0,
        fdv: parseFloat(attrs.fdv_usd) || 0,
        marketCap: parseFloat(attrs.market_cap_usd) || 0,
        liquidity: parseFloat(attrs.reserve_in_usd) || 0,
        volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
        buys24h: attrs.transactions?.h24?.buys || 0,
        sells24h: attrs.transactions?.h24?.sells || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

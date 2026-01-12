// Token info from Four.meme API
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  shortName: string;
  imageUrl: string;
  description: string;
  totalAmount: string;
  saleAmount: string;
  marketCap: number;
  tokenPrice: number;
  dayIncrease: number;
  status: 'INIT' | 'TRADE' | 'STOP';
  dexType: string;
  tradeUrl: string;
  launchTime: number;
  createDate: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  userId: number;
  userAddress: string;
  userName: string;
}

// Holder info from Four.meme API
export interface HolderInfo {
  address: string;
  amount: string;
  userName: string;
}

// Creator's token info (simplified)
export interface CreatorTokenInfo {
  address: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  status: string;
  marketCap: number;
  price: number;
  dayIncrease: number;
  holderCount: number;
  launchTime: number;
  createDate: string;
  dexType?: string;
  progress: number;
}

// Creator analysis result
export interface CreatorAnalysis {
  address: string;
  bnbBalance: string;
  holding: {
    amount: string;
    percent: number;
    rank: number | null;
  };
  createdTokens?: CreatorTokenInfo[];
}

// Holder concentration analysis
export interface HolderConcentration {
  top10Percent: number;
  top20Percent: number;
  largestHolderPercent: number;
  largestHolderAddress: string;
  holderCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Market data from DexScreener/GeckoTerminal
export interface MarketData {
  price: number;
  priceChange24h: number;
  priceChange1h: number;
  marketCap: number;
  fdv: number;
  liquidity: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
}

// Risk score breakdown
export interface RiskScoreBreakdown {
  creatorHolding: { score: number; maxScore: number; detail: string };
  holderConcentration: { score: number; maxScore: number; detail: string };
  liquidity: { score: number; maxScore: number; detail: string };
  tradingActivity: { score: number; maxScore: number; detail: string };
  creatorBalance: { score: number; maxScore: number; detail: string };
}

// Overall risk assessment
export interface RiskAssessment {
  totalScore: number;
  maxScore: number;
  level: 'LOW' | 'MEDIUM_LOW' | 'MEDIUM_HIGH' | 'HIGH' | 'EXTREME';
  breakdown: RiskScoreBreakdown;
}

// Complete analysis result
export interface AnalysisResult {
  token: TokenInfo;
  creator: CreatorAnalysis;
  holders: HolderInfo[];
  holderConcentration: HolderConcentration;
  market: MarketData;
  risk: RiskAssessment;
  timestamp: number;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Message types for extension communication
export type MessageType =
  | { type: 'GET_TOKEN_ADDRESS' }
  | { type: 'TOKEN_ADDRESS_CHANGED'; address: string }
  | { type: 'ANALYZE_TOKEN'; address: string }
  | { type: 'ANALYSIS_RESULT'; result: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; error: string }
  | { type: 'LOAD_MORE_CREATOR_TOKENS'; creatorAddress: string; pageNo: number }
  | { type: 'MORE_CREATOR_TOKENS'; tokens: CreatorTokenInfo[]; hasMore: boolean; pageNo: number }
  | { type: 'CREATOR_TOKENS_UPDATE'; tokenAddress: string; tokens: CreatorTokenInfo[]; loading: boolean };

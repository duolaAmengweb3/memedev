import type { RiskAssessment, RiskScoreBreakdown, HolderConcentration } from '@/types';

interface RiskScoreInput {
  creatorHoldingPercent: number;
  holderConcentration: HolderConcentration;
  liquidity: number;
  totalTxns24h: number;
  creatorBnbBalance: number;
}

export function calculateRiskScore(input: RiskScoreInput): RiskAssessment {
  const breakdown: RiskScoreBreakdown = {
    creatorHolding: calculateCreatorHoldingScore(input.creatorHoldingPercent),
    holderConcentration: calculateHolderConcentrationScore(input.holderConcentration?.top10Percent),
    liquidity: calculateLiquidityScore(input.liquidity),
    tradingActivity: calculateTradingActivityScore(input.totalTxns24h),
    creatorBalance: calculateCreatorBalanceScore(input.creatorBnbBalance),
  };

  const totalScore =
    breakdown.creatorHolding.score +
    breakdown.holderConcentration.score +
    breakdown.liquidity.score +
    breakdown.tradingActivity.score +
    breakdown.creatorBalance.score;

  const maxScore = 100;

  return {
    totalScore,
    maxScore,
    level: getRiskLevel(totalScore),
    breakdown,
  };
}

function calculateCreatorHoldingScore(percent: number): RiskScoreBreakdown['creatorHolding'] {
  const maxScore = 35;
  let score: number;
  let detail: string;

  // Safe number conversion
  const safePercent = Number(percent) || 0;

  if (safePercent < 5) {
    score = 35;
    detail = `创建者持有 ${safePercent.toFixed(1)}% (极低)`;
  } else if (safePercent < 10) {
    score = 25;
    detail = `创建者持有 ${safePercent.toFixed(1)}% (低)`;
  } else if (safePercent < 20) {
    score = 15;
    detail = `创建者持有 ${safePercent.toFixed(1)}% (中等)`;
  } else if (safePercent < 50) {
    score = 5;
    detail = `创建者持有 ${safePercent.toFixed(1)}% (高)`;
  } else {
    score = 0;
    detail = `创建者持有 ${safePercent.toFixed(1)}% (极高风险)`;
  }

  return { score, maxScore, detail };
}

function calculateHolderConcentrationScore(top10Percent: number): RiskScoreBreakdown['holderConcentration'] {
  const maxScore = 25;
  let score: number;
  let detail: string;

  // Safe number conversion
  const safeTop10 = Number(top10Percent) || 0;

  if (safeTop10 < 50) {
    score = 25;
    detail = `Top 10 持有 ${safeTop10.toFixed(1)}% (分布良好)`;
  } else if (safeTop10 < 70) {
    score = 15;
    detail = `Top 10 持有 ${safeTop10.toFixed(1)}% (中等)`;
  } else if (safeTop10 < 90) {
    score = 5;
    detail = `Top 10 持有 ${safeTop10.toFixed(1)}% (较集中)`;
  } else {
    score = 0;
    detail = `Top 10 持有 ${safeTop10.toFixed(1)}% (高度集中)`;
  }

  return { score, maxScore, detail };
}

function calculateLiquidityScore(liquidity: number): RiskScoreBreakdown['liquidity'] {
  const maxScore = 20;
  let score: number;
  let detail: string;

  // Safe number conversion
  const safeLiquidity = Number(liquidity) || 0;

  if (safeLiquidity > 50000) {
    score = 20;
    detail = `流动性 $${formatNumber(safeLiquidity)} (充足)`;
  } else if (safeLiquidity > 20000) {
    score = 15;
    detail = `流动性 $${formatNumber(safeLiquidity)} (良好)`;
  } else if (safeLiquidity > 10000) {
    score = 10;
    detail = `流动性 $${formatNumber(safeLiquidity)} (中等)`;
  } else if (safeLiquidity > 5000) {
    score = 5;
    detail = `流动性 $${formatNumber(safeLiquidity)} (偏低)`;
  } else {
    score = 0;
    detail = `流动性 $${formatNumber(safeLiquidity)} (极低)`;
  }

  return { score, maxScore, detail };
}

function calculateTradingActivityScore(totalTxns: number): RiskScoreBreakdown['tradingActivity'] {
  const maxScore = 10;
  let score: number;
  let detail: string;

  // Safe number conversion
  const safeTxns = Number(totalTxns) || 0;

  if (safeTxns > 1000) {
    score = 10;
    detail = `24h 交易: ${formatNumber(safeTxns)} 笔 (非常活跃)`;
  } else if (safeTxns > 500) {
    score = 7;
    detail = `24h 交易: ${formatNumber(safeTxns)} 笔 (活跃)`;
  } else if (safeTxns > 100) {
    score = 5;
    detail = `24h 交易: ${formatNumber(safeTxns)} 笔 (中等)`;
  } else {
    score = 2;
    detail = `24h 交易: ${formatNumber(safeTxns)} 笔 (较低)`;
  }

  return { score, maxScore, detail };
}

function calculateCreatorBalanceScore(bnbBalance: number): RiskScoreBreakdown['creatorBalance'] {
  const maxScore = 10;
  let score: number;
  let detail: string;

  // Safe number conversion
  const safeBalance = Number(bnbBalance) || 0;

  if (safeBalance > 10) {
    score = 10;
    detail = `创建者 BNB: ${safeBalance.toFixed(2)} (充足)`;
  } else if (safeBalance > 1) {
    score = 7;
    detail = `创建者 BNB: ${safeBalance.toFixed(2)} (中等)`;
  } else if (safeBalance > 0.1) {
    score = 4;
    detail = `创建者 BNB: ${safeBalance.toFixed(2)} (偏低)`;
  } else {
    score = 0;
    detail = `创建者 BNB: ${safeBalance.toFixed(4)} (极低)`;
  }

  return { score, maxScore, detail };
}

function getRiskLevel(score: number): RiskAssessment['level'] {
  const safeScore = Number(score) || 0;
  if (safeScore >= 80) return 'LOW';
  if (safeScore >= 60) return 'MEDIUM_LOW';
  if (safeScore >= 40) return 'MEDIUM_HIGH';
  if (safeScore >= 20) return 'HIGH';
  return 'EXTREME';
}

function formatNumber(num: number): string {
  // Safe number conversion
  const safeNum = Number(num) || 0;
  if (safeNum >= 1000000) {
    return (safeNum / 1000000).toFixed(2) + 'M';
  }
  if (safeNum >= 1000) {
    return (safeNum / 1000).toFixed(2) + 'K';
  }
  return safeNum.toFixed(0);
}

export function getRiskLevelColor(level: RiskAssessment['level']): string {
  switch (level) {
    case 'LOW':
      return '#22C55E'; // green
    case 'MEDIUM_LOW':
      return '#EAB308'; // yellow
    case 'MEDIUM_HIGH':
      return '#F97316'; // orange
    case 'HIGH':
      return '#EF4444'; // red
    case 'EXTREME':
      return '#1F2937'; // dark gray
    default:
      return '#94A3B8';
  }
}

export function getRiskLevelLabel(level: RiskAssessment['level']): string {
  switch (level) {
    case 'LOW':
      return '低风险';
    case 'MEDIUM_LOW':
      return '中低风险';
    case 'MEDIUM_HIGH':
      return '中高风险';
    case 'HIGH':
      return '高风险';
    case 'EXTREME':
      return '极高风险';
    default:
      return '未知';
  }
}

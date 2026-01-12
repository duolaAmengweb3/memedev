import type { HolderInfo, HolderConcentration } from '@/types';

// Parse amount string to number (handles both decimal and integer formats)
function parseAmount(amount: string | number | undefined | null): number {
  if (amount === undefined || amount === null) return 0;
  if (typeof amount === 'number') return amount;
  // Remove any commas and parse
  return parseFloat(String(amount).replace(/,/g, '')) || 0;
}

export function analyzeHolderConcentration(
  holders: HolderInfo[],
  totalSupply: string | number
): HolderConcentration {
  const totalSupplyNum = parseAmount(totalSupply);

  if (!holders || holders.length === 0 || totalSupplyNum === 0) {
    return {
      top10Percent: 0,
      top20Percent: 0,
      largestHolderPercent: 0,
      largestHolderAddress: '',
      holderCount: 0,
      riskLevel: 'HIGH',
    };
  }

  // Sort holders by amount (descending)
  const sortedHolders = [...holders].sort((a, b) => {
    const amountA = parseAmount(a.amount);
    const amountB = parseAmount(b.amount);
    return amountB - amountA;
  });

  // Calculate percentage
  const calculatePercent = (amount: string | number): number => {
    const amountNum = parseAmount(amount);
    return (amountNum / totalSupplyNum) * 100;
  };

  // Top 10 concentration
  const top10Amount = sortedHolders
    .slice(0, 10)
    .reduce((sum, h) => sum + parseAmount(h.amount), 0);
  const top10Percent = (top10Amount / totalSupplyNum) * 100;

  // Top 20 concentration
  const top20Amount = sortedHolders
    .slice(0, 20)
    .reduce((sum, h) => sum + parseAmount(h.amount), 0);
  const top20Percent = (top20Amount / totalSupplyNum) * 100;

  // Largest holder
  const largestHolder = sortedHolders[0];
  const largestHolderPercent = calculatePercent(largestHolder?.amount || '0');

  // Determine risk level based on concentration
  let riskLevel: HolderConcentration['riskLevel'];
  if (top10Percent > 80) {
    riskLevel = 'HIGH';
  } else if (top10Percent > 50) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    top10Percent,
    top20Percent,
    largestHolderPercent,
    largestHolderAddress: largestHolder?.address || '',
    holderCount: holders.length,
    riskLevel,
  };
}

export function findCreatorInHolders(
  holders: HolderInfo[],
  creatorAddress: string,
  totalSupply: string | number
): { amount: string; percent: number; rank: number | null } {
  const totalSupplyNum = parseAmount(totalSupply);
  const creatorLower = (creatorAddress || '').toLowerCase();

  if (!holders || holders.length === 0) {
    return { amount: '0', percent: 0, rank: null };
  }

  // Sort holders by amount
  const sortedHolders = [...holders].sort((a, b) => {
    const amountA = parseAmount(a.amount);
    const amountB = parseAmount(b.amount);
    return amountB - amountA;
  });

  // Find creator in sorted list
  const creatorIndex = sortedHolders.findIndex(
    (h) => (h.address || '').toLowerCase() === creatorLower
  );

  if (creatorIndex === -1) {
    return { amount: '0', percent: 0, rank: null };
  }

  const creatorHolding = sortedHolders[creatorIndex];
  const amountNum = parseAmount(creatorHolding.amount);
  const percent = totalSupplyNum > 0 ? (amountNum / totalSupplyNum) * 100 : 0;

  return {
    amount: String(creatorHolding.amount || '0'),
    percent,
    rank: creatorIndex + 1,
  };
}

export function formatTokenAmount(amount: string | number | undefined | null): string {
  // Parse the amount as a number (handles both decimal and integer formats)
  const num = parseAmount(amount);

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  if (num >= 1) {
    return num.toFixed(2);
  }
  return num.toFixed(6);
}

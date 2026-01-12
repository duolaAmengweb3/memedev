import { useState } from 'react';
import type { CreatorTokenInfo } from '@/types';

interface CreatorTokensProps {
  tokens: CreatorTokenInfo[];
  currentTokenAddress: string;
}

function formatCurrency(value: number | string | undefined | null): string {
  const num = Number(value) || 0;
  if (num >= 1000000) {
    return '$' + (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return '$' + (num / 1000).toFixed(2) + 'K';
  }
  return '$' + num.toFixed(2);
}

function formatDate(timestamp: number | string | undefined | null): string {
  if (!timestamp) return '-';
  const ts = Number(timestamp);
  if (isNaN(ts)) return '-';
  const date = new Date(ts);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CreatorTokens({ tokens, currentTokenAddress }: CreatorTokensProps) {
  const [showAll, setShowAll] = useState(false);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  // Sort by launch time (newest first)
  const sortedTokens = [...tokens].sort((a, b) => (Number(b.launchTime) || 0) - (Number(a.launchTime) || 0));

  // Show only first 5 unless expanded
  const displayTokens = showAll ? sortedTokens : sortedTokens.slice(0, 5);

  // Calculate statistics
  const totalTokens = tokens.length;
  const tradingTokens = tokens.filter(t => t.status === 'TRADE' || t.dexType).length;
  const totalMarketCap = tokens.reduce((sum, t) => sum + (Number(t.marketCap) || 0), 0);

  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        <span>🏭</span>
        创建者历史代币
      </h3>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">创建总数</div>
          <div className="font-bold text-primary">
            {totalTokens}
            {totalTokens >= 30 && totalTokens % 30 === 0 && (
              <span className="text-xs font-normal text-text-secondary">+</span>
            )}
          </div>
        </div>
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">已上 DEX</div>
          <div className={`font-bold ${tradingTokens > 0 ? 'text-success' : 'text-text-primary'}`}>
            {tradingTokens}
          </div>
        </div>
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">总市值</div>
          <div className="font-bold text-text-primary">{formatCurrency(totalMarketCap)}</div>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-2">
        {displayTokens.map((token) => {
          const isCurrent = token.address?.toLowerCase() === currentTokenAddress?.toLowerCase();
          const dayIncrease = Number(token.dayIncrease) || 0;
          const priceChangeColor = dayIncrease >= 0 ? 'text-success' : 'text-danger';

          return (
            <a
              key={token.address}
              href={`https://four.meme/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 p-2 rounded transition-colors ${
                isCurrent
                  ? 'bg-primary/20 border border-primary/50'
                  : 'bg-background hover:bg-card-hover'
              }`}
            >
              {/* Token Image */}
              {token.imageUrl && (
                <img
                  src={token.imageUrl}
                  alt={token.symbol}
                  className="w-8 h-8 rounded-full bg-card-hover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}

              {/* Token Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-text-primary truncate">
                    {token.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    ({token.symbol})
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] bg-primary text-white px-1 rounded">
                      当前
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-secondary">
                    {formatDate(token.launchTime)}
                  </span>
                  {token.dexType && (
                    <span className="text-success">
                      🟢 {token.dexType.replace('_', ' ')}
                    </span>
                  )}
                  {!token.dexType && token.status === 'INIT' && (
                    <span className="text-warning">🟡 内盘</span>
                  )}
                </div>
              </div>

              {/* Market Cap & Change */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium text-text-primary">
                  {formatCurrency(token.marketCap)}
                </div>
                <div className={`text-xs ${priceChangeColor}`}>
                  {dayIncrease >= 0 ? '+' : ''}{dayIncrease.toFixed(1)}%
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Show More Button */}
      {sortedTokens.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-sm text-text-secondary hover:text-primary py-2 border-t border-background"
        >
          {showAll ? '▲ 收起' : `▼ 查看全部 ${sortedTokens.length} 个代币`}
        </button>
      )}

      {/* Warning if creator has many tokens */}
      {totalTokens >= 5 && (
        <div className="text-xs text-warning bg-warning/10 p-2 rounded flex items-center gap-1">
          <span>⚠️</span>
          <span>此创建者已创建 {totalTokens} 个代币，请注意风险</span>
        </div>
      )}
    </div>
  );
}

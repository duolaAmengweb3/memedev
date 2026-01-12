import type { MarketData as MarketDataType } from '@/types';

interface MarketDataProps {
  market: MarketDataType;
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

function formatPrice(value: number | string | undefined | null): string {
  const num = Number(value) || 0;
  if (num < 0.00001) {
    return '$' + num.toExponential(2);
  }
  if (num < 0.01) {
    return '$' + num.toFixed(8);
  }
  return '$' + num.toFixed(6);
}

export function MarketData({ market }: MarketDataProps) {
  const priceChange = Number(market?.priceChange24h) || 0;
  const priceChangeColor = priceChange >= 0 ? 'text-success' : 'text-danger';
  const priceChangeIcon = priceChange >= 0 ? '📈' : '📉';
  const liquidity = Number(market?.liquidity) || 0;
  const buys24h = Number(market?.buys24h) || 0;
  const sells24h = Number(market?.sells24h) || 0;

  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        <span>📈</span>
        市场数据
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Price */}
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">价格</div>
          <div className="font-medium text-text-primary">
            {formatPrice(market?.price)}
          </div>
          <div className={`text-xs ${priceChangeColor} flex items-center gap-1`}>
            {priceChangeIcon} {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>

        {/* Market Cap */}
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">市值</div>
          <div className="font-medium text-text-primary">
            {formatCurrency(market?.marketCap)}
          </div>
          <div className="text-xs text-text-secondary">
            FDV: {formatCurrency(market?.fdv)}
          </div>
        </div>

        {/* Liquidity */}
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">流动性</div>
          <div className={`font-medium ${
            liquidity > 50000 ? 'text-success' :
            liquidity > 10000 ? 'text-warning' : 'text-danger'
          }`}>
            {formatCurrency(liquidity)}
          </div>
        </div>

        {/* 24h Volume */}
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">24h 交易量</div>
          <div className="font-medium text-text-primary">
            {formatCurrency(market?.volume24h)}
          </div>
        </div>

        {/* Buys */}
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">24h 买入</div>
          <div className="font-medium text-success">
            {buys24h.toLocaleString()} 笔
          </div>
        </div>

        {/* Sells */}
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">24h 卖出</div>
          <div className="font-medium text-danger">
            {sells24h.toLocaleString()} 笔
          </div>
        </div>
      </div>
    </div>
  );
}

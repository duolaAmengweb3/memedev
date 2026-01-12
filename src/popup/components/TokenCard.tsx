import type { TokenInfo } from '@/types';

interface TokenCardProps {
  token: TokenInfo;
}

export function TokenCard({ token }: TokenCardProps) {
  const copyAddress = () => {
    navigator.clipboard.writeText(token.address);
  };

  const getStatusBadge = () => {
    switch (token.status) {
      case 'TRADE':
        return (
          <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">
            🟢 已上 DEX ({token.dexType?.replace('_', ' ')})
          </span>
        );
      case 'INIT':
        return (
          <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded-full">
            🟡 内盘交易中
          </span>
        );
      case 'STOP':
        return (
          <span className="px-2 py-0.5 bg-danger/20 text-danger text-xs rounded-full">
            🔴 已停止
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 space-y-2">
      <div className="flex items-start gap-3">
        {token.imageUrl && (
          <img
            src={token.imageUrl}
            alt={token.symbol}
            className="w-12 h-12 rounded-full bg-card-hover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-text-primary truncate">
              {token.name}
            </h2>
            <span className="text-text-secondary text-sm">({token.symbol})</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-text-secondary bg-background px-2 py-0.5 rounded">
              {token.address.slice(0, 6)}...{token.address.slice(-4)}
            </code>
            <button
              onClick={copyAddress}
              className="text-text-secondary hover:text-primary text-sm"
              title="复制地址"
            >
              📋
            </button>
          </div>
        </div>
      </div>
      <div className="pt-2">
        {getStatusBadge()}
      </div>
    </div>
  );
}

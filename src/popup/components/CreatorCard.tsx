import type { CreatorAnalysis } from '@/types';
import { formatTokenAmount } from '@/services/holderAnalysis';

interface CreatorCardProps {
  creator: CreatorAnalysis;
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const copyAddress = () => {
    navigator.clipboard.writeText(creator?.address || '');
  };

  const bnbBalance = Number(creator?.bnbBalance) || 0;
  const holdingPercent = Number(creator?.holding?.percent) || 0;

  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        <span>👤</span>
        创建者信息
      </h3>

      <div className="space-y-2">
        {/* Address */}
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">钱包地址</span>
          <div className="flex items-center gap-2">
            <code className="text-xs text-text-primary bg-background px-2 py-0.5 rounded">
              {creator?.address?.slice(0, 6)}...{creator?.address?.slice(-4)}
            </code>
            <button
              onClick={copyAddress}
              className="text-text-secondary hover:text-primary text-sm"
              title="复制地址"
            >
              📋
            </button>
            <a
              href={`https://bscscan.com/address/${creator?.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-primary text-sm"
              title="在 BscScan 查看"
            >
              🔗
            </a>
          </div>
        </div>

        {/* BNB Balance */}
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">BNB 余额</span>
          <span className={`font-medium ${bnbBalance > 1 ? 'text-success' : bnbBalance > 0.1 ? 'text-warning' : 'text-danger'}`}>
            {bnbBalance.toFixed(4)} BNB
          </span>
        </div>

        {/* Holding Info */}
        <div className="pt-2 border-t border-background">
          <div className="text-sm text-text-secondary mb-2">📊 代币持仓</div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded p-2">
              <div className="text-xs text-text-secondary">持有量</div>
              <div className="font-medium text-text-primary">
                {formatTokenAmount(creator?.holding?.amount || '0')}
              </div>
            </div>
            <div className="bg-background rounded p-2">
              <div className="text-xs text-text-secondary">占比</div>
              <div className={`font-medium ${
                holdingPercent < 5 ? 'text-success' :
                holdingPercent < 20 ? 'text-warning' : 'text-danger'
              }`}>
                {holdingPercent.toFixed(2)}%
              </div>
            </div>
            <div className="bg-background rounded p-2">
              <div className="text-xs text-text-secondary">排名</div>
              <div className="font-medium text-text-primary">
                {creator?.holding?.rank ? `#${creator.holding.rank}` : '未知'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { HolderConcentration, HolderInfo } from '@/types';
import { formatTokenAmount } from '@/services/holderAnalysis';

interface HolderAnalysisProps {
  concentration: HolderConcentration;
  holders: HolderInfo[];
  creatorAddress: string;
}

export function HolderAnalysis({ concentration, holders, creatorAddress }: HolderAnalysisProps) {
  const [showList, setShowList] = useState(false);

  // Safe values - ensure all are numbers
  const top10 = Number(concentration?.top10Percent) || 0;
  const top20 = Number(concentration?.top20Percent) || 0;
  const largest = Number(concentration?.largestHolderPercent) || 0;
  const holderCount = Number(concentration?.holderCount) || 0;

  const getRiskBadge = () => {
    switch (concentration?.riskLevel) {
      case 'LOW':
        return <span className="text-success">🟢 分布良好</span>;
      case 'MEDIUM':
        return <span className="text-warning">🟡 较集中</span>;
      case 'HIGH':
        return <span className="text-danger">🔴 高度集中</span>;
      default:
        return <span className="text-text-secondary">未知</span>;
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        <span>👥</span>
        持有者分布
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">Top 10 占比</div>
          <div className={`font-medium ${
            top10 < 50 ? 'text-success' :
            top10 < 80 ? 'text-warning' : 'text-danger'
          }`}>
            {top10.toFixed(1)}%
          </div>
        </div>

        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">Top 20 占比</div>
          <div className="font-medium text-text-primary">
            {top20.toFixed(1)}%
          </div>
        </div>

        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">最大持有者</div>
          <div className="font-medium text-text-primary">
            {largest.toFixed(1)}%
          </div>
        </div>

        <div className="bg-background rounded p-2">
          <div className="text-xs text-text-secondary">持有者数量</div>
          <div className="font-medium text-text-primary">
            {holderCount} (Top 100)
          </div>
        </div>
      </div>

      {/* Risk Badge */}
      <div className="text-sm">
        集中度: {getRiskBadge()}
      </div>

      {/* Toggle Holder List */}
      {holders && holders.length > 0 && (
        <>
          <button
            onClick={() => setShowList(!showList)}
            className="w-full text-sm text-text-secondary hover:text-primary flex items-center justify-center gap-1 py-2 border-t border-background"
          >
            {showList ? '▲ 收起' : '▼ 展开'} Top 100 持有者
          </button>

          {/* Holder List */}
          {showList && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {holders.slice(0, 100).map((holder, index) => {
                const isCreator = holder.address?.toLowerCase() === creatorAddress?.toLowerCase();
                return (
                  <div
                    key={holder.address}
                    className={`flex items-center justify-between text-xs p-1.5 rounded ${
                      isCreator ? 'bg-primary/20' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary w-6">#{index + 1}</span>
                      <code className="text-text-primary">
                        {holder.address?.slice(0, 6)}...{holder.address?.slice(-4)}
                      </code>
                      {isCreator && (
                        <span className="text-primary text-[10px] font-medium">创建者</span>
                      )}
                    </div>
                    <span className="text-text-secondary">
                      {formatTokenAmount(holder.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

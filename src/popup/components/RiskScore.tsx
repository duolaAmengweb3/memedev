import type { RiskAssessment } from '@/types';
import { getRiskLevelColor, getRiskLevelLabel } from '@/services/riskScore';

interface RiskScoreProps {
  risk: RiskAssessment;
}

export function RiskScore({ risk }: RiskScoreProps) {
  const color = getRiskLevelColor(risk?.level);
  const label = getRiskLevelLabel(risk?.level);
  const totalScore = Number(risk?.totalScore) || 0;
  const maxScore = Number(risk?.maxScore) || 100;
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return (
    <div className="bg-card rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-text-primary flex items-center gap-2">
        <span>⚠️</span>
        风险评估
      </h3>

      {/* Score Display */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
          style={{
            background: `conic-gradient(${color} ${percentage}%, #1E293B ${percentage}%)`,
          }}
        >
          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
            {totalScore}
          </div>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color }}>
            {label}
          </div>
          <div className="text-sm text-text-secondary">
            评分: {totalScore} / {maxScore}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {risk?.breakdown && (
        <div className="space-y-2 pt-2 border-t border-background">
          {Object.entries(risk.breakdown).map(([key, item]) => {
            const itemScore = Number(item?.score) || 0;
            const itemMaxScore = Number(item?.maxScore) || 1;
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary flex items-center gap-1">
                  {itemScore >= itemMaxScore * 0.7 ? '✅' : itemScore >= itemMaxScore * 0.4 ? '⚠️' : '❌'}
                  {item?.detail || '未知'}
                </span>
                <span className="text-text-primary font-medium">
                  +{itemScore}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

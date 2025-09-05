import type { Usage } from '../../types';
import type { FC } from 'hono/jsx';

interface UsageData {
  date: Date;
  usage: Usage | undefined;
}

export const UsageChart: FC<{ data: UsageData[] }> = async ({ data }) => {
  const max = Math.max(
    ...data.map(({ usage }) => (usage ? usage.total_tokens : 0))
  );

  return (
    <div className="chart" role="img">
      <div className="chart-bars">
        {data.map(async ({ date, usage }) => {
          const label = `${date.getMonth() + 1}/${date.getDate()}`;

          if (!usage) {
            return (
              <div className="bar" key={label}>
                <div className="bar-x mono">{label}</div>
                <div
                  className="bar-rect"
                  style={{ height: '1px', backgroundColor: '#f0f0f0' }}
                />
                <div className="bar-y mono">0</div>
              </div>
            );
          }

          const totalHeight = Math.round((usage.total_tokens / max) * 100);

          // スタック計算（下から上へ）
          const cachedInputPct =
            totalHeight > 0
              ? (usage.cached_input_tokens / usage.total_tokens) * totalHeight
              : 0;
          const uncachedInputPct =
            totalHeight > 0
              ? (usage.uncached_input_tokens / usage.total_tokens) * totalHeight
              : 0;
          const outputPct =
            totalHeight > 0
              ? (usage.output_tokens / usage.total_tokens) * totalHeight
              : 0;

          const tooltip = [
            `${label}: 合計 ${usage.total_tokens.toLocaleString()} tokens`,
            `• キャッシュ入力: ${usage.cached_input_tokens.toLocaleString()}`,
            `• 通常入力: ${usage.uncached_input_tokens.toLocaleString()}`,
            `• 出力: ${usage.output_tokens.toLocaleString()}`,
            `• 推論: ${usage.reasoning_tokens.toLocaleString()}`,
            `• コスト: $${usage.total_cost.toFixed(4)}`,
          ].join('\n');

          return (
            <div className="bar" key={label} title={tooltip}>
              <div className="bar-x mono">{label}</div>
              <div
                className="bar-stack"
                style={{ height: `${Math.max(totalHeight, 1)}%` }}
              >
                <div
                  className="bar-segment"
                  style={{
                    height: `${cachedInputPct}%`,
                    backgroundColor: '#e3f2fd',
                  }}
                />
                <div
                  className="bar-segment"
                  style={{
                    height: `${uncachedInputPct}%`,
                    backgroundColor: '#1976d2',
                  }}
                />
                <div
                  className="bar-segment"
                  style={{
                    height: `${outputPct}%`,
                    backgroundColor: '#388e3c',
                  }}
                />
              </div>
              <div className="bar-y mono">
                {usage.total_tokens.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="usage-legend">
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: '#e3f2fd' }}
          ></div>
          <span>キャッシュ入力</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: '#1976d2' }}
          ></div>
          <span>通常入力</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: '#388e3c' }}
          ></div>
          <span>出力</span>
        </div>
      </div>
    </div>
  );
};

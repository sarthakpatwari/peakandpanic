interface Point { label: string; value: number }

export default function LineChart({ points, label }: { points: Point[]; label: string }) {
  const valid = points.filter((point) => Number.isFinite(point.value));
  if (valid.length < 2) return <div className="market-chart-empty">Chart unavailable</div>;
  const values = valid.map((point) => point.value); const low = Math.min(...values); const high = Math.max(...values); const padding = Math.max((high - low) * 0.2, 0.25); const min = low - padding; const max = high + padding;
  const coords = valid.map((point, index) => ({ ...point, x: 70 + index * (830 / Math.max(1, valid.length - 1)), y: 200 - ((point.value - min) / (max - min)) * 150 }));
  return <div className="chart-shell"><svg viewBox="0 0 970 240" role="img" aria-label={label} preserveAspectRatio="none">
    {[50, 125, 200].map((y) => <line key={y} x1="55" x2="930" y1={y} y2={y} stroke="rgba(110,231,183,.12)" />)}
    <polyline points={coords.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#6ee7b7" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    {coords.map((point) => <g key={point.label}><circle cx={point.x} cy={point.y} r="5" fill="#061914" stroke="#6ee7b7" strokeWidth="2" vectorEffect="non-scaling-stroke" /><text x={point.x} y={Math.max(18, point.y - 14)} textAnchor="middle" fill="#f2f7f5" fontSize="13" fontWeight="600">{point.value.toFixed(2)}%</text></g>)}
  </svg></div>;
}

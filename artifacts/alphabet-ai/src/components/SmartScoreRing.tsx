interface SmartScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export default function SmartScoreRing({ score, size = 60, strokeWidth = 5 }: SmartScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;

  const color = score >= 90 ? "#10b981" : score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#8b5cf6" : "#6b7280";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

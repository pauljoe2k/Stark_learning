interface MasteryRingProps {
  value: number;
  size?: number;
}

export function MasteryRing({ value, size = 64 }: MasteryRingProps) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const offset = circumference * (1 - percent / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Mastery ${percent} percent`}
      className="mastery-ring"
    >
      <circle className="mastery-ring-track" cx={center} cy={center} r={radius} fill="none" strokeWidth={4} />
      <circle
        className="mastery-ring-progress"
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--pine)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.max(10, Math.round(size * 0.24))}
        fill="currentColor"
      >
        {percent}%
      </text>
    </svg>
  );
}

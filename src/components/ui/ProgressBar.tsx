import { cn, clamp } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  color,
  trackClassName,
}: {
  value: number;
  className?: string;
  color?: string;
  trackClassName?: string;
}) {
  const pct = clamp(value, 0, 100);
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-surface-hover overflow-hidden", trackClassName)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", className)}
        style={{ width: `${pct}%`, background: color ?? "var(--accent)" }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 5,
  color = "var(--accent)",
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: React.ReactNode;
}) {
  const pct = clamp(value, 0, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{label}</div>
    </div>
  );
}

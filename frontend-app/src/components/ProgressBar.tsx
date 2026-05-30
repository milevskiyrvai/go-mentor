import clsx from "clsx";

interface Props {
  value: number; // 0..100
  variant?: "default" | "warn" | "success" | "mute";
  showLabel?: boolean;
  className?: string;
  height?: number;
}

export function ProgressBar({
  value,
  variant = "default",
  showLabel = false,
  className,
  height = 8,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <div
        className="flex-1 rounded-[4px] border border-border bg-bg overflow-hidden relative"
        style={{ height }}
      >
        <div
          className={clsx(
            "h-full transition-all duration-500",
            variant === "default" && "pbar-fill",
            variant === "warn" &&
              "bg-gradient-to-r from-warning to-yellow-300 shadow-[0_0_14px_rgba(255,219,61,0.3)]",
            variant === "success" &&
              "bg-gradient-to-r from-success to-emerald-300 shadow-[0_0_14px_rgba(123,227,140,0.3)]",
            variant === "mute" && "bg-[#3a3f52]",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono font-bold text-sm text-text min-w-[48px] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}

import clsx from "clsx";

interface Props {
  value: number; // 0..100
  variant?: "default" | "sage" | "warn" | "success" | "mute";
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
        className={clsx(
          "bar flex-1",
          variant === "sage" && "sage",
          variant === "warn" && "warn",
          variant === "success" && "success",
          variant === "mute" && "mute",
        )}
        style={{ height }}
      >
        <i style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && (
        <span className="num text-sm text-text min-w-[44px] text-right">{clamped}%</span>
      )}
    </div>
  );
}

interface Props {
  size?: number;
  variant?: "secondary" | "primary";
}

export function BonusCoin({ size = 16, variant = "secondary" }: Props) {
  const c = variant === "secondary" ? "var(--secondary)" : "var(--primary)";
  return (
    <div
      className="rounded-full grid place-items-center font-mono font-bold text-white"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${c} 55%, white), ${c} 70%, color-mix(in oklab, ${c} 55%, black))`,
        boxShadow: `0 0 12px color-mix(in oklab, ${c} 45%, transparent)`,
        fontSize: size * 0.55,
      }}
    >
      G
    </div>
  );
}

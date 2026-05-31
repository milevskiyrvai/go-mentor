interface Props {
  size?: number;
  variant?: "secondary" | "primary";
}

export function BonusCoin({ size = 16, variant = "secondary" }: Props) {
  const c = variant === "secondary" ? "var(--secondary)" : "var(--primary)";
  return (
    <div
      className="rounded-full grid place-items-center font-bold"
      style={{
        width: size,
        height: size,
        background: c,
        color: "var(--surface-2)",
        fontSize: size * 0.55,
      }}
    >
      G
    </div>
  );
}

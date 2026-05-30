export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-[9px] border border-border relative"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(140deg, color-mix(in oklab, var(--primary) 14%, var(--bg)), var(--bg))",
        boxShadow:
          "0 0 0 1px color-mix(in oklab, var(--primary) 22%, transparent) inset, 0 0 24px -8px var(--primary)",
      }}
    >
      <span
        className="font-mono font-bold text-primary"
        style={{ fontSize: size * 0.45, letterSpacing: "-0.02em" }}
      >
        Go
      </span>
    </div>
  );
}

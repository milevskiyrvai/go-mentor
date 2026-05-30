import clsx from "clsx";

interface Props {
  glyph?: string;
  locked?: boolean;
  size?: number;
  accent?: "primary" | "secondary";
  imageUrl?: string;
}

export function HexBadge({
  glyph = "?",
  locked = false,
  size = 108,
  accent = "primary",
  imageUrl,
}: Props) {
  const accentColor = accent === "primary" ? "var(--primary)" : "var(--secondary)";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size * 1.155 }}>
      {!locked && (
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: size * 1.85,
            height: size * 1.85,
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            background: `radial-gradient(closest-side, color-mix(in oklab, ${accentColor} 30%, transparent), transparent 65%)`,
            filter: "blur(2px)",
          }}
        />
      )}
      <div
        className={clsx("hex-clip relative grid place-items-center w-full h-full", {
          "saturate-[.15] brightness-[.7]": locked,
        })}
        style={{
          background: `linear-gradient(160deg, color-mix(in oklab, ${accentColor} 22%, var(--elevated)) 0%, var(--elevated) 70%)`,
        }}
      >
        <div
          className="absolute inset-[2px] hex-clip"
          style={{ background: "var(--elevated)" }}
        />
        <div
          className="absolute inset-0 hex-clip pointer-events-none"
          style={{
            background: `linear-gradient(160deg, color-mix(in oklab, ${accentColor} 65%, transparent), transparent 50%)`,
            mixBlendMode: "plus-lighter",
            opacity: 0.5,
          }}
        />
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="relative z-10"
            style={{ width: size * 0.6, height: size * 0.6, objectFit: "contain" }}
          />
        ) : (
          <span
            className="relative z-10 font-mono font-bold"
            style={{
              color: locked ? "var(--text-3)" : accentColor,
              fontSize: size * 0.36,
              textShadow: locked
                ? "none"
                : `0 0 18px color-mix(in oklab, ${accentColor} 60%, transparent)`,
            }}
          >
            {glyph}
          </span>
        )}
      </div>
    </div>
  );
}

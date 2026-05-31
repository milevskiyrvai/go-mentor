import clsx from "clsx";

interface Props {
  glyph?: string;
  locked?: boolean;
  size?: number;
  accent?: "primary" | "secondary" | "amber";
  imageUrl?: string;
}

/**
 * Achievement seal (медальон) — спокойный, коллекционный (base.css .seal).
 * Заменил старый неоновый hex-бейдж. Props сохранены для совместимости.
 */
export function HexBadge({
  glyph = "?",
  locked = false,
  size = 86,
  accent = "primary",
  imageUrl,
}: Props) {
  const seal =
    accent === "secondary" ? "sage" : accent === "amber" ? "amber" : undefined;

  return (
    <div
      className={clsx("seal", locked && "locked")}
      data-seal={seal}
      style={{ width: size, height: size, flex: `0 0 ${size}px` }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="relative z-10"
          style={{ width: size * 0.5, height: size * 0.5, objectFit: "contain" }}
        />
      ) : (
        <span
          className="gl"
          style={{
            fontSize: size * 0.34,
            color: locked ? "var(--ink-3)" : undefined,
          }}
        >
          {glyph}
        </span>
      )}
    </div>
  );
}

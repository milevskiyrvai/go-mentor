import { Link } from "react-router-dom";

export type CrumbSegment = string | { label: string; to: string };

interface CrumbsProps {
  segments: CrumbSegment[];
  liveSegment: string;
}

/**
 * Кликабельные хлебные крошки в едином стиле дизайн-системы.
 * Сегменты с `to` рендерятся как Link, без `to` — статичный span.
 */
export function Crumbs({ segments, liveSegment }: CrumbsProps) {
  const ts = new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center gap-2.5 font-mono text-[10.5px] text-text-3 uppercase tracking-[0.1em]">
      {segments.map((s, i) => {
        const label = typeof s === "string" ? s : s.label;
        const to = typeof s === "string" ? null : s.to;
        return (
          <span key={i} className="contents">
            {to ? (
              <Link to={to} className="hover:text-text transition-colors">
                {label}
              </Link>
            ) : (
              <span>{label}</span>
            )}
            <span className="text-text-3">/</span>
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1.5 text-primary">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {liveSegment}
      </span>
      <span className="ml-auto">{ts}</span>
    </div>
  );
}

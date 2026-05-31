import clsx from "clsx";

export type BadgeKind =
  | "in-progress"
  | "in-progress-pink"
  | "waiting"
  | "approved"
  | "completed"
  | "failed"
  | "not-started"
  | "pending"
  | "rejected"
  | "cancelled"
  | "active"
  | "deleted";

const KIND_STYLES: Record<BadgeKind, { color: string; bgAlpha: string; borderAlpha: string }> = {
  "in-progress": { color: "#D4FF3D", bgAlpha: "rgba(212,255,61,0.08)", borderAlpha: "rgba(212,255,61,0.3)" },
  "in-progress-pink": { color: "#FF3D9A", bgAlpha: "rgba(255,61,154,0.08)", borderAlpha: "rgba(255,61,154,0.3)" },
  waiting: { color: "#FFDB3D", bgAlpha: "rgba(255,219,61,0.08)", borderAlpha: "rgba(255,219,61,0.3)" },
  approved: { color: "#7BE38C", bgAlpha: "rgba(123,227,140,0.08)", borderAlpha: "rgba(123,227,140,0.3)" },
  completed: { color: "#FF3D9A", bgAlpha: "rgba(255,61,154,0.08)", borderAlpha: "rgba(255,61,154,0.3)" },
  failed: { color: "#FF5B5B", bgAlpha: "rgba(255,91,91,0.08)", borderAlpha: "rgba(255,91,91,0.3)" },
  "not-started": { color: "#8A8A92", bgAlpha: "transparent", borderAlpha: "#262830" },
  pending: { color: "#FFDB3D", bgAlpha: "rgba(255,219,61,0.08)", borderAlpha: "rgba(255,219,61,0.3)" },
  rejected: { color: "#FF5B5B", bgAlpha: "rgba(255,91,91,0.08)", borderAlpha: "rgba(255,91,91,0.3)" },
  cancelled: { color: "#8A8A92", bgAlpha: "transparent", borderAlpha: "#262830" },
  active: { color: "#7BE38C", bgAlpha: "rgba(123,227,140,0.08)", borderAlpha: "rgba(123,227,140,0.3)" },
  deleted: { color: "#8A8A92", bgAlpha: "transparent", borderAlpha: "#262830" },
};

interface BadgeProps {
  kind: BadgeKind;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ kind, children, className }: BadgeProps) {
  const s = KIND_STYLES[kind];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 h-[26px] px-2.5 rounded-full font-medium whitespace-nowrap",
        className
      )}
      style={{
        fontSize: "11.5px",
        color: s.color,
        background: s.bgAlpha,
        border: `1px solid ${s.borderAlpha}`,
      }}
    >
      <span
        className={clsx("w-1.5 h-1.5 rounded-full", kind === "waiting" && "pulse")}
        style={{
          background: "currentColor",
          boxShadow: kind === "not-started" || kind === "cancelled" || kind === "deleted" ? "none" : "0 0 8px currentColor",
        }}
      />
      {children}
    </span>
  );
}

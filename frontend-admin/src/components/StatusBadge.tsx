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

// Спокойные мягкие тинты по токенам base.css (без неона)
const KIND_STYLES: Record<BadgeKind, { color: string; bgAlpha: string; borderAlpha: string }> = {
  "in-progress": { color: "var(--primary-ink)", bgAlpha: "var(--primary-soft)", borderAlpha: "transparent" },
  "in-progress-pink": { color: "var(--secondary)", bgAlpha: "var(--secondary-soft)", borderAlpha: "transparent" },
  waiting: { color: "var(--warning)", bgAlpha: "var(--warning-soft)", borderAlpha: "transparent" },
  approved: { color: "var(--success)", bgAlpha: "var(--success-soft)", borderAlpha: "transparent" },
  completed: { color: "var(--secondary)", bgAlpha: "var(--secondary-soft)", borderAlpha: "transparent" },
  failed: { color: "var(--danger)", bgAlpha: "var(--danger-soft)", borderAlpha: "transparent" },
  "not-started": { color: "var(--ink-2)", bgAlpha: "var(--bg)", borderAlpha: "var(--line)" },
  pending: { color: "var(--warning)", bgAlpha: "var(--warning-soft)", borderAlpha: "transparent" },
  rejected: { color: "var(--danger)", bgAlpha: "var(--danger-soft)", borderAlpha: "transparent" },
  cancelled: { color: "var(--ink-2)", bgAlpha: "var(--bg)", borderAlpha: "var(--line)" },
  active: { color: "var(--success)", bgAlpha: "var(--success-soft)", borderAlpha: "transparent" },
  deleted: { color: "var(--ink-3)", bgAlpha: "var(--bg)", borderAlpha: "var(--line)" },
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
      className={clsx("pill", className)}
      style={{
        color: s.color,
        background: s.bgAlpha,
        border: `1px solid ${s.borderAlpha}`,
      }}
    >
      <span className={clsx("led", kind === "waiting" && "pulse")} />
      {children}
    </span>
  );
}

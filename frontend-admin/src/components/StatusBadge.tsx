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
  "in-progress": { color: "#5F8268", bgAlpha: "rgba(95,130,104,0.10)", borderAlpha: "rgba(95,130,104,0.32)" },
  "in-progress-pink": { color: "#B26B45", bgAlpha: "rgba(178,107,69,0.10)", borderAlpha: "rgba(178,107,69,0.32)" },
  waiting: { color: "#A9842F", bgAlpha: "rgba(169,132,47,0.10)", borderAlpha: "rgba(169,132,47,0.32)" },
  approved: { color: "#5F8268", bgAlpha: "rgba(95,130,104,0.10)", borderAlpha: "rgba(95,130,104,0.32)" },
  completed: { color: "#B26B45", bgAlpha: "rgba(178,107,69,0.10)", borderAlpha: "rgba(178,107,69,0.32)" },
  failed: { color: "#AF5840", bgAlpha: "rgba(175,88,64,0.10)", borderAlpha: "rgba(175,88,64,0.32)" },
  "not-started": { color: "#948B7B", bgAlpha: "transparent", borderAlpha: "#E5DCCD" },
  pending: { color: "#A9842F", bgAlpha: "rgba(169,132,47,0.10)", borderAlpha: "rgba(169,132,47,0.32)" },
  rejected: { color: "#AF5840", bgAlpha: "rgba(175,88,64,0.10)", borderAlpha: "rgba(175,88,64,0.32)" },
  cancelled: { color: "#948B7B", bgAlpha: "transparent", borderAlpha: "#E5DCCD" },
  active: { color: "#5F8268", bgAlpha: "rgba(95,130,104,0.10)", borderAlpha: "rgba(95,130,104,0.32)" },
  deleted: { color: "#948B7B", bgAlpha: "transparent", borderAlpha: "#E5DCCD" },
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

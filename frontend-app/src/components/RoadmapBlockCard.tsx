import clsx from "clsx";
import type { BlockProgressSummary, RoadmapBlock, RoadmapMaterial } from "@/api/types";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

interface Section {
  label: string;
  total: number;
  done: number;
}

interface Props {
  index: number;
  block: RoadmapBlock;
  progress?: BlockProgressSummary;
  materials?: RoadmapMaterial[];
  viewedIds?: Set<string>;
  active?: boolean;
  onClick?: () => void;
}

const SECTION_LABELS: Record<RoadmapMaterial["type"], string> = {
  theory: "Теория",
  questions: "Вопросы",
  practice: "Практика",
  homework: "Домашка",
};

export function RoadmapBlockCard({
  index,
  block,
  progress,
  materials = [],
  viewedIds,
  active,
  onClick,
}: Props) {
  const sections: Section[] = (["theory", "questions", "practice", "homework"] as const).map(
    (type) => {
      const list = materials.filter((m) => m.type === type && m.is_active);
      const done = viewedIds
        ? list.filter((m) => viewedIds.has(m.id)).length
        : 0;
      return { label: SECTION_LABELS[type], total: list.length, done };
    },
  );

  const status = progress?.status ?? "not_started";
  const pct = progress?.progress_percent ?? 0;
  const dataStatus =
    status === "approved"
      ? "approved"
      : status === "waiting_buddy_confirmation"
        ? "waiting"
        : status === "in_progress"
          ? "in_progress"
          : "not_started";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      data-status={dataStatus}
      className={clsx(
        "elevated p-5 flex flex-col gap-4 relative overflow-hidden transition-all",
        onClick && "cursor-pointer hover:border-border-bright",
        active && "ring-1 ring-primary/40",
      )}
    >
      {/* glow */}
      {(dataStatus === "in_progress" || dataStatus === "waiting") && (
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background:
              dataStatus === "waiting"
                ? "radial-gradient(closest-side, rgba(169,132,47,0.18), transparent 70%)"
                : "radial-gradient(closest-side, rgba(95,130,104,0.18), transparent 70%)",
          }}
        />
      )}
      <div className="flex gap-3.5 items-start">
        <div
          className={clsx(
            "w-12 h-12 rounded-[10px] border border-border bg-bg grid place-items-center font-mono font-bold text-[18px] shrink-0",
            dataStatus === "in_progress" &&
              "text-primary shadow-[inset_0_0_0_1px_rgba(95,130,104,0.4)]",
            dataStatus === "waiting" && "text-warning",
            dataStatus === "approved" && "text-success",
            dataStatus === "not_started" && "text-text-2",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[16px] font-semibold -tracking-tight">{block.title}</h4>
          {block.description && (
            <p className="text-[12px] text-text-2 mt-1 line-clamp-2">{block.description}</p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <ProgressBar
        value={pct}
        variant={dataStatus === "approved" ? "success" : dataStatus === "waiting" ? "warn" : "default"}
        showLabel
      />

      <div className="grid grid-cols-4 gap-2">
        {sections.map((s) => (
          <div
            key={s.label}
            className={clsx(
              "border border-border rounded-[8px] bg-bg p-3 flex flex-col gap-1.5",
              s.done > 0 && s.done === s.total && "border-success/40",
              s.done > 0 && s.done < s.total && "border-primary/40",
            )}
          >
            <div className="text-[10px] text-text-3 uppercase font-mono tracking-wider">
              {s.label}
            </div>
            <div
              className={clsx(
                "font-mono text-[13px] font-semibold",
                s.done === s.total && s.total > 0 && "text-success",
                s.done > 0 && s.done < s.total && "text-primary",
              )}
            >
              {s.done}
              <span className="text-text-3 font-normal"> / {s.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

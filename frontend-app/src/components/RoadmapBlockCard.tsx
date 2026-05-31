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
      data-s={dataStatus}
      className={clsx("block", active && "sel", onClick && "cursor-pointer")}
    >
      <div className="block-head">
        <div className="block-num">{String(index + 1).padStart(2, "0")}</div>
        <div className="block-title">
          <h4>{block.title}</h4>
          {block.description && <small className="line-clamp-2">{block.description}</small>}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="block-prog">
        <ProgressBar
          value={pct}
          variant={
            dataStatus === "approved" ? "success" : dataStatus === "waiting" ? "warn" : "default"
          }
          className="flex-1"
        />
        <span className="pct">{Math.round(pct)}%</span>
      </div>

      <div className="block-sec">
        {sections.map((s) => (
          <div
            key={s.label}
            className={clsx(
              "bs",
              s.done > 0 && s.done === s.total && "done",
              s.done > 0 && s.done < s.total && "active",
            )}
          >
            <div className="k">{s.label}</div>
            <div className="vv">
              {s.done} / {s.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

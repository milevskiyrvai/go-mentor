import type { BlockStatus, FinalCheckStatus } from "@/api/types";
import clsx from "clsx";

interface Props {
  status: BlockStatus | FinalCheckStatus | string;
  className?: string;
}

const LABELS: Record<string, { label: string; tone: string }> = {
  not_started: { label: "Не начат", tone: "" },
  in_progress: { label: "В работе", tone: "primary" },
  waiting_buddy_confirmation: { label: "Ожидает Buddy", tone: "warning" },
  approved: { label: "Подтверждён", tone: "success" },
  not_available: { label: "Закрыто", tone: "" },
  available: { label: "Доступно", tone: "primary" },
  scheduled: { label: "Назначено", tone: "secondary" },
  completed: { label: "Пройдено", tone: "success" },
  failed: { label: "Не пройдено", tone: "danger" },
  submitted: { label: "Добавлено", tone: "primary" },
  reviewed: { label: "Просмотрено", tone: "secondary" },
  cancelled: { label: "Отменено", tone: "" },
  pending: { label: "Ожидание", tone: "warning" },
  approved_request: { label: "Одобрена", tone: "success" },
  rejected: { label: "Отклонена", tone: "danger" },
};

export function StatusBadge({ status, className }: Props) {
  const item = LABELS[status] ?? { label: status, tone: "" };
  return (
    <span className={clsx("status-badge", item.tone, className)}>
      <span className="dot" />
      {item.label}
    </span>
  );
}

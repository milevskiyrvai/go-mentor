import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getPublicProfile } from "@/api/users";
import { studentProgress, approveBlock } from "@/api/progress";
import { listBlocks } from "@/api/roadmap";
import { studentFinals, scheduleFinal, completeFinal } from "@/api/finals";
import {
  createMock,
  completeMock,
  studentInterviews,
  updateInterview,
} from "@/api/interviews";
import { listStudentActivity } from "@/api/activity";
import { listEvents, createEvent } from "@/api/calendar";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import { CalendarGrid } from "@/components/CalendarGrid";
import { formatDate, formatDateTime, relativeDays } from "@/lib/format";
import { api } from "@/api/client";
import type { Interview } from "@/api/types";
import clsx from "clsx";

type Tab = "roadmap" | "interviews" | "finals" | "activity" | "calendar";

export function BuddyStudentCard() {
  const { id } = useParams<{ id: string }>();
  const studentId = id!;
  const queryClient = useQueryClient();

  const profileQ = useQuery({ queryKey: ["public-profile", studentId], queryFn: () => getPublicProfile(studentId) });
  const progressQ = useQuery({ queryKey: ["student-progress", studentId], queryFn: () => studentProgress(studentId) });
  const blocksQ = useQuery({ queryKey: ["blocks"], queryFn: listBlocks });

  const [tab, setTab] = useState<Tab>("roadmap");

  if (profileQ.isLoading || progressQ.isLoading || blocksQ.isLoading) return <PageLoader />;
  if (!profileQ.data) return <div>Не найдено</div>;

  const p = profileQ.data;
  const progress = progressQ.data!;
  const blocks = (blocksQ.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader
        eyebrow="Ученик"
        title={
          <span className="flex items-center gap-4">
            <Avatar name={p.display_name} url={p.avatar_url} role="student" size={56} />
            <span>{p.display_name}</span>
          </span>
        }
        description={
          <span className="flex items-center gap-3 flex-wrap">
            {p.telegram_username && (
              <a
                href={`https://t.me/${p.telegram_username}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                t.me/{p.telegram_username}
              </a>
            )}
            {p.learning_started_at && (
              <span className="caption text-text-3 normal-case font-sans tracking-normal">
                · С {formatDate(p.learning_started_at)} ({p.learning_days ?? 0} дн.)
              </span>
            )}
            <Link
              to={`/buddy/users/${studentId}`}
              className="caption hover:text-primary normal-case font-sans tracking-normal"
            >
              · Публичный профиль →
            </Link>
          </span>
        }
        right={
          <div className="flex flex-col items-end">
            <div className="caption">Прогресс</div>
            <div className="font-mono font-bold text-primary text-[32px] -tracking-[0.02em]">
              {progress.overall_percent}%
            </div>
            <div className="caption">{progress.approved_blocks} / {progress.total_active_blocks}</div>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border">
        {(
          [
            ["roadmap", "Roadmap"],
            ["interviews", "Собеседования"],
            ["finals", "Финалки"],
            ["activity", "Активность"],
            ["calendar", "Календарь"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={clsx(
              "px-4 py-3 text-[13px] font-medium transition-all border-b-2 -mb-[1px]",
              tab === k ? "border-primary text-text" : "border-transparent text-text-2 hover:text-text",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "roadmap" && (
        <RoadmapTab studentId={studentId} blocks={blocks} progress={progress} onChange={() => {
          queryClient.invalidateQueries({ queryKey: ["student-progress", studentId] });
          queryClient.invalidateQueries({ queryKey: ["buddy-students"] });
        }} />
      )}
      {tab === "interviews" && <InterviewsTab studentId={studentId} />}
      {tab === "finals" && <FinalsTab studentId={studentId} />}
      {tab === "activity" && <ActivityTab studentId={studentId} />}
      {tab === "calendar" && <CalendarTab studentId={studentId} />}
    </div>
  );
}

// ===== Roadmap tab =====

function RoadmapTab({
  studentId,
  blocks,
  progress,
  onChange,
}: {
  studentId: string;
  blocks: { id: string; title: string; sort_order: number }[];
  progress: { blocks: { block_id: string; status: string; progress_percent: number; total_required: number; viewed_required: number; total_all: number; viewed_all: number }[] };
  onChange: () => void;
}) {
  const approveMut = useMutation({
    mutationFn: (blockId: string) => approveBlock(blockId, studentId),
    onSuccess: () => onChange(),
  });
  const progressMap = useMemo(
    () => new Map(progress.blocks.map((b) => [b.block_id, b])),
    [progress],
  );

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        const bp = progressMap.get(b.id);
        const status = bp?.status ?? "not_started";
        const canApprove = status === "waiting_buddy_confirmation" || status === "in_progress";
        return (
          <div
            key={b.id}
            className={clsx(
              "elevated p-5 flex items-center gap-4",
              status === "waiting_buddy_confirmation" && "border-warning/40",
              status === "approved" && "border-success/30",
            )}
          >
            <div
              className={clsx(
                "w-12 h-12 rounded-[10px] border border-border bg-bg grid place-items-center font-mono font-bold text-[18px] shrink-0",
                status === "approved" && "text-success",
                status === "waiting_buddy_confirmation" && "text-warning",
                status === "in_progress" && "text-primary",
                status === "not_started" && "text-text-3",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-[15px] font-semibold truncate">{b.title}</h3>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar
                    value={bp?.progress_percent ?? 0}
                    height={6}
                    variant={status === "approved" ? "success" : status === "waiting_buddy_confirmation" ? "warn" : "default"}
                  />
                </div>
                <span className="font-mono text-[12px] text-text-2 w-20 text-right">
                  {bp?.viewed_required ?? 0}/{bp?.total_required ?? 0} обяз.
                </span>
              </div>
            </div>
            {status !== "approved" && (
              <button
                className={clsx("btn btn-sm", canApprove && "btn-primary")}
                disabled={!canApprove || approveMut.isPending}
                onClick={() => approveMut.mutate(b.id)}
              >
                Подтвердить блок
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Interviews tab =====

function InterviewsTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const ivQ = useQuery({
    queryKey: ["student-interviews", studentId],
    queryFn: () => studentInterviews(studentId),
  });
  const [openMock, setOpenMock] = useState(false);
  const [completeIv, setCompleteIv] = useState<Interview | null>(null);
  const [editIv, setEditIv] = useState<Interview | null>(null);

  const all = ivQ.data ?? [];
  const mocks = all.filter((i) => i.type === "mock");
  const real = all.filter((i) => i.type === "real");

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="caption">Mock: {mocks.length} · Real: {real.length}</div>
        <button className="btn btn-primary" onClick={() => setOpenMock(true)}>
          + Назначить mock
        </button>
      </div>

      <h3 className="caption mb-3">Mock-собеседования</h3>
      <div className="space-y-3 mb-7">
        {mocks.length === 0 && (
          <div className="card p-6 text-text-3 text-[13px]">Mock-собеседований ещё не назначено.</div>
        )}
        {mocks.map((iv) => (
          <InterviewActionRow
            key={iv.id}
            iv={iv}
            onComplete={() => setCompleteIv(iv)}
            onEdit={() => setEditIv(iv)}
          />
        ))}
      </div>

      <h3 className="caption mb-3">Real-собеседования</h3>
      <div className="space-y-3 mb-8">
        {real.length === 0 && (
          <div className="card p-6 text-text-3 text-[13px]">Real-собеседований у ученика пока нет.</div>
        )}
        {real.map((iv) => (
          <InterviewActionRow
            key={iv.id}
            iv={iv}
            onComplete={() => setCompleteIv(iv)}
            onEdit={() => setEditIv(iv)}
          />
        ))}
      </div>

      <CreateMockModal
        open={openMock}
        onClose={() => setOpenMock(false)}
        studentId={studentId}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["student-interviews", studentId] });
          queryClient.invalidateQueries({ queryKey: ["buddy-students"] });
          queryClient.invalidateQueries({ queryKey: ["student-activity", studentId] });
        }}
      />
      <CompleteInterviewModal
        iv={completeIv}
        onClose={() => setCompleteIv(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["student-interviews", studentId] });
          queryClient.invalidateQueries({ queryKey: ["student-activity", studentId] });
        }}
      />
      <EditInterviewModal
        iv={editIv}
        onClose={() => setEditIv(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["student-interviews", studentId] });
        }}
      />
    </div>
  );
}

function InterviewActionRow({
  iv,
  onComplete,
  onEdit,
}: {
  iv: Interview;
  onComplete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="elevated p-4 flex items-center gap-4">
      <div
        className="w-1 self-stretch rounded-full"
        style={{
          background:
            iv.type === "mock"
              ? "color-mix(in oklab, var(--secondary) 26%, transparent)"
              : "color-mix(in oklab, var(--primary) 28%, transparent)",
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`pill ${iv.type === "mock" ? "border-secondary/40 text-secondary" : "required"}`}>
            {iv.type === "mock" ? "Mock" : "Real"}
          </span>
          <StatusBadge status={iv.status} />
          {iv.result && <span className="pill">{iv.result}</span>}
        </div>
        <div className="text-[14px] font-semibold">
          {iv.company || "Компания не указана"}
          {iv.position && <span className="text-text-2 font-normal"> · {iv.position}</span>}
        </div>
        {iv.feedback && (
          <div className="text-[12px] text-text-2 mt-1 line-clamp-2">{iv.feedback}</div>
        )}
      </div>
      <div className="flex gap-2">
        {iv.url && (
          <a href={iv.url} target="_blank" rel="noreferrer" className="btn btn-sm">
            Открыть ↗
          </a>
        )}
        <button className="btn btn-sm" onClick={onEdit}>
          Фидбэк
        </button>
        {iv.type === "mock" && iv.status !== "completed" && (
          <button className="btn btn-sm btn-primary" onClick={onComplete}>
            Завершить
          </button>
        )}
      </div>
    </div>
  );
}

function CreateMockModal({
  open,
  onClose,
  studentId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  onCreated: () => void;
}) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [grade, setGrade] = useState("");
  const [stack, setStack] = useState("");
  const [date, setDate] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      createMock({
        student_id: studentId,
        company: company.trim() || undefined,
        position: position.trim() || undefined,
        grade: grade.trim() || undefined,
        stack: stack.trim() || undefined,
        date: date ? new Date(date).toISOString() : undefined,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      setCompany("");
      setPosition("");
      setGrade("");
      setStack("");
      setDate("");
    },
  });
  return (
    <Modal open={open} onClose={onClose} title="Назначить mock-собеседование">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="caption mb-1.5 block">Компания</label>
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Позиция</label>
          <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Grade</label>
          <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Стек</label>
          <input className="input" value={stack} onChange={(e) => setStack(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Дата и время</label>
          <input type="datetime-local" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
          Создать
        </button>
      </div>
    </Modal>
  );
}

function CompleteInterviewModal({
  iv,
  onClose,
  onDone,
}: {
  iv: Interview | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const mut = useMutation({
    mutationFn: () => completeMock(iv!.id, feedback),
    onSuccess: () => {
      onDone();
      onClose();
      setFeedback("");
    },
  });
  if (!iv) return null;
  return (
    <Modal open={true} onClose={onClose} title={`Завершить: ${iv.company || "mock"}`}>
      <label className="caption mb-1.5 block">Фидбэк</label>
      <textarea
        className="textarea"
        rows={5}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Сильные и слабые стороны, что улучшить..."
      />
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
          Завершить и сохранить
        </button>
      </div>
    </Modal>
  );
}

function EditInterviewModal({
  iv,
  onClose,
  onDone,
}: {
  iv: Interview | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [feedback, setFeedback] = useState(iv?.feedback ?? "");
  const [result, setResult] = useState(iv?.result ?? "");
  const mut = useMutation({
    mutationFn: () =>
      updateInterview(iv!.id, { feedback, result: result || undefined }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  if (!iv) return null;
  return (
    <Modal open={true} onClose={onClose} title="Фидбэк по собеседованию">
      <label className="caption mb-1.5 block">Результат</label>
      <select className="select mb-3" value={result} onChange={(e) => setResult(e.target.value)}>
        <option value="">не указан</option>
        <option value="offer">Оффер</option>
        <option value="reject">Отказ</option>
        <option value="pending">В процессе</option>
        <option value="no_result">Без результата</option>
      </select>
      <label className="caption mb-1.5 block">Фидбэк</label>
      <textarea
        className="textarea"
        rows={5}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
          Сохранить
        </button>
      </div>
    </Modal>
  );
}

// ===== Finals tab =====

function FinalsTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const finalsQ = useQuery({
    queryKey: ["student-finals", studentId],
    queryFn: () => studentFinals(studentId),
  });
  const [schedule, setSchedule] = useState<{ type: "final_technical" | "final_roast" } | null>(null);
  const finals = finalsQ.data ?? [];

  return (
    <div>
      <p className="text-text-2 text-[13px] mb-5 max-w-2xl">
        Финальные проверки открываются после подтверждения всех блоков. Каждая финалка одноразовая. После
        обоих completed автоматически выдаётся достижение «Финалист» (+300 бонусов).
      </p>
      <div className="grid grid-cols-2 gap-4">
        {finals.map((f) => (
          <div key={f.id} className="elevated p-5">
            <div className="caption mb-2">{f.type === "final_technical" ? "Финал" : "Финал"}</div>
            <h3 className="text-[18px] font-bold">
              {f.type === "final_technical" ? "Техничка" : "Прожарка"}
            </h3>
            <div className="mt-3">
              <StatusBadge status={f.status} />
            </div>
            {f.scheduled_at && (
              <div className="font-mono text-[12px] text-text-2 mt-2">
                Назначено: {formatDateTime(f.scheduled_at)}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              {(f.status === "available" || f.status === "scheduled") && (
                <button className="btn btn-sm" onClick={() => setSchedule({ type: f.type })}>
                  Назначить дату
                </button>
              )}
              {f.status !== "completed" && f.status !== "failed" && f.status !== "not_available" && (
                <>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={async () => {
                      await completeFinal(studentId, f.type, true);
                      queryClient.invalidateQueries({ queryKey: ["student-finals", studentId] });
                    }}
                  >
                    Пройдено ✓
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={async () => {
                      await completeFinal(studentId, f.type, false);
                      queryClient.invalidateQueries({ queryKey: ["student-finals", studentId] });
                    }}
                  >
                    Не пройдено
                  </button>
                </>
              )}
            </div>
            {f.status === "not_available" && (
              <div className="caption text-text-3 normal-case font-sans tracking-normal mt-3">
                Откроется после закрытия всех блоков.
              </div>
            )}
          </div>
        ))}
      </div>

      {schedule && (
        <ScheduleFinalModal
          studentId={studentId}
          type={schedule.type}
          onClose={() => setSchedule(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["student-finals", studentId] });
          }}
        />
      )}
    </div>
  );
}

function ScheduleFinalModal({
  studentId,
  type,
  onClose,
  onDone,
}: {
  studentId: string;
  type: "final_technical" | "final_roast";
  onClose: () => void;
  onDone: () => void;
}) {
  const [dt, setDt] = useState("");
  const mut = useMutation({
    mutationFn: () => scheduleFinal(studentId, type, new Date(dt).toISOString()),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  return (
    <Modal open={true} onClose={onClose} title="Назначить финалку">
      <label className="caption mb-1.5 block">Дата и время</label>
      <input
        type="datetime-local"
        className="input"
        value={dt}
        onChange={(e) => setDt(e.target.value)}
      />
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" disabled={!dt || mut.isPending} onClick={() => mut.mutate()}>
          Назначить
        </button>
      </div>
    </Modal>
  );
}

// ===== Activity tab =====

function ActivityTab({ studentId }: { studentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["student-activity", studentId],
    queryFn: () => listStudentActivity(studentId, 200),
  });
  if (isLoading) return <PageLoader />;
  const items = data ?? [];
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="card p-6 text-text-3 text-[13px]">История активности пуста.</div>
      )}
      {items.map((e) => (
        <div key={e.id} className="elevated p-4 flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-md grid place-items-center bg-bg border border-border text-text-2 font-mono text-[12px] shrink-0"
            style={{ color: colorForActivity(e.type) }}
          >
            {iconForActivity(e.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium">{labelForActivity(e.type, e.metadata)}</div>
            <div className="font-mono text-[11px] text-text-3 mt-0.5">
              {formatDateTime(e.created_at)} · {relativeDays(e.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function colorForActivity(t: string): string {
  if (t.includes("approved")) return "var(--success)";
  if (t.includes("achievement")) return "var(--secondary)";
  if (t.includes("interview")) return "var(--primary)";
  if (t.includes("final")) return "var(--warning)";
  return "var(--text-2)";
}

function iconForActivity(t: string): string {
  if (t.includes("material_viewed")) return "≣";
  if (t.includes("block_approved")) return "✓";
  if (t.includes("achievement")) return "★";
  if (t.includes("interview")) return "M";
  if (t.includes("final")) return "F";
  if (t.includes("bonus")) return "$";
  return "·";
}

function labelForActivity(t: string, meta: Record<string, unknown>): string {
  switch (t) {
    case "material_viewed":
      return `Просмотрел материал${meta?.title ? ": " + meta.title : ""}`;
    case "block_approved":
      return "Buddy подтвердил блок";
    case "achievement_unlocked":
      return `Получено достижение: ${meta?.title ?? ""}`;
    case "interview_added":
    case "interview_added_real":
      return "Добавлено real-собеседование";
    case "mock_created":
      return "Назначено mock-собеседование";
    case "mock_completed":
      return "Mock-собеседование завершено";
    case "interview_updated":
      return "Собеседование обновлено";
    case "final_scheduled":
      return "Финалка назначена";
    case "final_completed":
      return "Финалка пройдена";
    case "final_failed":
      return "Финалка не пройдена";
    case "bonus_credited":
      return `Начислены бонусы (+${meta?.amount ?? "?"})`;
    case "bonus_debited":
      return `Списаны бонусы (-${meta?.amount ?? "?"})`;
    default:
      return t;
  }
}

// ===== Calendar tab =====

function CalendarTab({ studentId }: { studentId: string }) {
  const [month, setMonth] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const range = useMemo(() => {
    const s = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const e = new Date(month.getFullYear(), month.getMonth() + 2, 1);
    return { from: s.toISOString(), to: e.toISOString() };
  }, [month]);

  const eventsQ = useQuery({
    queryKey: ["buddy-calendar", studentId, month.getFullYear(), month.getMonth()],
    queryFn: () => listEvents({ student_id: studentId, from: range.from, to: range.to }),
  });

  if (eventsQ.isLoading) return <PageLoader />;
  const events = eventsQ.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + Создать событие
        </button>
      </div>
      <CalendarGrid
        events={events}
        month={month}
        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
      />
      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultStudentId={studentId}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["buddy-calendar"] })}
      />
    </div>
  );
}

export function CreateEventModal({
  open,
  onClose,
  defaultStudentId,
  studentChoices,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  studentChoices?: { id: string; display_name: string }[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"mock_interview" | "real_interview" | "block_review" | "final_technical" | "final_roast" | "custom">("mock_interview");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState(true);
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");

  const mut = useMutation({
    mutationFn: () =>
      createEvent({
        title,
        type,
        start_datetime: new Date(start).toISOString(),
        end_datetime: end ? new Date(end).toISOString() : undefined,
        description: description || undefined,
        reminder_enabled: reminder,
        student_id: studentId || undefined,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      setTitle("");
      setStart("");
      setEnd("");
      setDescription("");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Новое событие" width={580}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Название</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Тип</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="mock_interview">Mock</option>
            <option value="real_interview">Real-разбор</option>
            <option value="block_review">Ревью блока</option>
            <option value="final_technical">Финал · Техничка</option>
            <option value="final_roast">Финал · Прожарка</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {studentChoices && (
          <div>
            <label className="caption mb-1.5 block">Ученик</label>
            <select
              className="select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">— не выбран —</option>
              {studentChoices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="caption mb-1.5 block">Начало</label>
          <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Конец (опц.)</label>
          <input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Описание</label>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="col-span-2 flex items-center gap-2 caption normal-case font-sans tracking-normal text-text-2">
          <input
            type="checkbox"
            checked={reminder}
            onChange={(e) => setReminder(e.target.checked)}
          />
          Напоминание
        </label>
      </div>
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button
          className="btn btn-primary"
          disabled={mut.isPending || !title || !start}
          onClick={() => mut.mutate()}
        >
          Создать
        </button>
      </div>
    </Modal>
  );
}

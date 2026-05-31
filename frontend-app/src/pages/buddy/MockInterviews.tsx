import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyStudents } from "@/api/users";
import {
  studentInterviews,
  createMock,
  completeMock,
  updateInterview,
} from "@/api/interviews";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, Spinner } from "@/components/Spinner";
import { Avatar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import { formatDateTime } from "@/lib/format";
import type { BuddyStudent, Interview } from "@/api/types";
import clsx from "clsx";

type Tab = "feedback" | "planned" | "done";

/**
 * Buddy · Собеседования — единый экран по всем ученикам:
 *  - назначить mock,
 *  - оставить фидбэк по проведённым,
 *  - очередь запланированных,
 *  - архив завершённых.
 *
 * ВАЖНО (ТЗ §5.5): buddy НЕ видит бонусы/баланс/историю бонусов ученика —
 * на этом экране их и нет, только собеседования.
 */
export function BuddyMockInterviews() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("feedback");
  const [openMock, setOpenMock] = useState(false);
  const [feedbackIv, setFeedbackIv] = useState<EnrichedInterview | null>(null);

  const studentsQ = useQuery({ queryKey: ["buddy-students"], queryFn: listMyStudents });
  const students = studentsQ.data ?? [];

  // Mock-собеседования по каждому ученику (параллельно).
  const interviewQueries = useQueries({
    queries: students.map((s) => ({
      queryKey: ["student-interviews", s.id, "mock"],
      queryFn: () => studentInterviews(s.id, "mock"),
      enabled: !studentsQ.isLoading,
    })),
  });

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  );

  const interviewsLoading = interviewQueries.some((q) => q.isLoading);
  const interviewsError = interviewQueries.some((q) => q.isError);

  const all: EnrichedInterview[] = useMemo(() => {
    const flat = interviewQueries.flatMap((q) => q.data ?? []);
    return flat
      .map((iv) => ({ ...iv, student: studentMap.get(iv.student_id) }))
      .sort((a, b) => sortTime(b) - sortTime(a));
  }, [interviewQueries, studentMap]);

  const grouped = useMemo(() => groupInterviews(all), [all]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["student-interviews"] });
    queryClient.invalidateQueries({ queryKey: ["buddy-students"] });
  };

  if (studentsQ.isLoading) return <PageLoader />;

  if (studentsQ.isError) {
    return (
      <ErrorState
        message="Не удалось загрузить список учеников."
        onRetry={() => studentsQ.refetch()}
      />
    );
  }

  const plannedThisWeek = grouped.planned.filter(isWithinWeek).length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "feedback", label: "Ждут фидбэка", count: grouped.feedback.length },
    { key: "planned", label: "Запланированы", count: grouped.planned.length },
    { key: "done", label: "Завершены", count: grouped.done.length },
  ];

  const active = grouped[tab];

  return (
    <div>
      <PageHeader
        eyebrow="Buddy"
        title="Собеседования"
        description={
          <span className="flex items-center gap-2 flex-wrap">
            <b className="text-secondary font-semibold">{grouped.feedback.length}</b>
            <span>ждут вашего фидбэка</span>
            <span className="text-text-3">·</span>
            <b className="text-primary font-semibold">{plannedThisWeek}</b>
            <span>запланировано на неделю</span>
          </span>
        }
        right={
          <button
            className="btn btn-primary"
            disabled={students.length === 0}
            onClick={() => setOpenMock(true)}
          >
            + Назначить mock
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "px-4 py-3 text-[13px] font-medium transition-all border-b-2 -mb-[1px] flex items-center gap-2",
              tab === t.key
                ? "border-primary text-text"
                : "border-transparent text-text-2 hover:text-text",
            )}
          >
            {t.label}
            <span
              className={clsx(
                "font-mono text-[11px] rounded-full px-1.5 min-w-[20px] text-center",
                tab === t.key ? "bg-primary/12 text-primary" : "bg-bg text-text-3",
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading state for the per-student fetches */}
      {interviewsLoading && (
        <div className="flex items-center gap-3 text-text-2 text-[13px] py-10 justify-center">
          <Spinner size={20} />
          Загружаем собеседования…
        </div>
      )}

      {!interviewsLoading && interviewsError && (
        <ErrorState
          message="Часть собеседований не загрузилась."
          onRetry={() => interviewQueries.forEach((q) => q.refetch())}
        />
      )}

      {!interviewsLoading && !interviewsError && (
        <>
          {active.length === 0 ? (
            <EmptyState tab={tab} onAssign={() => setOpenMock(true)} canAssign={students.length > 0} />
          ) : (
            <div className="space-y-3">
              {active.map((iv) => (
                <InterviewCard
                  key={iv.id}
                  iv={iv}
                  tab={tab}
                  onFeedback={() => setFeedbackIv(iv)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateMockModal
        open={openMock}
        onClose={() => setOpenMock(false)}
        students={students}
        onCreated={invalidate}
      />
      <FeedbackModal
        iv={feedbackIv}
        onClose={() => setFeedbackIv(null)}
        onDone={invalidate}
      />
    </div>
  );
}

// ===================== Interview card =====================

type EnrichedInterview = Interview & { student?: BuddyStudent };

function InterviewCard({
  iv,
  tab,
  onFeedback,
}: {
  iv: EnrichedInterview;
  tab: Tab;
  onFeedback: () => void;
}) {
  const title = iv.stack
    ? `Mock · ${iv.stack}`
    : iv.position
      ? `Mock · ${iv.position}`
      : "Mock-собеседование";

  return (
    <div
      className={clsx(
        "elevated p-4",
        tab === "feedback" && "shadow-[inset_3px_0_0_var(--secondary)]",
      )}
    >
      <div className="flex items-center gap-4">
        {/* Mock logo */}
        <div className="w-10 h-10 rounded-[9px] grid place-items-center font-bold text-[15px] shrink-0 bg-secondary/12 text-secondary border border-secondary/25">
          M
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold truncate">{title}</h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {iv.student ? (
              <Link
                to={`/buddy/students/${iv.student_id}`}
                className="inline-flex items-center gap-1.5 text-[12px] text-text-2 hover:text-primary transition-colors"
              >
                <Avatar
                  name={iv.student.display_name}
                  url={iv.student.avatar_url}
                  role="student"
                  size={18}
                />
                {iv.student.display_name}
              </Link>
            ) : (
              <span className="text-[12px] text-text-3">Ученик</span>
            )}
            <span className="text-[12px] text-text-3">
              · {iv.date ? formatDateTime(iv.date) : "без даты"}
            </span>
            {iv.company && (
              <span className="text-[12px] text-text-3">· {iv.company}</span>
            )}
          </div>
        </div>

        {/* Trailing action / status */}
        {tab === "feedback" && (
          <button className="btn btn-sm btn-primary" onClick={onFeedback}>
            Оставить фидбэк
          </button>
        )}
        {tab === "planned" && <PlannedPill iv={iv} />}
        {tab === "done" && (
          <span className="status-badge success shrink-0">
            <span className="dot" />
            Завершён
          </span>
        )}
      </div>

      {/* Feedback preview on done cards */}
      {tab === "done" && iv.feedback && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="caption flex items-center gap-2 mb-1.5 normal-case font-sans tracking-normal">
            <span className="w-5 h-5 rounded-full bg-primary/12 text-primary grid place-items-center text-[10px] font-bold">
              Я
            </span>
            Ваш фидбэк
            {iv.result && iv.result !== "no_result" && (
              <span className="pill">{resultLabel(iv.result)}</span>
            )}
          </div>
          <p className="text-[13px] text-text-2 leading-relaxed">{iv.feedback}</p>
        </div>
      )}
    </div>
  );
}

function PlannedPill({ iv }: { iv: EnrichedInterview }) {
  if (isToday(iv.date)) {
    return (
      <span className="status-badge primary shrink-0">
        <span className="dot" />
        Сегодня
      </span>
    );
  }
  return (
    <span className="status-badge warning shrink-0">
      <span className="dot" />
      Запланирован
    </span>
  );
}

// ===================== Empty / error states =====================

function EmptyState({
  tab,
  onAssign,
  canAssign,
}: {
  tab: Tab;
  onAssign: () => void;
  canAssign: boolean;
}) {
  const copy: Record<Tab, { title: string; sub: string }> = {
    feedback: {
      title: "Нет собеседований, ожидающих фидбэка",
      sub: "Как только проведёте mock, он появится здесь — останется оставить фидбэк ученику.",
    },
    planned: {
      title: "Ничего не запланировано",
      sub: "Назначьте mock-собеседование одному из ваших учеников.",
    },
    done: {
      title: "Завершённых собеседований пока нет",
      sub: "Здесь будет архив проведённых mock с вашим фидбэком.",
    },
  };
  const c = copy[tab];
  return (
    <div className="card p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-bg border border-border grid place-items-center mx-auto mb-4 text-text-3 text-[20px]">
        ◌
      </div>
      <h3 className="text-[15px] font-semibold mb-1">{c.title}</h3>
      <p className="text-text-2 text-[13px] max-w-md mx-auto">{c.sub}</p>
      {tab === "planned" && canAssign && (
        <button className="btn btn-primary mt-5" onClick={onAssign}>
          + Назначить mock
        </button>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card p-10 text-center border-danger/30">
      <h3 className="text-[15px] font-semibold mb-1 text-danger">Ошибка загрузки</h3>
      <p className="text-text-2 text-[13px] mb-5">{message}</p>
      <button className="btn" onClick={onRetry}>
        Повторить
      </button>
    </div>
  );
}

// ===================== Create mock modal =====================

function CreateMockModal({
  open,
  onClose,
  students,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  students: BuddyStudent[];
  onCreated: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [stack, setStack] = useState("");
  const [position, setPosition] = useState("");
  const [grade, setGrade] = useState("");
  const [company, setCompany] = useState("");
  const [date, setDate] = useState("");

  const reset = () => {
    setStudentId("");
    setStack("");
    setPosition("");
    setGrade("");
    setCompany("");
    setDate("");
  };

  const mut = useMutation({
    mutationFn: () =>
      createMock({
        student_id: studentId,
        stack: stack.trim() || undefined,
        position: position.trim() || undefined,
        grade: grade.trim() || undefined,
        company: company.trim() || undefined,
        date: date ? new Date(date).toISOString() : undefined,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      reset();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Назначить mock-собеседование" width={560}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Ученик *</label>
          <select
            className="select"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">— выберите ученика —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Тема / стек</label>
          <input
            className="input"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="System Design, Алгоритмы, Concurrency…"
          />
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
          <label className="caption mb-1.5 block">Компания (опц.)</label>
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Дата и время</label>
          <input
            type="datetime-local"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {mut.isError && (
        <div className="text-danger text-[12px] mt-3">
          Не удалось создать. Проверьте поля и попробуйте ещё раз.
        </div>
      )}

      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button
          className="btn btn-primary"
          disabled={!studentId || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Создаём…" : "Назначить"}
        </button>
      </div>
    </Modal>
  );
}

// ===================== Feedback modal =====================

function FeedbackModal({
  iv,
  onClose,
  onDone,
}: {
  iv: EnrichedInterview | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState("");

  // Если интервью уже completed — правим фидбэк через updateInterview,
  // иначе завершаем mock через completeMock.
  const isCompleted = iv?.status === "completed";

  const mut = useMutation({
    mutationFn: async () => {
      if (!iv) return;
      if (isCompleted) {
        await updateInterview(iv.id, {
          feedback,
          result: result || undefined,
        });
      } else {
        await completeMock(iv.id, feedback);
        if (result) {
          await updateInterview(iv.id, { result });
        }
      }
    },
    onSuccess: () => {
      onDone();
      onClose();
      setFeedback("");
      setResult("");
    },
  });

  if (!iv) return null;

  const title = iv.stack ? `Mock · ${iv.stack}` : "Mock-собеседование";

  return (
    <Modal open={true} onClose={onClose} title="Фидбэк по собеседованию" width={560}>
      <div className="elevated p-3 mb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[9px] grid place-items-center font-bold text-[14px] bg-secondary/12 text-secondary border border-secondary/25 shrink-0">
          M
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate">{title}</div>
          <div className="text-[12px] text-text-2 truncate">
            {iv.student?.display_name ?? "Ученик"}
            {iv.date && <> · {formatDateTime(iv.date)}</>}
          </div>
        </div>
      </div>

      <label className="caption mb-1.5 block">Результат (опц.)</label>
      <select
        className="select mb-3"
        value={result}
        onChange={(e) => setResult(e.target.value)}
      >
        <option value="">не указан</option>
        <option value="offer">Оффер</option>
        <option value="reject">Отказ</option>
        <option value="pending">В процессе</option>
        <option value="no_result">Без результата</option>
      </select>

      <label className="caption mb-1.5 block">Фидбэк ученику *</label>
      <textarea
        className="textarea"
        rows={6}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Сильные и слабые стороны, что подтянуть к следующему разу…"
      />

      {mut.isError && (
        <div className="text-danger text-[12px] mt-3">
          Не удалось сохранить фидбэк. Попробуйте ещё раз.
        </div>
      )}

      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button
          className="btn btn-primary"
          disabled={!feedback.trim() || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Сохраняем…" : isCompleted ? "Сохранить" : "Завершить и сохранить"}
        </button>
      </div>
    </Modal>
  );
}

// ===================== helpers =====================

function sortTime(iv: Interview): number {
  return new Date(iv.date ?? iv.created_at).getTime() || 0;
}

function groupInterviews(all: EnrichedInterview[]) {
  const now = Date.now();
  const feedback: EnrichedInterview[] = [];
  const planned: EnrichedInterview[] = [];
  const done: EnrichedInterview[] = [];

  for (const iv of all) {
    const isDone = iv.status === "completed" || iv.status === "reviewed" || !!iv.feedback;
    if (isDone) {
      done.push(iv);
      continue;
    }
    const t = iv.date ? new Date(iv.date).getTime() : NaN;
    // Прошедшее (или без даты) и не завершённое — ждёт фидбэка.
    // Будущее — запланировано.
    if (!Number.isNaN(t) && t > now) {
      planned.push(iv);
    } else {
      feedback.push(iv);
    }
  }
  // planned по возрастанию (ближайшие сверху)
  planned.sort((a, b) => sortTime(a) - sortTime(b));
  return { feedback, planned, done };
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function isWithinWeek(iv: Interview): boolean {
  if (!iv.date) return false;
  const t = new Date(iv.date).getTime();
  const now = Date.now();
  return t >= now && t <= now + 7 * 24 * 60 * 60 * 1000;
}

function resultLabel(result: string): string {
  switch (result) {
    case "offer":
      return "Оффер";
    case "reject":
      return "Отказ";
    case "pending":
      return "В процессе";
    default:
      return result;
  }
}

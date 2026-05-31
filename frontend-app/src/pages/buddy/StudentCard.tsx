import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PageLoader, Spinner } from "@/components/Spinner";
import { Avatar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import { formatDate, formatDateTime, relativeDays } from "@/lib/format";
import type {
  Interview,
  BlockProgressSummary,
  FinalCheck,
  ActivityEvent,
} from "@/api/types";
import clsx from "clsx";

type Tab = "roadmap" | "interviews" | "final" | "activity" | "profile";

const TABS: [Tab, string][] = [
  ["roadmap", "Roadmap"],
  ["interviews", "Собеседования"],
  ["final", "Финальные этапы"],
  ["activity", "Активность"],
  ["profile", "Профиль"],
];

export function BuddyStudentCard() {
  const { id } = useParams<{ id: string }>();
  const studentId = id!;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("roadmap");

  const profileQ = useQuery({
    queryKey: ["public-profile", studentId],
    queryFn: () => getPublicProfile(studentId),
  });
  const progressQ = useQuery({
    queryKey: ["student-progress", studentId],
    queryFn: () => studentProgress(studentId),
  });
  const blocksQ = useQuery({ queryKey: ["blocks"], queryFn: () => listBlocks() });

  if (profileQ.isLoading || progressQ.isLoading || blocksQ.isLoading)
    return <PageLoader />;

  if (profileQ.isError || !profileQ.data) {
    return (
      <div className="card card-pad text-center text-[13px] text-text-3">
        Не удалось загрузить карточку ученика.{" "}
        <Link to="/buddy/students" className="text-primary hover:underline">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const p = profileQ.data;
  const progress = progressQ.data!;
  const blocks = (blocksQ.data ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const progressMap = new Map<string, BlockProgressSummary>(
    progress.blocks.map((b) => [b.block_id, b]),
  );

  // Блок, ожидающий подтверждения buddy → герой-действие
  const waitingBlock = blocks.find(
    (b) => progressMap.get(b.id)?.status === "waiting_buddy_confirmation",
  );
  const waitingProg = waitingBlock ? progressMap.get(waitingBlock.id) : undefined;

  const refetchProgress = () => {
    queryClient.invalidateQueries({ queryKey: ["student-progress", studentId] });
    queryClient.invalidateQueries({ queryKey: ["buddy-students"] });
    queryClient.invalidateQueries({ queryKey: ["student-activity", studentId] });
  };

  return (
    <div className="flex flex-col gap-4">
      <Link to="/buddy/students" className="backlink">
        <svg
          className="i"
          style={{ width: 15, height: 15 }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Все ученики
      </Link>

      {/* student header */}
      <div className="card scard">
        <Avatar name={p.display_name} url={p.avatar_url} role="student" size={60} />
        <div className="sinfo">
          <h2>{p.display_name}</h2>
          <div className="smeta">
            {p.telegram_username && (
              <span className="tg">@{p.telegram_username}</span>
            )}
            <span>· Студент</span>
            {p.learning_started_at && (
              <span>· учится с {formatDate(p.learning_started_at)}</span>
            )}
            {typeof p.learning_days === "number" && p.learning_days > 0 && (
              <span>· {p.learning_days} дн.</span>
            )}
          </div>
        </div>
        <div className="sact">
          <Link to={`/buddy/users/${studentId}`} className="btn ghost sm">
            Публичный профиль
          </Link>
          {p.telegram_username && (
            <a
              href={`https://t.me/${p.telegram_username}`}
              target="_blank"
              rel="noreferrer"
              className="btn ghost sm"
            >
              Написать в Telegram
            </a>
          )}
        </div>
      </div>

      {/* hero action — подтверждение блока */}
      {waitingBlock && (
        <ConfirmHero
          studentId={studentId}
          blockId={waitingBlock.id}
          blockTitle={waitingBlock.title}
          totalRequired={waitingProg?.total_required ?? 0}
          onApproved={refetchProgress}
        />
      )}

      {/* tabs */}
      <div className="tabs">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={clsx("tab", tab === k && "active")}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "roadmap" && (
        <RoadmapTab
          studentId={studentId}
          blocks={blocks}
          progressMap={progressMap}
          onChange={refetchProgress}
        />
      )}
      {tab === "interviews" && <InterviewsTab studentId={studentId} />}
      {tab === "final" && <FinalTab studentId={studentId} progress={progress} />}
      {tab === "activity" && <ActivityTab studentId={studentId} />}
      {tab === "profile" && (
        <ProfileTab studentId={studentId} about={p.about} progress={progress} />
      )}
    </div>
  );
}

// ============ Hero (подтверждение блока) ============

function ConfirmHero({
  studentId,
  blockId,
  blockTitle,
  totalRequired,
  onApproved,
}: {
  studentId: string;
  blockId: string;
  blockTitle: string;
  totalRequired: number;
  onApproved: () => void;
}) {
  const mut = useMutation({
    mutationFn: () => approveBlock(blockId, studentId),
    onSuccess: onApproved,
  });
  return (
    <div className="nextstep">
      <div className="ico">
        <svg
          className="i"
          style={{ width: 22, height: 22 }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline
            points="5 12 10 17 19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <div className="tt">Блок «{blockTitle}» готов к подтверждению</div>
        <div className="ds">
          {totalRequired > 0
            ? `Все ${totalRequired} обязательных материалов отмечены. `
            : "Все обязательные материалы отмечены. "}
          Подтвердите закрытие — ученик получит достижение за блок.
        </div>
      </div>
      <button
        className="btn secondary"
        disabled={mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? "Подтверждаю…" : "Подтвердить блок"}
      </button>
    </div>
  );
}

// ============ Roadmap ============

function RoadmapTab({
  studentId,
  blocks,
  progressMap,
  onChange,
}: {
  studentId: string;
  blocks: { id: string; title: string }[];
  progressMap: Map<string, BlockProgressSummary>;
  onChange: () => void;
}) {
  const approveMut = useMutation({
    mutationFn: (blockId: string) => approveBlock(blockId, studentId),
    onSuccess: onChange,
  });

  if (blocks.length === 0) {
    return (
      <div className="card card-pad text-center text-[13px] text-text-3">
        Программа пока не настроена — блоков нет.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => {
        const bp = progressMap.get(b.id);
        const status = bp?.status ?? "not_started";
        const dataS =
          status === "approved"
            ? "approved"
            : status === "in_progress"
              ? "in_progress"
              : status === "waiting_buddy_confirmation"
                ? "waiting"
                : "not_started";
        const totalReq = bp?.total_required ?? 0;
        const viewedReq = bp?.viewed_required ?? 0;
        const pct = bp?.progress_percent ?? 0;
        const selected = status === "waiting_buddy_confirmation";

        return (
          <div key={b.id} className={clsx("block", selected && "sel")} data-s={dataS}>
            <div className="block-head">
              <div className="block-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="block-title">
                <h4>{b.title}</h4>
                <small>{blockSubtitle(status, viewedReq, totalReq, bp)}</small>
              </div>
              <span className={`pill ${pillClass(status)}`}>
                <span className="led" />
                {pillLabel(status)}
              </span>
            </div>

            {status === "waiting_buddy_confirmation" && (
              <div className="block-prog">
                <div className="bar success" style={{ flex: 1 }}>
                  <i style={{ width: "100%" }} />
                </div>
                <button
                  className="btn secondary sm"
                  disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate(b.id)}
                >
                  {approveMut.isPending ? "…" : "Подтвердить"}
                </button>
              </div>
            )}

            {status === "in_progress" && (
              <div className="block-prog">
                <span className="pct num">{pct}%</span>
                <div className="bar" style={{ flex: 1 }}>
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function blockSubtitle(
  status: string,
  viewedReq: number,
  totalReq: number,
  bp?: BlockProgressSummary,
): string {
  if (status === "approved") {
    return `${totalReq} из ${totalReq} материалов · подтверждён`;
  }
  if (status === "waiting_buddy_confirmation") {
    return `${viewedReq} из ${totalReq} материалов отмечены · ждёт вашего подтверждения`;
  }
  if (status === "in_progress") {
    return `${bp?.viewed_all ?? viewedReq} из ${bp?.total_all ?? totalReq} материалов просмотрено`;
  }
  return `0 из ${totalReq} материалов`;
}

function pillClass(status: string): string {
  switch (status) {
    case "approved":
      return "approved";
    case "waiting_buddy_confirmation":
      return "waiting";
    case "in_progress":
      return "in-progress";
    default:
      return "not-started";
  }
}

function pillLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Подтверждён";
    case "waiting_buddy_confirmation":
      return "Ждёт вас";
    case "in_progress":
      return "В работе";
    default:
      return "Не начат";
  }
}

// ============ Interviews ============

function InterviewsTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const ivQ = useQuery({
    queryKey: ["student-interviews", studentId],
    queryFn: () => studentInterviews(studentId),
  });
  const [openMock, setOpenMock] = useState(false);
  const [completeIv, setCompleteIv] = useState<Interview | null>(null);
  const [editIv, setEditIv] = useState<Interview | null>(null);

  if (ivQ.isLoading) return <PageLoader />;

  const all = ivQ.data ?? [];
  const mocks = all.filter((i) => i.type === "mock");
  const real = all.filter((i) => i.type === "real");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["student-interviews", studentId] });
    queryClient.invalidateQueries({ queryKey: ["student-activity", studentId] });
    queryClient.invalidateQueries({ queryKey: ["buddy-students"] });
  };

  return (
    <div>
      {/* Mock — вы назначаете и пишете фидбэк */}
      <div className="iv-group">
        <div className="gh">
          <span className="gt">Mock</span>
          <span className="gc">вы назначаете и пишете фидбэк</span>
          <span className="ln" />
        </div>
        <div style={{ marginBottom: 13 }}>
          <button className="btn primary sm" onClick={() => setOpenMock(true)}>
            <svg
              className="i"
              style={{ width: 15, height: 15 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Назначить mock
          </button>
        </div>

        {mocks.length === 0 && (
          <div className="card card-pad text-[13px] text-text-3">
            Mock-собеседований ещё не назначено.
          </div>
        )}
        {mocks.map((iv) => (
          <MockRow
            key={iv.id}
            iv={iv}
            onComplete={() => setCompleteIv(iv)}
            onEdit={() => setEditIv(iv)}
          />
        ))}
      </div>

      {/* Real — добавляет ученик · только просмотр */}
      <div className="iv-group">
        <div className="gh">
          <span className="gt">Real</span>
          <span className="gc">добавляет ученик · только просмотр</span>
          <span className="ln" />
        </div>
        {real.length === 0 && (
          <div className="card card-pad text-[13px] text-text-3">
            Real-собеседований у ученика пока нет.
          </div>
        )}
        {real.map((iv) => (
          <RealRow key={iv.id} iv={iv} />
        ))}
      </div>

      <CreateMockModal
        open={openMock}
        onClose={() => setOpenMock(false)}
        studentId={studentId}
        onCreated={invalidate}
      />
      <CompleteInterviewModal
        iv={completeIv}
        onClose={() => setCompleteIv(null)}
        onDone={invalidate}
      />
      <EditInterviewModal
        iv={editIv}
        onClose={() => setEditIv(null)}
        onDone={invalidate}
      />
    </div>
  );
}

function MockRow({
  iv,
  onComplete,
  onEdit,
}: {
  iv: Interview;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const done = iv.status === "completed";
  return (
    <div className="iv">
      <div className="iv-head">
        <div className="iv-logo mock">M</div>
        <div className="iv-tt">
          <h4>Mock{iv.company ? ` · ${iv.company}` : iv.stack ? ` · ${iv.stack}` : ""}</h4>
          <div className="iv-meta">
            {iv.status === "scheduled" && !done && (
              <span className="iv-chip">запланирован</span>
            )}
            {iv.date && <span className="iv-date">· {formatDateTime(iv.date)}</span>}
          </div>
        </div>
        {done ? (
          <span className="pill completed">
            <span className="led" />
            Завершён
          </span>
        ) : (
          <button className="btn secondary sm" onClick={onComplete}>
            Завершить и дать фидбэк
          </button>
        )}
      </div>
      {iv.feedback && (
        <div className="iv-fb">
          <div className="who">
            <span className="ava">Я</span>Ваш фидбэк
            <button
              className="btn ghost sm"
              style={{ marginLeft: "auto" }}
              onClick={onEdit}
            >
              Изменить
            </button>
          </div>
          <p>{iv.feedback}</p>
        </div>
      )}
      {done && !iv.feedback && (
        <div className="iv-fb">
          <button className="btn ghost sm" onClick={onEdit}>
            Добавить фидбэк
          </button>
        </div>
      )}
    </div>
  );
}

function RealRow({ iv }: { iv: Interview }) {
  const logo = (iv.company || "—").slice(0, 2).toUpperCase();
  return (
    <div className="iv">
      <div className="iv-head">
        <div className="iv-logo">{logo}</div>
        <div className="iv-tt">
          <h4>
            {iv.company || "Компания не указана"}
            {iv.position && <span className="pos"> · {iv.position}</span>}
          </h4>
          <div className="iv-meta">
            {iv.grade && <span className="iv-chip grade">{iv.grade}</span>}
            {iv.date && <span className="iv-date">· {formatDate(iv.date)}</span>}
          </div>
        </div>
        {iv.result && (
          <span className={`pill ${resultPill(iv.result)}`}>
            <span className="led" />
            {resultLabel(iv.result)}
          </span>
        )}
      </div>
    </div>
  );
}

function resultPill(result: string): string {
  switch (result) {
    case "offer":
      return "offer";
    case "reject":
      return "reject";
    case "pending":
      return "pending";
    default:
      return "not-started";
  }
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
      return "Без результата";
  }
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
          <label className="caption mb-1.5 block">Тема / компания</label>
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
          <input
            type="datetime-local"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? "Создаю…" : "Создать"}
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
    <Modal open onClose={onClose} title={`Завершить mock${iv.company ? `: ${iv.company}` : ""}`}>
      <label className="caption mb-1.5 block">Фидбэк</label>
      <textarea
        className="textarea"
        rows={5}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Сильные и слабые стороны, что подтянуть…"
      />
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? "Сохраняю…" : "Завершить и сохранить"}
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
  const mut = useMutation({
    mutationFn: () => updateInterview(iv!.id, { feedback }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  if (!iv) return null;
  return (
    <Modal open onClose={onClose} title="Фидбэк по mock-собеседованию">
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
          {mut.isPending ? "Сохраняю…" : "Сохранить"}
        </button>
      </div>
    </Modal>
  );
}

// ============ Final stages ============

function FinalTab({
  studentId,
  progress,
}: {
  studentId: string;
  progress: { approved_blocks: number; total_active_blocks: number };
}) {
  const queryClient = useQueryClient();
  const finalsQ = useQuery({
    queryKey: ["student-finals", studentId],
    queryFn: () => studentFinals(studentId),
  });
  const [schedule, setSchedule] = useState<FinalCheck["type"] | null>(null);

  if (finalsQ.isLoading) return <PageLoader />;

  const finals = finalsQ.data ?? [];
  const tech = finals.find((f) => f.type === "final_technical");
  const roast = finals.find((f) => f.type === "final_roast");
  const allApproved =
    progress.total_active_blocks > 0 &&
    progress.approved_blocks >= progress.total_active_blocks;

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["student-finals", studentId] });

  return (
    <div>
      <div className="bl-note" style={{ marginBottom: 16 }}>
        <svg
          className="i"
          style={{ width: 15, height: 15 }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
        {allApproved
          ? "Все блоки подтверждены — финальные этапы доступны"
          : `Откроются после подтверждения всех блоков · сейчас закрыто ${progress.approved_blocks} из ${progress.total_active_blocks}`}
      </div>

      <div className="final">
        <FinalCard
          title="Финальная техничка"
          desc="Очное техническое интервью с разбором кода. Назначается один раз."
          icon={
            <path
              d="M8 3v4M16 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
            />
          }
          final={tech}
          studentId={studentId}
          type="final_technical"
          onSchedule={() => setSchedule("final_technical")}
          onChange={refetch}
        />
        <FinalCard
          title="Финальная прожарка"
          desc="Защита проекта перед комиссией. Назначается один раз после технички."
          icon={
            <path
              d="M12 3c3 4 6 5 6 9a6 6 0 0 1-12 0c0-1.5.6-2.6 1.4-3.6C8.2 10 9 11 10 11c0-2.5.5-5 2-8Z"
              strokeLinejoin="round"
            />
          }
          final={roast}
          studentId={studentId}
          type="final_roast"
          onSchedule={() => setSchedule("final_roast")}
          onChange={refetch}
        />
      </div>

      {schedule && (
        <ScheduleFinalModal
          studentId={studentId}
          type={schedule}
          onClose={() => setSchedule(null)}
          onDone={refetch}
        />
      )}
    </div>
  );
}

function FinalCard({
  title,
  desc,
  icon,
  final,
  studentId,
  type,
  onSchedule,
  onChange,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  final?: FinalCheck;
  studentId: string;
  type: FinalCheck["type"];
  onSchedule: () => void;
  onChange: () => void;
}) {
  const status = final?.status ?? "not_available";
  const locked = status === "not_available";
  const finished = status === "completed" || status === "failed";

  const completeMut = useMutation({
    mutationFn: (success: boolean) => completeFinal(studentId, type, success),
    onSuccess: onChange,
  });

  return (
    <div className={clsx("fc", locked && "locked")}>
      <div className="fct">
        <div className="ficon">
          <svg
            className="i"
            style={{ width: 20, height: 20 }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            {icon}
          </svg>
        </div>
        <h4>{title}</h4>
      </div>
      <div className="fd">{desc}</div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`pill ${finalPill(status)}`}>
          <span className="led" />
          {finalLabel(status)}
        </span>
        {final?.scheduled_at && (
          <span className="font-mono text-[11px] text-text-3">
            {formatDateTime(final.scheduled_at)}
          </span>
        )}
      </div>

      {locked && (
        <button className="btn" disabled style={{ width: "100%", justifyContent: "center" }}>
          Недоступно
        </button>
      )}

      {(status === "available" || status === "scheduled") && (
        <div className="flex gap-2">
          <button className="btn sm" onClick={onSchedule}>
            {final?.scheduled_at ? "Перенести" : "Назначить дату"}
          </button>
          <button
            className="btn secondary sm"
            disabled={completeMut.isPending}
            onClick={() => completeMut.mutate(true)}
          >
            Пройдено
          </button>
          <button
            className="btn sm"
            disabled={completeMut.isPending}
            onClick={() => completeMut.mutate(false)}
          >
            Не пройдено
          </button>
        </div>
      )}

      {finished && (
        <div className="caption text-text-3 normal-case font-sans tracking-normal">
          {status === "completed" ? "Этап пройден." : "Этап не пройден."}
          {final?.completed_at ? ` ${formatDate(final.completed_at)}` : ""}
        </div>
      )}
    </div>
  );
}

function finalPill(status: string): string {
  switch (status) {
    case "completed":
      return "approved";
    case "failed":
      return "failed";
    case "scheduled":
      return "pending";
    case "available":
      return "in-progress";
    default:
      return "not-started";
  }
}

function finalLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Пройдено";
    case "failed":
      return "Не пройдено";
    case "scheduled":
      return "Назначено";
    case "available":
      return "Доступно";
    default:
      return "Закрыто";
  }
}

function ScheduleFinalModal({
  studentId,
  type,
  onClose,
  onDone,
}: {
  studentId: string;
  type: FinalCheck["type"];
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
    <Modal
      open
      onClose={onClose}
      title={type === "final_technical" ? "Назначить техничку" : "Назначить прожарку"}
    >
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
        <button
          className="btn btn-primary"
          disabled={!dt || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Назначаю…" : "Назначить"}
        </button>
      </div>
    </Modal>
  );
}

// ============ Activity ============

function ActivityTab({ studentId }: { studentId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-activity", studentId],
    queryFn: () => listStudentActivity(studentId, 200),
  });

  if (isLoading)
    return (
      <div className="card card-pad flex justify-center">
        <Spinner />
      </div>
    );
  if (isError)
    return (
      <div className="card card-pad text-[13px] text-text-3">
        Не удалось загрузить активность.
      </div>
    );

  const items = data ?? [];
  if (items.length === 0)
    return (
      <div className="card card-pad text-[13px] text-text-3">
        История активности пуста.
      </div>
    );

  return (
    <div className="card card-pad">
      <div className="feed">
        {items.map((e) => (
          <div className="ev" key={e.id}>
            <span className={`dot ${activityDot(e.type)}`} />
            <div>
              <div className="tx">{activityLabel(e.type, e.metadata)}</div>
              <div className="tm">
                {formatDateTime(e.created_at)} · {relativeDays(e.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function activityDot(t: string): string {
  if (t.includes("approved") || t.includes("completed")) return "s";
  if (t.includes("material") || t.includes("viewed")) return "p";
  return "";
}

function activityLabel(t: string, meta: Record<string, unknown>): React.ReactNode {
  const title = typeof meta?.title === "string" ? meta.title : undefined;
  switch (t) {
    case "material_viewed":
      return (
        <>
          Просмотрен материал{title ? <> <b>«{title}»</b></> : ""}
        </>
      );
    case "block_approved":
      return (
        <>
          Блок{title ? <> <b>«{title}»</b></> : ""} подтверждён
        </>
      );
    case "block_waiting_confirmation":
      return (
        <>
          Отмечен последний материал блока{title ? <> <b>«{title}»</b></> : ""} — ждёт
          подтверждения
        </>
      );
    case "achievement_unlocked":
      return (
        <>
          Получено достижение{title ? <> <b>«{title}»</b></> : ""}
        </>
      );
    case "interview_added":
    case "interview_added_real":
      return <>Добавлено real-собеседование{meta?.company ? <> — <b>{String(meta.company)}</b></> : ""}</>;
    case "mock_created":
      return "Назначено mock-собеседование";
    case "mock_completed":
      return "Mock-собеседование завершено, оставлен фидбэк";
    case "interview_updated":
      return "Собеседование обновлено";
    case "final_scheduled":
      return "Финальный этап назначен";
    case "final_completed":
      return "Финальный этап пройден";
    case "final_failed":
      return "Финальный этап не пройден";
    default:
      return t;
  }
}

// ============ Profile ============

function ProfileTab({
  studentId,
  about,
  progress,
}: {
  studentId: string;
  about?: string;
  progress: {
    overall_percent: number;
    approved_blocks: number;
    total_active_blocks: number;
  };
}) {
  // Mock / Real счётчики — из реальных данных собеседований
  const ivQ = useQuery({
    queryKey: ["student-interviews", studentId],
    queryFn: () => studentInterviews(studentId),
  });
  const all = ivQ.data ?? [];
  const mockCount = all.filter((i) => i.type === "mock").length;
  const realCount = all.filter((i) => i.type === "real").length;

  return (
    <div className="cols c-1-1" style={{ alignItems: "start" }}>
      <div className="card card-pad">
        <div className="card-head">
          <h3>О себе</h3>
        </div>
        {about ? (
          <p
            style={{
              margin: 0,
              fontSize: "13.5px",
              color: "var(--ink-2)",
              lineHeight: 1.6,
            }}
          >
            {about}
          </p>
        ) : (
          <p className="text-[13px] text-text-3 m-0">Ученик ещё не заполнил «О себе».</p>
        )}
      </div>

      <div className="card card-pad">
        <div className="card-head">
          <h3>Сводка</h3>
        </div>
        <div
          className="bal-facts"
          style={{
            border: 0,
            padding: 0,
            margin: 0,
            flexWrap: "wrap",
            gap: "22px 30px",
          }}
        >
          <div className="f">
            <div className="k">Прогресс программы</div>
            <div className="n num">{progress.overall_percent}%</div>
          </div>
          <div className="f">
            <div className="k">Блоков подтверждено</div>
            <div className="n num">
              {progress.approved_blocks} / {progress.total_active_blocks}
            </div>
          </div>
          <div className="f">
            <div className="k">Mock / Real</div>
            <div className="n num">
              {ivQ.isLoading ? "…" : `${mockCount} / ${realCount}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

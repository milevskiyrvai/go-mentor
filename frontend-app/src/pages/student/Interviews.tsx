import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { addReal, interviewsCatalog, myInterviews } from "@/api/interviews";
import { PageLoader, Spinner } from "@/components/Spinner";
import { Modal } from "@/components/Modal";
import type { Interview } from "@/api/types";
import { useAuth } from "@/stores/auth";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function initials(name?: string): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function logoText(iv: Interview): string {
  if (iv.type === "mock") return "M";
  return initials(iv.company || "?");
}

function shortDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

const RESULT_PILL: Record<string, { cls: string; label: string }> = {
  offer: { cls: "offer", label: "Оффер" },
  reject: { cls: "reject", label: "Отказ" },
  pending: { cls: "pending", label: "В процессе" },
  no_result: { cls: "not-started", label: "Без результата" },
};

function stackChips(stack?: string): string[] {
  if (!stack) return [];
  return stack
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* page                                                               */
/* ------------------------------------------------------------------ */

export function StudentInterviews() {
  const [tab, setTab] = useState<"mine" | "catalog">("mine");
  const [addOpen, setAddOpen] = useState(false);

  const mineQ = useQuery({
    queryKey: ["interviews-mine"],
    queryFn: () => myInterviews(),
  });
  const catalogQ = useQuery({
    queryKey: ["interviews-catalog"],
    queryFn: () => interviewsCatalog(),
  });

  if (mineQ.isLoading || catalogQ.isLoading) return <PageLoader />;

  const mine = mineQ.data ?? [];
  const catalog = catalogQ.data ?? [];

  const real = mine.filter((i) => i.type === "real");
  const mock = mine.filter((i) => i.type === "mock");
  const offers = mine.filter((i) => i.result === "offer").length;

  const hasError = mineQ.isError || catalogQ.isError;

  return (
    <div>
      {/* ============ PAGE HEAD ============ */}
      <div className="page-head mb-6">
        <div>
          <h1>Собеседования</h1>
          <div className="sub">
            <b className="num">{real.length}</b> real ·{" "}
            <b className="num">{mock.length}</b> mock ·{" "}
            <b className="num">{offers}</b>{" "}
            {offers === 1 ? "оффер" : "офферов"}
          </div>
        </div>
        <div className="right">
          <button className="btn secondary" onClick={() => setAddOpen(true)}>
            <svg
              className="i"
              style={{ width: 16, height: 16 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Добавить real
          </button>
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div className="tabs mb-6">
        <button
          type="button"
          className={`tab ${tab === "mine" ? "active" : ""}`}
          onClick={() => setTab("mine")}
        >
          Мои <span className="c num">{mine.length}</span>
        </button>
        <button
          type="button"
          className={`tab ${tab === "catalog" ? "active" : ""}`}
          onClick={() => setTab("catalog")}
        >
          Общий каталог <span className="c num">{catalog.length}</span>
        </button>
      </div>

      {hasError && (
        <div className="card p-5 mb-5 text-[13px] text-danger border-danger/40">
          Не удалось загрузить данные собеседований. Обновите страницу или
          попробуйте позже.
        </div>
      )}

      {/* ============ TAB: MINE ============ */}
      {tab === "mine" && (
        <div>
          {mine.length === 0 && !hasError && (
            <EmptyState
              title="Собеседований пока нет"
              text="Real-собеседования добавляете вы сами, mock-собеседования назначает Buddy."
              action={
                <button
                  className="btn secondary"
                  onClick={() => setAddOpen(true)}
                >
                  Добавить real
                </button>
              }
            />
          )}

          {/* --- Real group --- */}
          {real.length > 0 && (
            <div className="iv-group">
              <div className="gh">
                <span className="gt">Real</span>
                <span className="gc">
                  добавляешь сам · видны в общем каталоге
                </span>
                <span className="ln" />
              </div>
              {real.map((iv) => (
                <InterviewRow key={iv.id} iv={iv} />
              ))}
            </div>
          )}

          {/* --- Mock group --- */}
          {mock.length > 0 && (
            <div className="iv-group">
              <div className="gh">
                <span className="gt">Mock</span>
                <span className="gc">назначает и проверяет Buddy</span>
                <span className="ln" />
              </div>
              {mock.map((iv) => (
                <InterviewRow key={iv.id} iv={iv} showFeedback />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB: CATALOG ============ */}
      {tab === "catalog" && (
        <div>
          {catalog.length === 0 && !hasError ? (
            <EmptyState
              title="В каталоге пока пусто"
              text="Здесь появятся real-собеседования всех учеников платформы."
            />
          ) : (
            <div className="iv-group">
              <div className="gh">
                <span className="gt">Real-собеседования всех учеников</span>
                <span className="gc">
                  {catalog.length}{" "}
                  {catalog.length === 1 ? "запись" : "записей"} · имена
                  кликабельны
                </span>
                <span className="ln" />
              </div>
              {catalog.map((iv) => (
                <InterviewRow key={iv.id} iv={iv} catalog />
              ))}
            </div>
          )}
        </div>
      )}

      <AddRealModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* interview row                                                      */
/* ------------------------------------------------------------------ */

function InterviewRow({
  iv,
  showFeedback,
  catalog,
}: {
  iv: Interview;
  showFeedback?: boolean;
  catalog?: boolean;
}) {
  const me = useAuth((s) => s.user);
  const role = useAuth((s) => s.selectedRole);
  const profileBase = role === "buddy" ? "/buddy" : "/student";

  const isMock = iv.type === "mock";
  const result = iv.result ? RESULT_PILL[iv.result] : undefined;
  const chips = stackChips(iv.stack);
  const date = shortDate(iv.date);
  const authorName =
    catalog && me && iv.student_id === me.id
      ? me.display_name
      : undefined;

  return (
    <div className="iv">
      <div className="iv-head">
        <div className={`iv-logo ${isMock ? "mock" : ""}`}>{logoText(iv)}</div>

        <div className="iv-tt">
          <h4>
            {isMock ? (
              <>Mock{iv.position ? ` · ${iv.position}` : ""}</>
            ) : (
              <>
                {iv.company || "Компания не указана"}
                {iv.position && <span className="pos"> · {iv.position}</span>}
              </>
            )}
          </h4>

          <div className="iv-meta">
            {catalog && (
              <Link
                to={`${profileBase}/users/${iv.student_id}`}
                className="iv-author"
              >
                {authorName ?? "Профиль ученика"}
              </Link>
            )}
            {isMock && iv.buddy_id && !catalog && (
              <span className="iv-chip">Buddy</span>
            )}
            {iv.grade && <span className="iv-chip grade">{iv.grade}</span>}
            {chips.map((c) => (
              <span key={c} className="iv-chip">
                {c}
              </span>
            ))}
            {date && <span className="iv-date">· {date}</span>}
          </div>
        </div>

        {result ? (
          <span className={`pill ${result.cls}`}>
            <span className="led" />
            {result.label}
          </span>
        ) : isMock ? (
          <span className="pill completed">
            <span className="led" />
            {iv.status === "completed" ? "Завершён" : "Назначен"}
          </span>
        ) : (
          <span className="pill not-started">
            <span className="led" />
            Без результата
          </span>
        )}
      </div>

      {/* mock feedback */}
      {showFeedback && iv.feedback && (
        <div className="iv-fb">
          <div className="who">
            <span className="ava">ИМ</span>
            Фидбэк Buddy
          </div>
          <p>{iv.feedback}</p>
        </div>
      )}

      {/* real разбор link */}
      {!isMock && iv.url && (
        <div className="iv-fb" style={{ marginTop: 11 }}>
          <a
            href={iv.url}
            target="_blank"
            rel="noreferrer"
            className="iv-author"
            style={{ fontSize: 12.5 }}
          >
            Открыть разбор собеседования ↗
          </a>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flat p-10 text-center">
      <div className="text-[15px] font-bold mb-1.5">{title}</div>
      <div className="text-[13px] text-text-2 max-w-md mx-auto mb-4">{text}</div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* add real modal (логика из рабочей версии)                          */
/* ------------------------------------------------------------------ */

function AddRealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [grade, setGrade] = useState("");
  const [stack, setStack] = useState("");
  const [date, setDate] = useState("");
  const [result, setResult] = useState<
    "" | "offer" | "reject" | "pending" | "no_result"
  >("");
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      addReal({
        url: url.trim(),
        company: company.trim() || undefined,
        position: position.trim() || undefined,
        grade: grade.trim() || undefined,
        stack: stack.trim() || undefined,
        date: date ? new Date(date).toISOString() : undefined,
        result: result || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews-mine"] });
      queryClient.invalidateQueries({ queryKey: ["interviews-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      setUrl("");
      setCompany("");
      setPosition("");
      setGrade("");
      setStack("");
      setDate("");
      setResult("");
      setError(null);
      onClose();
    },
    onError: () =>
      setError("Не удалось добавить собеседование. Проверьте URL."),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить real-собеседование"
      width={580}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="caption mb-1.5 block">URL разбора *</label>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Компания</label>
          <input
            className="input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Ozon"
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Позиция</label>
          <input
            className="input"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Go Developer"
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Grade</label>
          <input
            className="input"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Middle"
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Стек</label>
          <input
            className="input"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="Go, PostgreSQL, gRPC"
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Дата</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Результат</label>
          <div className="select" style={{ width: "100%" }}>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as typeof result)}
            >
              <option value="">не указан</option>
              <option value="offer">Оффер</option>
              <option value="reject">Отказ</option>
              <option value="pending">В процессе</option>
              <option value="no_result">Без результата</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-[12px] px-3 py-2 rounded-md border border-danger/40 bg-danger/10 text-danger mt-4">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button
          className="btn secondary"
          disabled={mut.isPending || !url.trim()}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? <Spinner size={16} /> : "Добавить"}
        </button>
      </div>
    </Modal>
  );
}

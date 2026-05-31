import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addReal,
  interviewsCatalog,
  myInterviews,
} from "@/api/interviews";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import type { Interview } from "@/api/types";
import { formatDate } from "@/lib/format";
import { Link } from "react-router-dom";
import { useAuth } from "@/stores/auth";

export function StudentInterviews() {
  const [tab, setTab] = useState<"mine" | "catalog">("mine");
  const [mineType, setMineType] = useState<"all" | "mock" | "real">("all");
  const [addOpen, setAddOpen] = useState(false);

  const mineQ = useQuery({ queryKey: ["interviews-mine"], queryFn: () => myInterviews() });
  const catalogQ = useQuery({
    queryKey: ["interviews-catalog"],
    queryFn: () => interviewsCatalog(),
  });

  if (mineQ.isLoading || catalogQ.isLoading) return <PageLoader />;

  const mine = mineQ.data ?? [];
  const filtered =
    mineType === "all" ? mine : mine.filter((i) => i.type === mineType);
  const catalog = catalogQ.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Карьера"
        title="Собеседования"
        description="Mock-собеседования назначает Buddy. Real-собеседования вы добавляете сами — они попадают в общий каталог."
        right={
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            + Добавить real
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <SegBtn active={tab === "mine"} onClick={() => setTab("mine")}>
          Мои ({mine.length})
        </SegBtn>
        <SegBtn active={tab === "catalog"} onClick={() => setTab("catalog")}>
          Общий каталог ({catalog.length})
        </SegBtn>
      </div>

      {tab === "mine" && (
        <>
          <div className="flex items-center gap-2 mb-5">
            <PillBtn active={mineType === "all"} onClick={() => setMineType("all")}>
              Все
            </PillBtn>
            <PillBtn active={mineType === "mock"} onClick={() => setMineType("mock")}>
              Mock ({mine.filter((i) => i.type === "mock").length})
            </PillBtn>
            <PillBtn active={mineType === "real"} onClick={() => setMineType("real")}>
              Real ({mine.filter((i) => i.type === "real").length})
            </PillBtn>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="card p-8 text-center text-text-3 text-[13px]">
                Пока нет собеседований выбранного типа.
              </div>
            )}
            {filtered.map((iv) => (
              <InterviewRow key={iv.id} iv={iv} showFeedback />
            ))}
          </div>
        </>
      )}

      {tab === "catalog" && (
        <div className="space-y-3">
          {catalog.length === 0 && (
            <div className="card p-8 text-center text-text-3 text-[13px]">
              В каталоге пока нет real-собеседований.
            </div>
          )}
          {catalog.map((iv) => (
            <InterviewRow key={iv.id} iv={iv} catalog />
          ))}
        </div>
      )}

      <AddRealModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`btn ${active ? "btn-primary" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PillBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`btn btn-sm ${active ? "btn-primary" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function InterviewRow({
  iv,
  showFeedback,
  catalog,
}: {
  iv: Interview;
  showFeedback?: boolean;
  catalog?: boolean;
}) {
  const role = useAuth((s) => s.selectedRole);
  const profileBase = role === "buddy" ? "/buddy" : "/student";
  const typeColor =
    iv.type === "mock"
      ? "color-mix(in oklab, var(--secondary) 26%, transparent)"
      : "color-mix(in oklab, var(--primary) 28%, transparent)";

  return (
    <div className="elevated p-5">
      <div className="flex items-start gap-4">
        <div
          className="w-1 self-stretch rounded-full"
          style={{ background: typeColor, minHeight: 48 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`pill ${iv.type === "mock" ? "border-secondary/40 text-secondary" : "required"}`}
            >
              {iv.type === "mock" ? "Mock" : "Real"}
            </span>
            <StatusBadge status={iv.status} />
            {iv.result && (
              <span className="pill">
                {iv.result === "offer" ? "Оффер 🟢" : iv.result === "reject" ? "Отказ" : iv.result}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[15px] font-semibold">
              {iv.company || "Компания не указана"}
            </span>
            {iv.position && <span className="text-text-2 text-[13px]">· {iv.position}</span>}
            {iv.grade && <span className="text-text-2 text-[13px]">· {iv.grade}</span>}
          </div>
          {iv.stack && <div className="text-[12px] text-text-2 mb-1">Стек: {iv.stack}</div>}
          {iv.date && (
            <div className="font-mono text-[11px] text-text-3 uppercase tracking-wider">
              {formatDate(iv.date)}
            </div>
          )}
          {showFeedback && iv.feedback && (
            <div className="mt-3 p-3 rounded-md bg-bg border border-border">
              <div className="caption mb-1">Фидбэк от Buddy</div>
              <div className="text-[13px] text-text leading-snug whitespace-pre-line">
                {iv.feedback}
              </div>
            </div>
          )}
          {catalog && (
            <div className="mt-2 caption">
              <Link className="hover:text-primary" to={`${profileBase}/users/${iv.student_id}`}>
                Профиль ученика →
              </Link>
            </div>
          )}
        </div>
        {iv.url && (
          <a
            href={iv.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm self-start"
          >
            Открыть ↗
          </a>
        )}
      </div>
    </div>
  );
}

function AddRealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [grade, setGrade] = useState("");
  const [stack, setStack] = useState("");
  const [date, setDate] = useState("");
  const [result, setResult] = useState<"" | "offer" | "reject" | "pending" | "no_result">("");
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
    onError: () => setError("Не удалось добавить собеседование. Проверьте URL."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Добавить real-собеседование" width={580}>
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
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Avito" />
        </div>
        <div>
          <label className="caption mb-1.5 block">Позиция</label>
          <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Go Developer" />
        </div>
        <div>
          <label className="caption mb-1.5 block">Grade</label>
          <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Middle" />
        </div>
        <div>
          <label className="caption mb-1.5 block">Стек</label>
          <input className="input" value={stack} onChange={(e) => setStack(e.target.value)} placeholder="Go, Postgres, gRPC" />
        </div>
        <div>
          <label className="caption mb-1.5 block">Дата</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Результат</label>
          <select className="select" value={result} onChange={(e) => setResult(e.target.value as any)}>
            <option value="">не указан</option>
            <option value="offer">Оффер</option>
            <option value="reject">Отказ</option>
            <option value="pending">В процессе</option>
            <option value="no_result">Без результата</option>
          </select>
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
          className="btn btn-primary"
          disabled={mut.isPending || !url.trim()}
          onClick={() => mut.mutate()}
        >
          Добавить
        </button>
      </div>
    </Modal>
  );
}

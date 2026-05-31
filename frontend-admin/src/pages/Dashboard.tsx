import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { getAdminStats } from "@/api/stats";
import { listUsers } from "@/api/users";
import {
  listOneOnOne,
  approveOneOnOne,
  rejectOneOnOne,
} from "@/api/oneOnOne";
import type { OneOnOneRequest, UserListItem } from "@/api/types";
import { getApiErrorCode } from "@/api/client";

/* =========================================================================
   Admin Дашборд — метрики §22 + очередь заявок 1×1.
   Вёрстка повторяет design-output/screens/admin-dashboard.html
   (тема «мягкий шалфей», вариант B). Данные ТОЛЬКО из API.
   ========================================================================= */

export function DashboardPage() {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const statsQ = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
  });

  // Полный список заявок pending для очереди одобрения (не только recent из stats).
  const pendingQ = useQuery({
    queryKey: ["admin", "one-on-one", "pending"],
    queryFn: () => listOneOnOne("pending"),
  });

  // Справочник пользователей для резолва имён в заявках/событиях.
  const usersQ = useQuery({
    queryKey: ["admin", "users-lookup-for-dashboard"],
    queryFn: () => listUsers({ include_deleted: true }),
  });

  const userById = (id: string): UserListItem | undefined =>
    usersQ.data?.find((u) => u.id === id);

  const userName = (id: string) => {
    const u = userById(id);
    return u?.display_name ?? u?.login ?? `${id.slice(0, 8)}…`;
  };

  const actMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      action === "approve" ? approveOneOnOne(id) : rejectOneOnOne(id),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "one-on-one"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (err) => {
      const code = getApiErrorCode(err);
      setActionError(
        code === "insufficient_funds"
          ? "У ученика недостаточно бонусов (нужно 1000)"
          : code === "invalid_status"
          ? "Заявка уже обработана — обновите страницу"
          : "Не удалось выполнить действие"
      );
    },
  });

  const pendingItems = pendingQ.data ?? [];
  const pendingCount = statsQ.data?.one_on_one_pending ?? pendingItems.length;

  // Лента событий платформы строится из РЕАЛЬНЫХ данных stats.recent_one_on_one
  // (отдельного admin-эндпоинта активности в API нет — не выдумываем).
  const events: ActivityEvent[] = (statsQ.data?.recent_one_on_one ?? [])
    .slice(0, 6)
    .map((r) => {
      const when = r.processed_at ?? r.updated_at ?? r.created_at;
      const name = userName(r.student_id);
      const dot: ActivityEvent["dot"] =
        r.status === "approved" || r.status === "completed"
          ? "primary"
          : r.status === "rejected" || r.status === "cancelled"
          ? "neutral"
          : "secondary";
      const text =
        r.status === "pending" ? (
          <>
            Новая заявка 1×1 от <b>{name}</b> ждёт решения
          </>
        ) : r.status === "approved" ? (
          <>
            Заявка 1×1 <b>{name}</b> одобрена · −1 000 бонусов
          </>
        ) : r.status === "completed" ? (
          <>
            Сессия 1×1 с <b>{name}</b> проведена
          </>
        ) : r.status === "rejected" ? (
          <>
            Заявка 1×1 <b>{name}</b> отклонена
          </>
        ) : (
          <>
            Заявка 1×1 <b>{name}</b> отменена
          </>
        );
      return {
        id: r.id,
        dot,
        text,
        time: new Date(when).toLocaleString("ru-RU", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });

  const today = new Date();
  const dayNum = today.toLocaleDateString("ru-RU", { day: "numeric" });
  const monthYear = today.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  return (
    <>
      <Crumbs
        segments={[
          { label: "GO_MENTOR", to: "/admin/dashboard" },
          { label: "ADMIN", to: "/admin/dashboard" },
        ]}
        liveSegment="ДАШБОРД"
      />
      <PageHead
        eyebrow="ADMIN · DASHBOARD"
        title="Обзор платформы"
        description={
          <>
            Сводка по платформе на <b className="font-mono">{dayNum}</b> {monthYear}.
            Метрики и очередь заявок обновляются из базы в реальном времени.
          </>
        }
        right={
          <Button variant="ghost" disabled>
            Экспорт отчёта
          </Button>
        }
      />

      {/* ===== Метрики §22 ===== */}
      <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
        <StatCard
          label="Пользователи"
          value={statsQ.data?.users_total}
          unit="всего"
          foot={
            statsQ.isLoading
              ? null
              : `${statsQ.data?.students_count ?? 0} студентов · ${
                  statsQ.data?.buddies_count ?? 0
                } Buddy · ${statsQ.data?.admins_count ?? 0} админа`
          }
          loading={statsQ.isLoading}
        />
        <StatCard
          label="Достижений выдано"
          value={statsQ.data?.achievements_awarded_total}
          unit="всего"
          foot={
            statsQ.isLoading
              ? null
              : `${statsQ.data?.deleted_count ?? 0} удалённых аккаунтов (soft)`
          }
          loading={statsQ.isLoading}
        />
        <StatCard
          accent
          label="Заявки 1×1 ждут"
          value={pendingCount}
          unit="на одобрении"
          foot="Бонусы спишутся после вашего решения"
          loading={statsQ.isLoading}
        />
      </div>

      {/* ===== Hero-action: очередь одобрения ===== */}
      <div
        className="flex items-center gap-4 p-4 rounded-lg max-[640px]:flex-col max-[640px]:items-start"
        style={{
          background: "var(--secondary-soft)",
          border: "1px solid transparent",
        }}
      >
        <div
          className="w-11 h-11 rounded-md grid place-items-center flex-shrink-0"
          style={{ background: "var(--surface)", color: "var(--secondary)" }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9.5 10.5h3.2a1.8 1.8 0 0 1 0 3.6H9.5" strokeLinecap="round" />
            <path d="M12 8v8" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-text font-bold text-[14px]">
            {pendingCount > 0
              ? `${pendingCount} ${plural(pendingCount, "заявка", "заявки", "заявок")} 1×1 ${plural(
                  pendingCount,
                  "ждёт",
                  "ждут",
                  "ждут"
                )} одобрения`
              : "Очередь заявок 1×1 пуста"}
          </div>
          <div className="text-text-2 text-[12.5px] leading-[1.5] mt-0.5">
            При одобрении с баланса ученика списывается 1 000 бонусов. Отклонённые
            заявки бонусы не трогают.
          </div>
        </div>
        <Link to="/admin/one-on-one" className="flex-shrink-0">
          <Button className="btn-base btn-secondary" arrow>
            К заявкам
          </Button>
        </Link>
      </div>

      {actionError && (
        <div
          className="text-[13px] px-3 py-2 rounded-md"
          style={{
            color: "var(--danger)",
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
          }}
        >
          {actionError}
        </div>
      )}

      {/* ===== Две колонки: очередь заявок 1×1 + события платформы ===== */}
      <div className="grid gap-3.5 items-start grid-cols-[2fr_1fr] max-[1024px]:grid-cols-1">
        {/* --- Очередь заявок 1×1 --- */}
        <section className="card-base p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="m-0 text-[14px] font-bold tracking-tight flex-1">
              Очередь заявок 1×1
            </h3>
            <span
              className="font-mono uppercase tracking-wider"
              style={{ fontSize: "11px", color: "var(--ink-3)" }}
            >
              {pendingQ.isLoading ? "…" : `${pendingItems.length} ожидают`}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {pendingQ.isLoading && (
              <div className="p-8 text-center text-text-3">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-primary border-t-transparent spin" />
              </div>
            )}

            {pendingQ.isError && !pendingQ.isLoading && (
              <div
                className="p-4 text-center text-[12px] rounded-md"
                style={{
                  color: "var(--danger)",
                  background: "var(--danger-soft)",
                  border: "1px solid var(--danger)",
                }}
              >
                Не удалось загрузить очередь заявок
              </div>
            )}

            {!pendingQ.isLoading &&
              !pendingQ.isError &&
              pendingItems.length === 0 && (
                <div
                  className="p-6 text-center rounded-md"
                  style={{ background: "var(--bg)", border: "1px dashed var(--line)" }}
                >
                  <div className="text-text-2 text-[13px] font-semibold">
                    Заявок на одобрении нет
                  </div>
                  <div className="text-text-3 text-[12px] mt-1">
                    Новые запросы учеников появятся здесь.
                  </div>
                </div>
              )}

            {pendingItems.map((r) => (
              <OneOnOneRow
                key={r.id}
                req={r}
                studentName={userName(r.student_id)}
                onApprove={() => actMut.mutate({ id: r.id, action: "approve" })}
                onReject={() => actMut.mutate({ id: r.id, action: "reject" })}
                busy={actMut.isPending && actMut.variables?.id === r.id}
              />
            ))}
          </div>
        </section>

        {/* --- События платформы --- */}
        <section className="card-base p-4 flex flex-col gap-3 min-h-[260px]">
          <div className="flex items-center gap-2.5">
            <h3 className="m-0 text-[14px] font-bold tracking-tight flex-1">
              События платформы
            </h3>
          </div>

          <div className="flex flex-col gap-0 flex-1">
            {statsQ.isLoading && (
              <div className="p-6 text-center text-text-3">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent spin" />
              </div>
            )}

            {!statsQ.isLoading && events.length === 0 && (
              <div
                className="p-5 text-center rounded-md mt-1"
                style={{ background: "var(--bg)", border: "1px dashed var(--line)" }}
              >
                <div className="text-text-2 text-[12.5px] font-semibold">
                  Событий пока нет
                </div>
                <div className="text-text-3 text-[11.5px] mt-1">
                  Действия по заявкам 1×1 появятся в ленте.
                </div>
              </div>
            )}

            {!statsQ.isLoading &&
              events.map((ev) => (
                <ActivityRow key={ev.id} dot={ev.dot} text={ev.text} time={ev.time} />
              ))}
          </div>

          <div
            className="mt-auto pt-3.5 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <span
              className="font-mono"
              style={{ fontSize: "12px", color: "var(--ink-3)", fontWeight: 600 }}
            >
              Лента активности
            </span>
            <Link to="/admin/analytics">
              <Button size="sm" variant="ghost">
                Аналитика
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------- Метрика §22 ---------- */

function StatCard({
  label,
  value,
  unit,
  foot,
  accent,
  loading,
}: {
  label: string;
  value?: number | string;
  unit?: string;
  foot?: string | null;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-[18px] flex flex-col gap-1.5 relative overflow-hidden"
      style={
        accent
          ? {
              background: "var(--secondary-soft)",
              border: "1px solid transparent",
            }
          : { background: "var(--surface)", border: "1px solid var(--line)" }
      }
    >
      <div
        className="font-mono uppercase tracking-[0.1em]"
        style={{ fontSize: "10.5px", color: accent ? "var(--secondary)" : "var(--ink-3)" }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono font-bold text-text"
          style={{ fontSize: "30px", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          {loading ? "—" : value ?? "—"}
        </span>
        {unit && (
          <span className="text-text-3 text-[12px]" style={{ fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
      {foot && (
        <div className="text-[12px]" style={{ color: "var(--ink-3)" }}>
          {foot}
        </div>
      )}
    </div>
  );
}

/* ---------- Строка очереди 1×1 ---------- */

function OneOnOneRow({
  req,
  studentName,
  onApprove,
  onReject,
  busy,
}: {
  req: OneOnOneRequest;
  studentName: string;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}) {
  const created = new Date(req.created_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-md max-[560px]:flex-wrap"
      style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
    >
      <div
        className="w-9 h-9 rounded-md grid place-items-center font-mono font-bold flex-shrink-0"
        style={{
          fontSize: "11px",
          background: "var(--secondary-soft)",
          color: "var(--secondary)",
        }}
      >
        1×1
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-text text-[13px] font-semibold truncate">
          Сессия 1×1 с ментором
        </div>
        <div className="text-text-3 text-[12px] truncate">
          {studentName} · {created} · −1 000 при одобрении
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge kind="pending">pending</StatusBadge>
        <Button size="sm" variant="ghost" onClick={onReject} disabled={busy}>
          Отклонить
        </Button>
        <Button
          size="sm"
          className="btn-base btn-secondary"
          onClick={onApprove}
          disabled={busy}
        >
          {busy ? "…" : "Одобрить"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Строка ленты событий ---------- */

interface ActivityEvent {
  id: string;
  dot: "primary" | "secondary" | "neutral";
  text: React.ReactNode;
  time: string;
}

function ActivityRow({
  dot,
  text,
  time,
}: {
  dot: "primary" | "secondary" | "neutral";
  text: React.ReactNode;
  time: string;
}) {
  const dotColor =
    dot === "primary"
      ? "var(--primary)"
      : dot === "secondary"
      ? "var(--secondary)"
      : "var(--ink-3)";
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderTop: "1px solid var(--line)" }}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
        style={{ background: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-text text-[12.5px] leading-[1.5]">{text}</div>
        <div className="font-mono text-[10.5px] mt-0.5" style={{ color: "var(--ink-3)" }}>
          {time}
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

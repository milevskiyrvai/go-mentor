import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  listOneOnOne,
  approveOneOnOne,
  rejectOneOnOne,
  completeOneOnOne,
  cancelOneOnOne,
} from "@/api/oneOnOne";
import { listUsers } from "@/api/users";
import type { OneOnOneStatus } from "@/api/types";
import { getApiErrorCode } from "@/api/client";
import clsx from "clsx";

const STATUS_FILTERS: { value: "" | OneOnOneStatus; label: string }[] = [
  { value: "", label: "Все" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export function OneOnOnePage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | OneOnOneStatus>("");
  const [error, setError] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "one-on-one", status],
    queryFn: () => listOneOnOne(status),
  });

  const usersQ = useQuery({
    queryKey: ["admin", "users-lookup-for-one-on-one"],
    queryFn: () => listUsers({ include_deleted: true }),
  });

  const userById = (id: string) => usersQ.data?.find((u) => u.id === id);

  const onAction = (id: string, action: "approve" | "reject" | "complete" | "cancel") => {
    setError(null);
    const fn =
      action === "approve"
        ? approveOneOnOne
        : action === "reject"
        ? rejectOneOnOne
        : action === "complete"
        ? completeOneOnOne
        : cancelOneOnOne;
    fn(id)
      .then(() => qc.invalidateQueries({ queryKey: ["admin", "one-on-one"] }))
      .catch((err) => {
        const code = getApiErrorCode(err);
        setError(
          code === "insufficient_funds"
            ? "У студента недостаточно бонусов (нужно 1000)"
            : code === "invalid_status"
            ? "Действие недоступно в текущем статусе"
            : "Не удалось выполнить действие"
        );
      });
  };

  const items = listQ.data ?? [];

  return (
    <>
      <Crumbs segments={[{ label: "GO_MENTOR", to: "/admin/dashboard" }, { label: "ADMIN", to: "/admin/dashboard" }]} liveSegment="ЗАЯВКИ 1×1" />
      <PageHead
        eyebrow="ADMIN · 1×1 REQUESTS"
        title="Заявки 1×1"
        description={
          <>
            Курс <b>1 заявка = 1000 бонусов</b>. При <b>approve</b> бонусы списываются
            автоматически (если хватает баланса).
          </>
        }
      />

      {error && (
        <div
          className="text-[13px] px-3 py-2 rounded-md"
          style={{
            color: "var(--danger)",
            background: "rgba(255,91,91,0.08)",
            border: "1px solid rgba(255,91,91,0.3)",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="flex items-center gap-2.5 p-2.5 rounded-lg"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="h-7 px-2 inline-flex items-center rounded-md font-mono uppercase tracking-wider"
          style={{
            fontSize: "10px",
            color: "var(--text-3)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          статус:
        </span>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={clsx(
              "h-7 px-2.5 rounded-md text-[12px] cursor-pointer transition-colors",
              status === s.value ? "" : "text-text-2 hover:border-border-bright"
            )}
            style={
              status === s.value
                ? {
                    color: "var(--warning)",
                    border: "1px solid rgba(255,219,61,0.4)",
                    background: "rgba(255,219,61,0.08)",
                    boxShadow: "0 0 14px -8px var(--warning)",
                  }
                : { border: "1px solid var(--border)", background: "var(--bg)" }
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <section
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <table
          className="w-full"
          style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: "13px" }}
        >
          <thead>
            <tr>
              <Th>Студент</Th>
              <Th width="120px">Стоимость</Th>
              <Th width="140px">Создано</Th>
              <Th width="140px">Обработано</Th>
              <Th width="120px">Статус</Th>
              <Th width="320px" align="right">Действия</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-3">
                  <span className="inline-block w-5 h-5 rounded-full border-2 border-warning border-t-transparent spin" />
                </td>
              </tr>
            )}
            {!listQ.isLoading && items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-text-3 font-mono uppercase tracking-wider"
                  style={{ fontSize: "11px" }}
                >
                  Заявок нет
                </td>
              </tr>
            )}
            {items.map((r) => {
              const u = userById(r.student_id);
              return (
                <tr key={r.id}>
                  <td className="px-3.5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="flex flex-col">
                      <b className="text-[13px] font-semibold">
                        {u?.display_name ?? r.student_id.slice(0, 8)}
                      </b>
                      <small className="font-mono text-text-3 text-[10.5px] mt-0.5">
                        {u?.telegram_username ? `@${u.telegram_username}` : u?.login ?? ""}
                      </small>
                    </div>
                  </td>
                  <td className="px-3.5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span
                      className="font-mono font-bold inline-flex items-center gap-1.5"
                      style={{ fontSize: "13px" }}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 30%, rgba(255,219,61,0.9), var(--warning) 70%)",
                          boxShadow: "0 0 10px rgba(255,219,61,0.4)",
                        }}
                      />
                      1000
                    </span>
                  </td>
                  <td
                    className="px-3.5 py-3 font-mono"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      fontSize: "12px",
                      color: "var(--text-2)",
                    }}
                  >
                    {new Date(r.created_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td
                    className="px-3.5 py-3 font-mono"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      fontSize: "12px",
                      color: "var(--text-2)",
                    }}
                  >
                    {r.processed_at
                      ? new Date(r.processed_at).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3.5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <StatusBadge kind={r.status}>{r.status}</StatusBadge>
                  </td>
                  <td
                    className="px-3.5 py-3 text-right"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    {r.status === "pending" && (
                      <>
                        <ActionBtn onClick={() => onAction(r.id, "approve")}>approve</ActionBtn>
                        <ActionBtn onClick={() => onAction(r.id, "reject")} danger>
                          reject
                        </ActionBtn>
                      </>
                    )}
                    {r.status === "approved" && (
                      <>
                        <ActionBtn onClick={() => onAction(r.id, "complete")}>complete</ActionBtn>
                        <ActionBtn onClick={() => onAction(r.id, "cancel")} danger>
                          cancel
                        </ActionBtn>
                      </>
                    )}
                    {(r.status === "completed" || r.status === "rejected" || r.status === "cancelled") && (
                      <span
                        className="font-mono"
                        style={{ fontSize: "10.5px", color: "var(--text-3)" }}
                      >
                        нет действий
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Th({
  children,
  width,
  align,
}: {
  children: React.ReactNode;
  width?: string;
  align?: "right";
}) {
  return (
    <th
      style={{
        textAlign: align ?? "left",
        fontFamily: "var(--mono)",
        fontSize: "10px",
        color: "var(--text-3)",
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        width,
      }}
    >
      {children}
    </th>
  );
}

function ActionBtn({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[26px] px-2.5 rounded-md font-mono cursor-pointer ml-1 transition-colors"
      style={{
        fontSize: "11px",
        letterSpacing: "0.06em",
        textTransform: "lowercase",
        color: danger ? "var(--danger)" : "var(--warning)",
        border: danger ? "1px solid rgba(255,91,91,0.4)" : "1px solid rgba(255,219,61,0.4)",
        background: danger ? "rgba(255,91,91,0.06)" : "rgba(255,219,61,0.06)",
      }}
    >
      {children}
    </button>
  );
}

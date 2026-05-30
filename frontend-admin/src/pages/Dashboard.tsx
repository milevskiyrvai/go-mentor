import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { StatusBadge } from "@/components/StatusBadge";
import { getAdminStats } from "@/api/stats";
import { listUsers } from "@/api/users";
import type { OneOnOneStatus } from "@/api/types";

type Tile = {
  label: string;
  value: number | string;
  variant?: "primary" | "pink" | "warn" | "pending";
  foot?: string;
};

const STATUS_TO_BADGE: Record<OneOnOneStatus, "pending" | "approved" | "rejected" | "completed" | "cancelled"> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  completed: "completed",
  cancelled: "cancelled",
};

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
  });

  const studentsLookup = useQuery({
    queryKey: ["admin", "users-lookup-for-dashboard"],
    queryFn: () => listUsers({ include_deleted: true }),
  });

  const userById = (id: string) =>
    studentsLookup.data?.find((u) => u.id === id);

  const tiles: Tile[] = [
    {
      label: "Пользователей",
      value: stats.data?.users_total ?? "—",
    },
    {
      label: "Студентов",
      value: stats.data?.students_count ?? "—",
      variant: "primary",
    },
    {
      label: "Buddy",
      value: stats.data?.buddies_count ?? "—",
      variant: "pink",
    },
    {
      label: "Admin",
      value: stats.data?.admins_count ?? "—",
      variant: "warn",
    },
    {
      label: "Заявок 1×1 ждут",
      value: stats.data?.one_on_one_pending ?? "—",
      variant: "pending",
      foot: "требуют решения",
    },
    {
      label: "Ачивок выдано",
      value: stats.data?.achievements_awarded_total ?? "—",
    },
  ];

  return (
    <>
      <Crumbs segments={[{ label: "GO_MENTOR", to: "/admin/dashboard" }, { label: "ADMIN", to: "/admin/dashboard" }]} liveSegment="ДАШБОРД" />
      <PageHead
        eyebrow="ADMIN · DASHBOARD"
        title="Admin Panel"
        description={
          <>
            Полный обзор платформы. Метрики обновляются в реальном времени из базы данных.
          </>
        }
        right={
          <div className="flex items-center gap-2.5">
            <span
              className="px-3 h-8 inline-flex items-center gap-2 rounded-md font-mono uppercase tracking-wider"
              style={{
                fontSize: "10px",
                color: "var(--text-3)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--success)", boxShadow: "0 0 8px var(--success)" }}
              />
              NODE · MSK1
            </span>
            <span
              className="px-3 h-8 inline-flex items-center rounded-md font-mono uppercase tracking-wider"
              style={{
                fontSize: "10px",
                color: "var(--text-3)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              v0.1.0
            </span>
          </div>
        }
      />

      {/* Metric tiles */}
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>

      {/* Recent 1×1 + Stub widgets */}
      <div className="grid grid-cols-2 gap-3.5">
        <section
          className="card-base p-4 flex flex-col gap-2.5"
          style={{ minHeight: "240px" }}
        >
          <div className="flex items-center gap-2.5">
            <h4 className="m-0 text-[13.5px] font-bold tracking-tight flex-1">
              Последние заявки 1×1
            </h4>
            <Link
              to="/admin/one-on-one"
              className="font-mono uppercase tracking-wider"
              style={{ fontSize: "11px", color: "var(--warning)" }}
            >
              все →
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {(stats.data?.recent_one_on_one ?? []).slice(0, 6).map((r) => {
              const u = userById(r.student_id);
              return (
                <div
                  key={r.id}
                  className="grid items-center gap-2.5 px-3 py-1.5 rounded-md"
                  style={{
                    gridTemplateColumns: "70px 1fr auto auto",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="font-mono text-[10.5px] text-text-3 tracking-wide">
                    {new Date(r.created_at).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <span className="font-mono font-semibold text-[12.5px] text-text truncate">
                    {u?.display_name ?? u?.login ?? r.student_id.slice(0, 8)}
                  </span>
                  <span
                    className="font-mono font-bold text-[11.5px] inline-flex items-center gap-1.5"
                    style={{ color: "var(--text)" }}
                  >
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(255,219,61,0.9), var(--warning) 70%)",
                        boxShadow: "0 0 10px rgba(255,219,61,0.4)",
                      }}
                    />
                    1000
                  </span>
                  <StatusBadge kind={STATUS_TO_BADGE[r.status as OneOnOneStatus]}>
                    {r.status}
                  </StatusBadge>
                </div>
              );
            })}
            {!stats.data?.recent_one_on_one?.length && !stats.isLoading && (
              <div
                className="p-4 text-center text-text-3 font-mono uppercase tracking-wider"
                style={{ fontSize: "11px" }}
              >
                Заявок пока нет
              </div>
            )}
          </div>
        </section>

        <section
          className="card-base p-4 flex flex-col gap-2.5"
          style={{ minHeight: "240px" }}
        >
          <div className="flex items-center gap-2.5">
            <h4 className="m-0 text-[13.5px] font-bold tracking-tight flex-1">
              Сводка системы
            </h4>
            <span
              className="px-2 h-6 inline-flex items-center rounded-md font-mono uppercase tracking-wider"
              style={{
                fontSize: "9.5px",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
              }}
            >
              live
            </span>
          </div>
          <ul className="m-0 p-0 flex flex-col gap-0">
            <SummaryRow color="warn" label="Активных пользователей" value={stats.data?.users_total ?? 0} />
            <SummaryRow color="pink" label="Студентов" value={stats.data?.students_count ?? 0} />
            <SummaryRow color="primary" label="Buddy" value={stats.data?.buddies_count ?? 0} />
            <SummaryRow color="warn" label="Админов" value={stats.data?.admins_count ?? 0} />
            <SummaryRow color="danger" label="Удалённых (soft)" value={stats.data?.deleted_count ?? 0} />
            <SummaryRow
              color="primary"
              label="Достижений выдано всего"
              value={stats.data?.achievements_awarded_total ?? 0}
            />
            <SummaryRow
              color="warn"
              label="1×1 в очереди"
              value={stats.data?.one_on_one_pending ?? 0}
              showHints
            />
          </ul>
        </section>
      </div>
    </>
  );
}

function Tile({ label, value, variant, foot }: Tile) {
  const stripe =
    variant === "primary"
      ? { background: "var(--primary)", boxShadow: "0 0 12px var(--primary)" }
      : variant === "pink"
      ? { background: "var(--secondary)", boxShadow: "0 0 12px var(--secondary)" }
      : variant === "warn"
      ? { background: "var(--warning)", boxShadow: "0 0 12px var(--warning)" }
      : variant === "pending"
      ? { background: "var(--warning)", boxShadow: "0 0 14px var(--warning)" }
      : { background: "var(--text-3)" };

  const tileBg =
    variant === "pending"
      ? {
          background: "rgba(255,219,61,0.06)",
          border: "1px solid rgba(255,219,61,0.3)",
        }
      : {
          background: "var(--elevated)",
          border: "1px solid var(--border)",
        };

  return (
    <div
      className="rounded-xl p-4.5 flex flex-col gap-1.5 relative overflow-hidden"
      style={{ ...tileBg, padding: "18px" }}
    >
      <span
        className="absolute left-0 top-0 w-1 h-full"
        style={stripe as React.CSSProperties}
      />
      <div className="caption">{label}</div>
      <div
        className="font-mono font-bold text-text"
        style={{ fontSize: "32px", letterSpacing: "-0.02em", lineHeight: 1.05 }}
      >
        {value}
      </div>
      {foot && (
        <div
          className="font-mono uppercase"
          style={{ fontSize: "10.5px", color: "var(--warning)", letterSpacing: "0.06em" }}
        >
          {foot}
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  color,
  label,
  value,
  showHints,
}: {
  color: "primary" | "pink" | "warn" | "danger";
  label: string;
  value: number;
  showHints?: boolean;
}) {
  const dotColor =
    color === "primary"
      ? "var(--primary)"
      : color === "pink"
      ? "var(--secondary)"
      : color === "warn"
      ? "var(--warning)"
      : "var(--danger)";
  return (
    <li
      className="flex items-center gap-3 py-2.5"
      style={{ borderTop: "1px dashed var(--border)" }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
      />
      <span className="text-[13px] text-text flex-1">{label}</span>
      <span
        className="font-mono font-bold text-text"
        style={{ fontSize: "14px" }}
      >
        {value}
      </span>
      {showHints && value > 0 && (
        <Link
          to="/admin/one-on-one"
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: "10px", color: "var(--warning)" }}
        >
          обработать →
        </Link>
      )}
    </li>
  );
}

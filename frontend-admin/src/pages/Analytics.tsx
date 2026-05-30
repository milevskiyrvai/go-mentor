import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { getAdminStats } from "@/api/stats";
import { listUsers } from "@/api/users";
import { listAchievements } from "@/api/achievements";
import { listOneOnOne } from "@/api/oneOnOne";

const ONE_ON_ONE_STATUS_LABEL: Record<string, string> = {
  pending: "Ожидают",
  approved: "Одобрены",
  rejected: "Отклонены",
  completed: "Завершены",
  cancelled: "Отменены",
};

function oneOnOneStatusLabel(k: string): string {
  return ONE_ON_ONE_STATUS_LABEL[k] ?? k;
}

export function AnalyticsPage() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: getAdminStats });
  const users = useQuery({
    queryKey: ["admin", "users", { include_deleted: true }],
    queryFn: () => listUsers({ include_deleted: true }),
  });
  const ach = useQuery({
    queryKey: ["admin", "achievements"],
    queryFn: () => listAchievements(true),
  });
  const oneOnOne = useQuery({
    queryKey: ["admin", "one-on-one"],
    queryFn: () => listOneOnOne(),
  });

  const oneOnOneByStatus = useMemo(() => {
    const out: Record<string, number> = {
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    };
    (oneOnOne.data ?? []).forEach((r) => {
      out[r.status] = (out[r.status] ?? 0) + 1;
    });
    return out;
  }, [oneOnOne.data]);

  const multiRoleUsers = useMemo(
    () => (users.data ?? []).filter((u) => u.roles.length > 1).length,
    [users.data]
  );

  const studentsWithBuddy = useMemo(
    () =>
      (users.data ?? []).filter(
        (u) => u.roles.includes("student") && !u.is_deleted && !!u.buddy_id
      ).length,
    [users.data]
  );

  const studentsWithoutBuddy = useMemo(
    () =>
      (users.data ?? []).filter(
        (u) => u.roles.includes("student") && !u.is_deleted && !u.buddy_id
      ).length,
    [users.data]
  );

  return (
    <>
      <Crumbs segments={[{ label: "GO_MENTOR", to: "/admin/dashboard" }, { label: "ADMIN", to: "/admin/dashboard" }]} liveSegment="АНАЛИТИКА" />
      <PageHead
        eyebrow="ADMIN · ANALYTICS"
        title="Аналитика"
        description="Сводка по платформе — пользователи, достижения, заявки, активность."
      />

      <div className="grid grid-cols-4 gap-3">
        <Tile label="Всего пользователей" value={stats.data?.users_total ?? "—"} accent="warn" />
        <Tile label="Студентов" value={stats.data?.students_count ?? "—"} accent="primary" />
        <Tile label="Buddy" value={stats.data?.buddies_count ?? "—"} accent="pink" />
        <Tile label="Админов" value={stats.data?.admins_count ?? "—"} accent="warn" />
        <Tile label="Удалённых (soft)" value={stats.data?.deleted_count ?? "—"} accent="danger" />
        <Tile label="С Buddy" value={studentsWithBuddy} accent="primary" />
        <Tile label="Без Buddy" value={studentsWithoutBuddy} accent="warn" />
        <Tile label="Несколько ролей" value={multiRoleUsers} accent="primary" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 1x1 breakdown */}
        <section className="card-base p-4 flex flex-col gap-3">
          <h3 className="m-0 text-[14px] font-bold tracking-tight">Заявки 1×1 по статусам</h3>
          <div className="flex flex-col gap-1.5">
            {Object.entries(oneOnOneByStatus).map(([k, v]) => (
              <Row key={k} label={oneOnOneStatusLabel(k)} value={v} max={oneOnOne.data?.length ?? 1} />
            ))}
          </div>
        </section>

        {/* Achievements breakdown */}
        <section className="card-base p-4 flex flex-col gap-3">
          <h3 className="m-0 text-[14px] font-bold tracking-tight">
            Достижения · {ach.data?.length ?? 0}
          </h3>
          <div className="flex flex-col gap-1.5">
            <RowSimple label="Активных" value={(ach.data ?? []).filter((a) => a.is_active).length} />
            <RowSimple
              label="Неактивных"
              value={(ach.data ?? []).filter((a) => !a.is_active).length}
              color="danger"
            />
            <RowSimple
              label="Всего выдано"
              value={stats.data?.achievements_awarded_total ?? 0}
              color="primary"
            />
            <RowSimple
              label="Сумма бонусов в системе"
              value={(ach.data ?? []).reduce((acc, a) => acc + a.reward_bonus, 0)}
              color="warning"
              suffix="(если все получат всё)"
            />
          </div>
        </section>
      </div>

      {/* Roles overlap snapshot */}
      <section className="card-base p-4 flex flex-col gap-3">
        <h3 className="m-0 text-[14px] font-bold tracking-tight">Срез по ролям</h3>
        <div className="grid grid-cols-3 gap-3">
          <RoleBreakdown
            label="Студент"
            color="var(--primary)"
            count={(users.data ?? []).filter((u) => u.roles.includes("student") && !u.is_deleted).length}
            total={stats.data?.users_total ?? 0}
          />
          <RoleBreakdown
            label="Buddy"
            color="var(--secondary)"
            count={(users.data ?? []).filter((u) => u.roles.includes("buddy") && !u.is_deleted).length}
            total={stats.data?.users_total ?? 0}
          />
          <RoleBreakdown
            label="Админ"
            color="var(--warning)"
            count={(users.data ?? []).filter((u) => u.roles.includes("admin") && !u.is_deleted).length}
            total={stats.data?.users_total ?? 0}
          />
        </div>
      </section>
    </>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "warn" | "primary" | "pink" | "danger";
}) {
  const map = {
    warn: "var(--warning)",
    primary: "var(--primary)",
    pink: "var(--secondary)",
    danger: "var(--danger)",
  };
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1.5 relative overflow-hidden"
      style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}
    >
      <span
        className="absolute left-0 top-0 w-1 h-full"
        style={{ background: map[accent], boxShadow: `0 0 12px ${map[accent]}` }}
      />
      <div className="caption">{label}</div>
      <div
        className="font-mono font-bold text-text"
        style={{ fontSize: "28px", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono uppercase text-[10.5px] text-text-3 tracking-wider w-[80px]">
        {label}
      </span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--warning), var(--danger))",
            boxShadow: "0 0 8px var(--warning)",
          }}
        />
      </div>
      <span className="font-mono text-[12px] font-bold text-text">{value}</span>
    </div>
  );
}

function RowSimple({
  label,
  value,
  color = "warning",
  suffix,
}: {
  label: string;
  value: number;
  color?: "warning" | "primary" | "danger";
  suffix?: string;
}) {
  const colors = {
    warning: "var(--warning)",
    primary: "var(--primary)",
    danger: "var(--danger)",
  };
  return (
    <div
      className="flex items-center gap-2.5 py-2.5"
      style={{ borderTop: "1px dashed var(--border)" }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: colors[color], boxShadow: `0 0 8px ${colors[color]}` }}
      />
      <span className="text-[13px] flex-1">
        {label}
        {suffix && (
          <span className="ml-1.5 text-[10.5px] text-text-3 font-mono">{suffix}</span>
        )}
      </span>
      <span className="font-mono font-bold text-[14px]">{value}</span>
    </div>
  );
}

function RoleBreakdown({
  label,
  color,
  count,
  total,
}: {
  label: string;
  color: string;
  count: number;
  total: number;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className="rounded-md p-3 flex flex-col gap-2"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <span
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: "11px", color }}
        >
          {label}
        </span>
        <span className="ml-auto font-mono text-text-3 text-[11px]">{pct}%</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-mono font-bold"
          style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
        >
          {count}
        </span>
        <span className="text-text-3 text-[12px]">/ {total}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  );
}

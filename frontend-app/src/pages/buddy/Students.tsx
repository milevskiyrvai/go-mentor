import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyStudents } from "@/api/users";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { Avatar } from "@/components/Sidebar";
import { ProgressBar } from "@/components/ProgressBar";
import { daysSince, relativeDays } from "@/lib/format";
import clsx from "clsx";

type SortKey = "name" | "progress" | "waiting" | "activity";

export function BuddyStudents() {
  const { data, isLoading } = useQuery({
    queryKey: ["buddy-students"],
    queryFn: listMyStudents,
  });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("progress");
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "stale">("all");

  const filtered = useMemo(() => {
    const items = (data ?? []).slice();
    let r = items.filter((s) =>
      s.display_name.toLowerCase().includes(search.toLowerCase()),
    );
    if (statusFilter === "waiting") r = r.filter((s) => s.waiting_blocks > 0);
    if (statusFilter === "stale")
      r = r.filter((s) => daysSince(s.last_activity_at) > 7);
    r.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.display_name.localeCompare(b.display_name);
        case "progress":
          return b.overall_percent - a.overall_percent;
        case "waiting":
          return b.waiting_blocks - a.waiting_blocks;
        case "activity":
          return (
            (new Date(b.last_activity_at ?? 0).getTime() || 0) -
            (new Date(a.last_activity_at ?? 0).getTime() || 0)
          );
      }
    });
    return r;
  }, [data, search, sortKey, statusFilter]);

  if (isLoading) return <PageLoader />;

  const all = data ?? [];
  const waitingCount = all.filter((s) => s.waiting_blocks > 0).length;
  const staleCount = all.filter((s) => daysSince(s.last_activity_at) > 7).length;

  return (
    <div>
      <PageHeader
        eyebrow="Buddy"
        title="Мои ученики"
        description="Сопровождайте учеников, подтверждайте блоки, проводите mock-собеседования и финалки."
        right={
          <div className="flex items-center gap-3">
            <Counter label="Учеников" value={all.length} />
            <Counter label="Ждут подтверждения" value={waitingCount} tone="warning" />
            <Counter label="Без активности 7 дн." value={staleCount} tone="danger" />
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-5 flex items-center gap-3 flex-wrap">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Поиск по имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <span className="caption">Фильтр</span>
          {(["all", "waiting", "stale"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={clsx(
                "btn btn-sm",
                statusFilter === k && "btn-primary",
              )}
            >
              {k === "all" ? "Все" : k === "waiting" ? "Ждут Buddy" : "7+ дней молчат"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="caption">Сортировка</span>
          <select
            className="select !w-auto"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="progress">По прогрессу</option>
            <option value="waiting">По ожиданию</option>
            <option value="activity">По активности</option>
            <option value="name">По имени</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="card p-8 col-span-2 text-text-3 text-center">
            Учеников по фильтру нет.
          </div>
        )}
        {filtered.map((s) => {
          const stale = daysSince(s.last_activity_at) > 7;
          return (
            <Link
              key={s.id}
              to={`/buddy/students/${s.id}`}
              className="elevated p-5 flex gap-4 hover:border-border-bright transition-all relative overflow-hidden"
            >
              {s.waiting_blocks > 0 && (
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(255,219,61,0.20), transparent 70%)",
                  }}
                />
              )}
              <Avatar name={s.display_name} url={s.avatar_url} role="student" size={52} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[15px] truncate">{s.display_name}</h3>
                  {s.waiting_blocks > 0 && (
                    <span className="status-badge warning text-[10px]">
                      <span className="dot" />
                      Ждёт {s.waiting_blocks}
                    </span>
                  )}
                  {stale && (
                    <span className="status-badge danger text-[10px]">
                      <span className="dot" />
                      {daysSince(s.last_activity_at)} дн.
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-text-2 mb-3">
                  Блоков: {s.approved_blocks} / {s.total_blocks} · Материалов:{" "}
                  {s.viewed_required} / {s.total_required}
                </div>
                <ProgressBar value={s.overall_percent} height={6} />
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[12px] text-text-2">
                    {s.overall_percent}%
                  </span>
                  <span className="font-mono text-[11px] text-text-3">
                    Активн.: {relativeDays(s.last_activity_at)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="elevated px-4 py-2.5 flex flex-col items-end">
      <span className="caption">{label}</span>
      <span
        className={clsx(
          "font-mono font-bold text-[20px]",
          tone === "warning" && "text-warning",
          tone === "danger" && value > 0 && "text-danger",
          !tone && "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

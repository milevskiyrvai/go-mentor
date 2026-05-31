import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMyStudents } from "@/api/users";
import { PageLoader } from "@/components/Spinner";
import { Avatar } from "@/components/Sidebar";
import { daysSince, relativeDays } from "@/lib/format";
import type { BuddyStudent } from "@/api/types";
import clsx from "clsx";

type Filter = "all" | "waiting" | "cold";

const STALE_DAYS = 7;

/**
 * Производный статус ученика из доступных полей BuddyStudent.
 * Бэк не отдаёт enum статуса в списке — выводим его из чисел блоков/прогресса.
 * waiting → ученик ждёт подтверждения блока buddy.
 */
type DerivedStatus = "waiting" | "approved" | "in_progress" | "not_started";

function deriveStatus(s: BuddyStudent): DerivedStatus {
  if (s.waiting_blocks > 0) return "waiting";
  if (s.overall_percent >= 100) return "approved";
  if (s.overall_percent > 0 || s.approved_blocks > 0) return "in_progress";
  return "not_started";
}

const STATUS_META: Record<
  DerivedStatus,
  { cls: string; label: string }
> = {
  waiting: { cls: "waiting", label: "Ждёт вас" },
  approved: { cls: "approved", label: "Подтверждён" },
  in_progress: { cls: "in-progress", label: "В работе" },
  not_started: { cls: "not-started", label: "Не начат" },
};

function activityClass(s: BuddyStudent): "" | "stale" | "cold" {
  const d = daysSince(s.last_activity_at);
  if (!s.last_activity_at) return "cold";
  if (d >= 14) return "cold";
  if (d > STALE_DAYS) return "stale";
  return "";
}

function activityLabel(s: BuddyStudent): string {
  if (!s.last_activity_at) return "нет активности";
  const d = daysSince(s.last_activity_at);
  if (d > STALE_DAYS) return `${d} дней без активности`;
  return relativeDays(s.last_activity_at);
}

export function BuddyStudents() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["buddy-students"],
    queryFn: listMyStudents,
  });

  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(() => data ?? [], [data]);

  const waitingCount = all.filter((s) => s.waiting_blocks > 0).length;
  const coldCount = all.filter(
    (s) => activityClass(s) === "cold" || activityClass(s) === "stale",
  ).length;

  const filtered = useMemo(() => {
    const rows = all.slice().sort((a, b) => {
      // Ждущие подтверждения — наверх, затем по убыванию прогресса.
      if ((b.waiting_blocks > 0 ? 1 : 0) !== (a.waiting_blocks > 0 ? 1 : 0)) {
        return (b.waiting_blocks > 0 ? 1 : 0) - (a.waiting_blocks > 0 ? 1 : 0);
      }
      return b.overall_percent - a.overall_percent;
    });
    if (filter === "waiting") return rows.filter((s) => s.waiting_blocks > 0);
    if (filter === "cold")
      return rows.filter(
        (s) => activityClass(s) === "cold" || activityClass(s) === "stale",
      );
    return rows;
  }, [all, filter]);

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1>Мои ученики</h1>
          </div>
        </div>
        <div className="card flat" style={{ marginTop: 18, padding: 32, textAlign: "center" }}>
          <div className="text-[14px] font-semibold" style={{ color: "var(--danger)" }}>
            Не удалось загрузить список учеников
          </div>
          <button className="btn secondary sm" style={{ marginTop: 14 }} onClick={() => refetch()}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100%" }}>
      <div className="page-head">
        <div>
          <h1>Мои ученики</h1>
          <div className="sub">
            <b className="num">{all.length}</b> учеников ·{" "}
            <b className="num">{waitingCount}</b> ждут подтверждения блока ·{" "}
            <b className="num">{coldCount}</b> без активности
          </div>
        </div>
        <div className="right">
          <div className="seg stu-filter">
            <button
              type="button"
              className={clsx(filter === "all" && "active")}
              onClick={() => setFilter("all")}
            >
              Все <span className="c">{all.length}</span>
            </button>
            <button
              type="button"
              className={clsx(filter === "waiting" && "active")}
              onClick={() => setFilter("waiting")}
            >
              Ждут <span className="c">{waitingCount}</span>
            </button>
            <button
              type="button"
              className={clsx(filter === "cold" && "active")}
              onClick={() => setFilter("cold")}
            >
              Без активности <span className="c">{coldCount}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="card flat"
        style={{ flex: 1, padding: 0, overflow: "hidden", marginTop: 18 }}
      >
        <div className="stu-head stu-cols">
          <div>Ученик</div>
          <div>Текущий блок</div>
          <div>Статус</div>
          <div className="stu-col-act">Активность</div>
          <div></div>
        </div>

        <div className="stu">
          {filtered.length === 0 && (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--ink-3)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {all.length === 0
                ? "У вас пока нет закреплённых учеников."
                : "Нет учеников по выбранному фильтру."}
            </div>
          )}

          {filtered.map((s) => {
            const status = deriveStatus(s);
            const meta = STATUS_META[status];
            const actCls = activityClass(s);
            const pct = Math.max(0, Math.min(100, s.overall_percent));
            const barCls =
              pct >= 100 ? "success" : actCls ? "mute" : "";
            // Номер текущего блока: первый неподтверждённый = approved + 1 (с потолком).
            const currentBlockNo = Math.min(
              s.approved_blocks + 1,
              Math.max(s.total_blocks, 1),
            );

            return (
              <div
                key={s.id}
                className="stu-row stu-cols"
                data-s={status === "waiting" ? "waiting" : ""}
                onClick={() => navigate(`/buddy/students/${s.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="stu-name">
                  <Avatar name={s.display_name} url={s.avatar_url} role="student" size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div className="nm">{s.display_name}</div>
                    {s.telegram_username && (
                      <div className="tg">@{s.telegram_username}</div>
                    )}
                  </div>
                </div>

                <div className="stu-block">
                  <div className="bt">
                    <span className="bn">
                      {String(currentBlockNo).padStart(2, "0")}
                    </span>
                    Блок {s.approved_blocks} / {s.total_blocks}
                  </div>
                  <div className="row2">
                    <span className="pct">{pct}%</span>
                    <div className={clsx("bar", barCls)}>
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                <div>
                  <span className={clsx("pill", meta.cls)}>
                    <span className="led" />
                    {meta.label}
                  </span>
                </div>

                <div className={clsx("stu-act", actCls)}>
                  <span className="adot" />
                  {activityLabel(s)}
                </div>

                <div
                  className="stu-actions"
                  style={{ display: "flex", justifyContent: "flex-end" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {s.waiting_blocks > 0 ? (
                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() => navigate(`/buddy/students/${s.id}`)}
                    >
                      Подтвердить блок
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => navigate(`/buddy/students/${s.id}`)}
                    >
                      Открыть
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { getAdminStats } from "@/api/stats";
import { listUsers } from "@/api/users";
import { listAchievements, listAchievementUsers } from "@/api/achievements";
import { listOneOnOne } from "@/api/oneOnOne";
import type { Achievement, OneOnOneStatus } from "@/api/types";

/* ============================================================
   §22 Admin · Аналитика платформы
   Вёрстка повторяет design-output/screens/admin-analytics.html
   (классы .stat-row/.an-grid/.an-bars/.donut/.rank/.col-chart),
   данные — ТОЛЬКО из API. Где у бэка нет источника (недельный
   ряд активности, разбивка roadmap-воронки по стадиям, фильтр по
   периодам, CSV) — честный empty/disabled, без фейковых чисел.
   ============================================================ */

const ONE_ON_ONE_STATUS_LABEL: Record<OneOnOneStatus, string> = {
  pending: "Ждут решения",
  approved: "Одобрено",
  rejected: "Отклонено",
  completed: "Завершено",
  cancelled: "Отменено",
};

// seal-glyph для топ-достижений (по индексу): тёплая палитра ДС
const SEAL_VARIANTS: (string | undefined)[] = [undefined, "sage", "amber", "amber", undefined];

function initials(title: string): string {
  const parts = title.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return title.trim().slice(0, 2).toUpperCase() || "★";
}

export function AnalyticsPage() {
  const statsQ = useQuery({ queryKey: ["admin", "stats"], queryFn: getAdminStats });
  const usersQ = useQuery({
    queryKey: ["admin", "users", { include_deleted: true }],
    queryFn: () => listUsers({ include_deleted: true }),
  });
  const achQ = useQuery({
    queryKey: ["admin", "achievements"],
    queryFn: () => listAchievements(true),
  });
  const oneOnOneQ = useQuery({
    queryKey: ["admin", "one-on-one"],
    queryFn: () => listOneOnOne(),
  });

  const achievements = achQ.data ?? [];

  // live-счётчик выдач по каждому достижению (для «Топ достижений»)
  const recipientQueries = useQueries({
    queries: achievements.map((a) => ({
      queryKey: ["admin", "achievements", a.id, "users"],
      queryFn: () => listAchievementUsers(a.id),
      enabled: !!a.id,
      staleTime: 60_000,
    })),
  });

  // ---- 1×1 разбивка по статусам ----
  const oneOnOneByStatus = useMemo(() => {
    const out: Record<OneOnOneStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      cancelled: 0,
    };
    (oneOnOneQ.data ?? []).forEach((r) => {
      out[r.status] = (out[r.status] ?? 0) + 1;
    });
    return out;
  }, [oneOnOneQ.data]);
  const oneOnOneTotal = oneOnOneQ.data?.length ?? 0;

  // ---- роли (живые пользователи, без soft-deleted) ----
  const roleCounts = useMemo(() => {
    const live = (usersQ.data ?? []).filter((u) => !u.is_deleted);
    return {
      total: live.length,
      students: live.filter((u) => u.roles.includes("student")).length,
      buddies: live.filter((u) => u.roles.includes("buddy")).length,
      admins: live.filter((u) => u.roles.includes("admin")).length,
    };
  }, [usersQ.data]);

  // ---- «Начали обучение» — единственная стадия воронки, которую
  //      реально отдаёт бэк (learning_started_at у студента) ----
  const studentsStarted = useMemo(() => {
    const students = (usersQ.data ?? []).filter(
      (u) => !u.is_deleted && u.roles.includes("student")
    );
    return {
      total: students.length,
      started: students.filter((u) => !!u.learning_started_at).length,
    };
  }, [usersQ.data]);

  // ---- топ достижений по числу выдач ----
  const topAchievements = useMemo(() => {
    return achievements
      .map((a, i) => ({ ach: a, count: recipientQueries[i]?.data?.length ?? 0 }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 5);
  }, [achievements, recipientQueries]);

  const loading = statsQ.isLoading || usersQ.isLoading || oneOnOneQ.isLoading;
  const error = statsQ.isError || usersQ.isError || oneOnOneQ.isError;

  return (
    <>
      <Crumbs
        segments={[
          { label: "GO_MENTOR", to: "/admin/dashboard" },
          { label: "ADMIN", to: "/admin/dashboard" },
        ]}
        liveSegment="АНАЛИТИКА"
      />
      <PageHead
        eyebrow="ADMIN · ANALYTICS"
        title="Аналитика платформы"
        description={
          <>
            Пользователи, роли, достижения, заявки 1×1 · <b>live из БД</b>
          </>
        }
        right={
          <div className="flex items-center gap-3">
            {/* Сегмент-период и CSV — бэк не отдаёт оконную статистику,
                поэтому контролы показаны (как в макете), но disabled. */}
            <div
              className="seg"
              role="tablist"
              aria-label="период"
              title="Период недоступен — бэк не отдаёт оконную статистику"
            >
              <button className="opacity-50" type="button" disabled>
                7 дней
              </button>
              <button className="active opacity-50" type="button" disabled>
                Всё время
              </button>
              <button className="opacity-50" type="button" disabled>
                Квартал
              </button>
            </div>
            <button
              className="btn-base"
              type="button"
              disabled
              title="Экспорт недоступен — нет эндпоинта выгрузки"
            >
              Экспорт CSV
            </button>
          </div>
        }
      />

      {error && <ErrorState onRetry={() => location.reload()} />}

      {loading && !error && <LoadingState />}

      {!loading && !error && (
        <>
          {/* ===== summary stats ===== */}
          <div className="stat-row">
            <Stat
              label="Пользователи"
              value={statsQ.data?.users_total ?? roleCounts.total}
              unit="всего"
              foot={
                <>
                  <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                    {statsQ.data?.deleted_count ?? 0}
                  </span>{" "}
                  удалено (soft)
                </>
              }
            />
            <Stat
              label="Студентов"
              value={statsQ.data?.students_count ?? roleCounts.students}
              unit="всего"
              foot={`${studentsStarted.started} начали обучение`}
            />
            <Stat
              label="Достижений выдано"
              value={statsQ.data?.achievements_awarded_total ?? 0}
              unit="всего"
              foot={`${achievements.filter((a) => a.is_active).length} активных ачивок`}
            />
            <Stat
              accent
              label="Заявки 1×1"
              value={oneOnOneTotal}
              unit="всего"
              foot={`${oneOnOneByStatus.approved} одобрено · ${
                statsQ.data?.one_on_one_pending ?? oneOnOneByStatus.pending
              } ждут`}
            />
          </div>

          {/* ===== row: roles + requests ===== */}
          <div className="an-grid">
            {/* Пользователи по ролям */}
            <section className="card card-pad">
              <div className="card-head">
                <h3>Пользователи по ролям</h3>
                <span className="meta">{roleCounts.total} всего</span>
              </div>
              <div className="an-bars">
                <RoleBar
                  label="Студенты"
                  count={roleCounts.students}
                  total={roleCounts.total}
                />
                <RoleBar
                  label="Buddy (наставники)"
                  count={roleCounts.buddies}
                  total={roleCounts.total}
                  variant="sage"
                />
                <RoleBar
                  label="Администраторы"
                  count={roleCounts.admins}
                  total={roleCounts.total}
                  variant="mute"
                />
              </div>
              <div className="chart-legend">
                <span>
                  <i className="c1" />
                  Соотношение Buddy ↔ студент —
                  <b style={{ color: "var(--ink)", marginLeft: 4 }}>
                    1 : {roleCounts.buddies ? Math.round(roleCounts.students / roleCounts.buddies) : "—"}
                  </b>
                </span>
              </div>
            </section>

            {/* Заявки 1×1 — donut */}
            <section className="card card-pad">
              <div className="card-head">
                <h3>Заявки 1×1 по статусам</h3>
                <span className="meta">{oneOnOneTotal} всего</span>
              </div>
              {oneOnOneTotal === 0 ? (
                <EmptyInline text="Заявок 1×1 пока нет." />
              ) : (
                <OneOnOneDonut total={oneOnOneTotal} byStatus={oneOnOneByStatus} />
              )}
            </section>
          </div>

          {/* ===== full-width: activity §22 ===== */}
          <section className="card card-pad">
            <div className="card-head">
              <h3>Активность за неделю</h3>
              <span className="meta">нет данных по периодам</span>
            </div>
            <EmptyInline
              icon
              text="Бэк не отдаёт временной ряд активности (нет эндпоинта аналитики по дням). Здесь появятся столбцы «активные пользователи / выдано достижений», когда добавим /admin/stats/activity."
            />
            <div className="chart-legend">
              <span>
                <i className="c1" />
                Активные пользователи
              </span>
              <span>
                <i className="c2" />
                Достижения выдано
              </span>
            </div>
          </section>

          {/* ===== row: top achievements + roadmap funnel ===== */}
          <div className="an-grid">
            {/* Топ достижений */}
            <section className="card card-pad">
              <div className="card-head">
                <h3>Топ достижений</h3>
                <span className="meta">по числу выдач</span>
              </div>
              {achievements.length === 0 ? (
                <EmptyInline text="В каталоге пока нет достижений." />
              ) : (
                <div className="rank">
                  {topAchievements.map(({ ach, count }, i) => (
                    <TopAchievementRow
                      key={ach.id}
                      ach={ach}
                      count={count}
                      seal={SEAL_VARIANTS[i]}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Прохождение roadmap */}
            <section className="card card-pad">
              <div className="card-head">
                <h3>Прохождение roadmap</h3>
                <span className="meta">{studentsStarted.total} студентов</span>
              </div>
              <div className="an-bars">
                <RoleBar
                  label="Зачислены студентами"
                  count={studentsStarted.total}
                  total={studentsStarted.total || 1}
                />
                <RoleBar
                  label="Начали обучение"
                  count={studentsStarted.started}
                  total={studentsStarted.total || 1}
                  variant="sage"
                />
              </div>
              <div className="chart-legend">
                <span style={{ color: "var(--ink-3)" }}>
                  Стадии mock / real / финальная техничка появятся после эндпоинта
                  агрегата прогресса (бэк не отдаёт срез воронки).
                </span>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================
   Подкомпоненты
   ============================================================ */

function Stat({
  label,
  value,
  unit,
  foot,
  accent,
}: {
  label: string;
  value: number | string;
  unit?: string;
  foot?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "stat accent" : "stat"}>
      <div className="lbl">{label}</div>
      <div className="big">
        <span className="v num">{value}</span>
        {unit && <span className="u">{unit}</span>}
      </div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  );
}

function RoleBar({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant?: "sage" | "mute" | "warn";
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="an-bar">
      <div className="top">
        <span className="k">{label}</span>
        <span className="vv">
          <b>{count}</b> · {pct}%
        </span>
      </div>
      <div className={variant ? `bar ${variant}` : "bar"}>
        <i style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  );
}

function OneOnOneDonut({
  total,
  byStatus,
}: {
  total: number;
  byStatus: Record<OneOnOneStatus, number>;
}) {
  // сегменты в порядке: одобрено(primary) → отклонено(danger) → ждут(warning)
  // завершено и отменено сворачиваем в легенду отдельными строками
  const segments: { key: OneOnOneStatus; color: string }[] = [
    { key: "approved", color: "var(--primary)" },
    { key: "completed", color: "var(--success)" },
    { key: "rejected", color: "var(--danger)" },
    { key: "cancelled", color: "var(--line-2)" },
    { key: "pending", color: "var(--warning)" },
  ];

  let acc = 0;
  const stops: string[] = [];
  segments.forEach((s) => {
    const v = byStatus[s.key];
    if (v <= 0) return;
    const from = (acc / total) * 100;
    acc += v;
    const to = (acc / total) * 100;
    stops.push(`${s.color} ${from}% ${to}%`);
  });
  const gradient = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: gradient }}>
        <div className="dc">
          <div className="v num">{total}</div>
          <div className="l">всего</div>
        </div>
      </div>
      <div className="donut-legend">
        {segments
          .filter((s) => byStatus[s.key] > 0)
          .map((s) => (
            <div className="dl" key={s.key}>
              <i style={{ background: s.color }} />
              {ONE_ON_ONE_STATUS_LABEL[s.key]}
              <span className="vv num">{byStatus[s.key]}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function TopAchievementRow({
  ach,
  count,
  seal,
}: {
  ach: Achievement;
  count: number;
  seal?: string;
}) {
  return (
    <div className="ri">
      {ach.image_url ? (
        <div
          className="rounded-full bg-cover bg-center"
          style={{
            width: 40,
            height: 40,
            flex: "0 0 40px",
            backgroundImage: `url(${ach.image_url})`,
            boxShadow: "0 0 0 1px var(--line) inset",
          }}
        />
      ) : (
        <div className="seal" {...(seal ? { "data-seal": seal } : {})}>
          <span className="gl">{initials(ach.title)}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="nm truncate">{ach.title}</div>
        <div className="sub truncate">{ach.description || ach.condition_type}</div>
      </div>
      <div className="ct num">
        {count}
        <small>выдач</small>
      </div>
    </div>
  );
}

/* ---------- состояния ---------- */

function EmptyInline({ text, icon }: { text: string; icon?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 rounded-md"
      style={{
        padding: "18px 16px",
        border: "1px dashed var(--line-2)",
        color: "var(--ink-2)",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {icon && (
        <span
          className="grid place-items-center rounded-full flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "var(--bg)",
            border: "1px solid var(--line)",
            color: "var(--ink-3)",
          }}
        >
          ◔
        </span>
      )}
      <span>{text}</span>
    </div>
  );
}

function LoadingState() {
  const Card = ({ h }: { h: number }) => (
    <div
      className="card card-pad"
      style={{ minHeight: h }}
      aria-hidden
    >
      <div
        className="rounded"
        style={{ width: "40%", height: 14, background: "var(--bg)" }}
      />
      <div
        className="rounded mt-4"
        style={{ width: "100%", height: h - 70, background: "var(--bg)", opacity: 0.6 }}
      />
    </div>
  );
  return (
    <>
      <div className="stat-row">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat" key={i} aria-hidden>
            <div className="rounded" style={{ width: "55%", height: 12, background: "var(--bg)" }} />
            <div className="rounded" style={{ width: "40%", height: 34, background: "var(--bg)" }} />
            <div className="rounded" style={{ width: "70%", height: 12, background: "var(--bg)" }} />
          </div>
        ))}
      </div>
      <div className="an-grid">
        <Card h={210} />
        <Card h={210} />
      </div>
      <Card h={230} />
      <div
        className="flex items-center gap-2 mt-1"
        style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 600 }}
      >
        <span className="inline-block w-4 h-4 rounded-full border-2 border-warning border-t-transparent spin" />
        Загрузка аналитики…
      </div>
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="card card-pad flex flex-col items-start gap-3"
      style={{ borderColor: "var(--danger)" }}
    >
      <div className="caption" style={{ color: "var(--danger)" }}>
        Ошибка загрузки
      </div>
      <p className="m-0" style={{ fontSize: 14, color: "var(--ink-2)" }}>
        Не удалось получить данные аналитики. Проверьте соединение и попробуйте снова.
      </p>
      <button className="btn-base btn-warn" type="button" onClick={onRetry}>
        Повторить
      </button>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { myProgress } from "@/api/progress";
import { listBlocks } from "@/api/roadmap";
import { myBonuses } from "@/api/bonus";
import { myAchievements } from "@/api/achievements";
import { listStudentActivity } from "@/api/activity";
import { useAuth } from "@/stores/auth";
import { daysSince, formatDate, formatDateTime } from "@/lib/format";
import { PageLoader } from "@/components/Spinner";
import { HexBadge } from "@/components/HexBadge";
import { BonusCoin } from "@/components/BonusCoin";
import { ACHIEVEMENT_REWARDS } from "@/lib/achievements";
import type { ActivityEvent, BlockProgressSummary } from "@/api/types";

export function StudentDashboard() {
  const { user } = useAuth();

  const blocksQ = useQuery({ queryKey: ["blocks"], queryFn: listBlocks });
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: myProgress });
  const bonusesQ = useQuery({ queryKey: ["bonuses"], queryFn: myBonuses });
  const achQ = useQuery({ queryKey: ["achievements"], queryFn: myAchievements });
  const activityQ = useQuery({
    queryKey: ["activity", user?.id],
    queryFn: () => listStudentActivity(user!.id, 6),
    enabled: !!user?.id,
  });

  // ---- loading ----
  if (
    blocksQ.isLoading ||
    progressQ.isLoading ||
    bonusesQ.isLoading ||
    achQ.isLoading
  ) {
    return <PageLoader />;
  }

  // ---- error ----
  const fatalError =
    blocksQ.error || progressQ.error || bonusesQ.error || achQ.error;
  if (fatalError) {
    return (
      <div className="card card-pad text-center" style={{ padding: "48px 24px" }}>
        <div className="text-[15px] font-bold mb-1">Не удалось загрузить прогресс</div>
        <div className="text-[13px] text-text-2 mb-4">
          Проверьте подключение и попробуйте ещё раз.
        </div>
        <button
          className="btn primary"
          onClick={() => {
            blocksQ.refetch();
            progressQ.refetch();
            bonusesQ.refetch();
            achQ.refetch();
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  const blocks = blocksQ.data ?? [];
  const progress = progressQ.data;
  const bonuses = bonusesQ.data;
  const achievements = achQ.data ?? [];
  const activity = activityQ.data ?? [];

  const days = daysSince(user?.learning_started_at);
  const overall = progress?.overall_percent ?? 0;
  const approved = progress?.approved_blocks ?? 0;
  const totalBlocks = progress?.total_active_blocks ?? blocks.length;
  const inProgressCount =
    progress?.blocks.filter((b) => b.status === "in_progress").length ?? 0;

  // прогресс по блоку
  const blockProgressMap = new Map<string, BlockProgressSummary>(
    progress?.blocks.map((b) => [b.block_id, b]) ?? [],
  );
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  // текущий блок — первый из in_progress/waiting, иначе первый не закрытый
  const currentIdx = (() => {
    const active = sortedBlocks.findIndex((b) => {
      const st = blockProgressMap.get(b.id)?.status;
      return st === "in_progress" || st === "waiting_buddy_confirmation";
    });
    if (active !== -1) return active;
    const next = sortedBlocks.findIndex(
      (b) => (blockProgressMap.get(b.id)?.status ?? "not_started") !== "approved",
    );
    return next === -1 ? 0 : next;
  })();
  const currentBlock = sortedBlocks[currentIdx];
  const currentBp = currentBlock ? blockProgressMap.get(currentBlock.id) : undefined;
  const currentPct = currentBp?.progress_percent ?? 0;
  const curViewed = currentBp?.viewed_required ?? 0;
  const curTotal = currentBp?.total_required ?? 0;
  const curRemaining = Math.max(0, curTotal - curViewed);

  // следующее достижение — ближайшее по проценту прогресса, ещё не полученное
  const nextAch = achievements
    .filter((a) => !a.received)
    .map((a) => ({
      item: a,
      pct: a.target > 0 ? a.current / a.target : 0,
    }))
    .sort((x, y) => y.pct - x.pct)[0]?.item;
  const nextAchPct =
    nextAch && nextAch.target > 0
      ? Math.min(100, Math.round((nextAch.current / nextAch.target) * 100))
      : 0;
  const nextAchReward = nextAch
    ? ACHIEVEMENT_REWARDS[nextAch.achievement.title] ?? nextAch.achievement.reward_bonus
    : 0;

  const receivedCount = achievements.filter((a) => a.received).length;

  return (
    <main className="main" style={{ padding: 0, gap: 24 }}>
      {/* ============ page head ============ */}
      <div className="page-head">
        <div>
          <h1>Мой прогресс</h1>
          <div className="sub">
            {user?.learning_started_at
              ? `Учусь с ${formatDate(user.learning_started_at)} · ${days}-й день в пути`
              : "Старт обучения ещё не отмечен"}
          </div>
        </div>
        <div className="right">
          <Link to="/student/roadmap" className="pill in-progress">
            <span className="led" />
            Поток · Go Backend
          </Link>
        </div>
      </div>

      {/* ============ hero stats ============ */}
      <div className="stat-row">
        {/* текущий блок */}
        <div className="stat">
          <div className="lbl">Текущий блок</div>
          <div className="big">
            <span className="v num">
              {currentBlock ? String(currentIdx + 1).padStart(2, "0") : "—"}
            </span>
            <span className="u">{currentBlock?.title ?? "Все блоки закрыты"}</span>
          </div>
          <div className="bar">
            <i style={{ width: `${currentPct}%` }} />
          </div>
          <div className="foot">
            {currentBlock
              ? `Просмотрено ${curViewed} из ${curTotal} материалов · ${currentPct}%`
              : "Программа пройдена полностью"}
          </div>
        </div>

        {/* общий прогресс */}
        <div className="stat">
          <div className="lbl">Общий прогресс</div>
          <div className="big">
            <span className="v num">{overall}</span>
            <span className="u">% программы</span>
          </div>
          <div className="bar success">
            <i style={{ width: `${overall}%` }} />
          </div>
          <div className="foot">
            {approved} из {totalBlocks} блоков закрыто
            {inProgressCount > 0 ? ` · ${inProgressCount} в работе` : ""}
          </div>
        </div>

        {/* баланс бонусов */}
        <div className="stat accent">
          <div className="lbl">Баланс бонусов</div>
          <div className="big">
            <span className="v num">{(bonuses?.balance ?? 0).toLocaleString("ru-RU")}</span>
            <span className="u">бонусов</span>
          </div>
          <div className="foot">
            Текущая скидка постоплаты ·{" "}
            <b className="num">
              {(bonuses?.discount_percent ?? 0).toLocaleString("ru-RU", {
                maximumFractionDigits: 1,
              })}
              %
            </b>
          </div>
        </div>
      </div>

      {/* ============ next step ============ */}
      {currentBlock && (
        <Link
          to="/student/roadmap"
          state={{ blockId: currentBlock.id }}
          className="nextstep"
        >
          <div className="ico">
            <svg
              className="i"
              style={{ width: 22, height: 22 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="tt">
              Следующий шаг — закрыть блок «{currentBlock.title}»
            </div>
            <div className="ds">
              {curRemaining > 0
                ? `Осталось ${curRemaining} обязательных материал(ов). Отметишь их — блок уйдёт на подтверждение Buddy.`
                : "Все обязательные материалы просмотрены — отправь блок на подтверждение Buddy."}
            </div>
          </div>
          <span className="btn primary">Продолжить блок</span>
        </Link>
      )}

      {/* ============ two columns ============ */}
      <div className="cols c-2-1" style={{ flex: 1 }}>
        {/* left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* roadmap rail */}
          <div className="card card-pad">
            <div className="card-head">
              <h3>Маршрут обучения</h3>
              <span className="meta">
                {totalBlocks} блоков · открываются в любом порядке
              </span>
            </div>

            {sortedBlocks.length === 0 ? (
              <div className="text-[13px] text-text-3 py-4">
                Маршрут ещё не опубликован — загляни позже.
              </div>
            ) : (
              <>
                <div className="rail">
                  {sortedBlocks.map((b, i) => {
                    const bp = blockProgressMap.get(b.id);
                    const status = bp?.status ?? "not_started";
                    const pct = bp?.progress_percent ?? 0;
                    const railState =
                      status === "waiting_buddy_confirmation" ? "waiting" : status;
                    const fill =
                      status === "approved"
                        ? "var(--success)"
                        : status === "waiting_buddy_confirmation"
                          ? "var(--warning)"
                          : status === "in_progress"
                            ? "var(--primary)"
                            : "var(--line-2)";
                    return (
                      <Link
                        key={b.id}
                        to="/student/roadmap"
                        state={{ blockId: b.id }}
                        className="node"
                        data-s={railState}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span className="n num">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {status === "approved" ? (
                            <span className="check">
                              <svg
                                style={{ width: 13, height: 13 }}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <polyline
                                  points="5 12 10 17 19 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          ) : status !== "not_started" ? (
                            <span
                              className="num"
                              style={{
                                fontSize: 11,
                                color: fill,
                                fontWeight: 700,
                              }}
                            >
                              {pct}%
                            </span>
                          ) : null}
                        </div>
                        <div className="t">{b.title}</div>
                        <div className="mini">
                          <i style={{ width: `${pct}%`, background: fill }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 16,
                    fontSize: 12,
                    color: "var(--ink-2)",
                    flexWrap: "wrap",
                  }}
                >
                  <Legend color="var(--success)" label="Закрыт" />
                  <Legend color="var(--primary)" label="В работе" />
                  <Legend color="var(--line-2)" label="Впереди" />
                </div>
              </>
            )}
          </div>

          {/* next achievement */}
          <div className="card card-pad">
            <div className="card-head">
              <h3>Следующее достижение</h3>
              {nextAch && <span className="meta">+{nextAchReward} бонусов</span>}
            </div>
            {nextAch ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <HexBadge
                  glyph={nextAch.achievement.title[0]?.toUpperCase() ?? "?"}
                  imageUrl={nextAch.achievement.image_url}
                  locked
                  size={64}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                    {nextAch.achievement.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      margin: "3px 0 9px",
                    }}
                  >
                    {nextAch.achievement.description ??
                      "Продолжай обучение, чтобы открыть это достижение."}
                  </div>
                  {nextAch.target > 1 && (
                    <div className="lockprog">
                      <span>
                        {nextAch.current} / {nextAch.target}
                      </span>
                      <div className="bar">
                        <i style={{ width: `${nextAchPct}%` }} />
                      </div>
                      <span>{nextAchPct}%</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-text-3 py-2">
                Все доступные достижения получены. Так держать!
              </div>
            )}
          </div>
        </div>

        {/* right column — activity feed */}
        <div
          className="card card-pad"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div className="card-head">
            <h3>Что было недавно</h3>
          </div>

          {activityQ.isLoading ? (
            <div className="text-[13px] text-text-3 py-2">Загрузка событий…</div>
          ) : activity.length === 0 ? (
            <div className="text-[13px] text-text-3 py-2">
              Пока пусто — открой первый материал в Roadmap, и здесь появится лента.
            </div>
          ) : (
            <div className="feed">
              {activity.map((e) => (
                <div className="ev" key={e.id}>
                  <span className={`dot ${dotClass(e.type)}`} />
                  <div>
                    <div
                      className="tx"
                      dangerouslySetInnerHTML={{ __html: feedText(e) }}
                    />
                    <div className="tm">{formatDateTime(e.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: "auto",
              paddingTop: 14,
              borderTop: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <BonusCoin size={12} variant="secondary" />
              {receivedCount} достижений получено
            </span>
            <Link to="/student/profile" className="btn sm ghost">
              Профиль
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: color,
        }}
      />
      {label}
    </span>
  );
}

// ----- activity → лента -----
function dotClass(type: string): string {
  if (type.includes("achievement")) return "s";
  if (type.includes("approved") || type.includes("final")) return "s";
  if (type.includes("material") || type.includes("bonus")) return "p";
  return "";
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function feedText(e: ActivityEvent): string {
  const m = e.metadata ?? {};
  const title = m.title ? `<b>«${esc(m.title)}»</b>` : "";
  switch (e.type) {
    case "material_viewed":
      return `Просмотрен материал ${title}`.trim();
    case "block_approved":
      return `Блок ${title || ""} подтверждён Buddy`.trim();
    case "achievement_unlocked":
      return `Получено достижение ${title}${m.amount ? ` · +${esc(m.amount)}` : ""}`.trim();
    case "interview_added":
    case "interview_added_real":
      return `Добавлено real-собеседование${m.company ? ` — <b>${esc(m.company)}</b>` : ""}`;
    case "mock_created":
      return "Назначено mock-собеседование";
    case "mock_completed":
      return "Mock-собеседование завершено";
    case "interview_updated":
      return "Собеседование обновлено";
    case "final_scheduled":
      return "Финальный этап назначен";
    case "final_completed":
      return "Финальный этап пройден";
    case "final_failed":
      return "Финальный этап не пройден";
    case "bonus_credited":
      return `Начислено ${m.amount ? `<b>${esc(m.amount)}</b> ` : ""}бонусов`;
    case "bonus_debited":
      return `Конвертировано ${m.amount ? `<b>${esc(m.amount)}</b> ` : ""}бонусов в скидку`;
    default:
      return esc(e.type);
  }
}

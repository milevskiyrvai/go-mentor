import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { myProgress } from "@/api/progress";
import { listBlocks } from "@/api/roadmap";
import { myBonuses } from "@/api/bonus";
import { myAchievements } from "@/api/achievements";
import { myFinals } from "@/api/finals";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { AchievementCard } from "@/components/AchievementCard";
import { HexBadge } from "@/components/HexBadge";
import { BonusCoin } from "@/components/BonusCoin";
import { useAuth } from "@/stores/auth";
import { daysSince, formatDate } from "@/lib/format";
import { PageLoader } from "@/components/Spinner";
import { ACHIEVEMENT_REWARDS } from "@/lib/achievements";

export function StudentDashboard() {
  const { user } = useAuth();
  const blocksQ = useQuery({ queryKey: ["blocks"], queryFn: listBlocks });
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: myProgress });
  const bonusesQ = useQuery({ queryKey: ["bonuses"], queryFn: myBonuses });
  const achQ = useQuery({ queryKey: ["achievements"], queryFn: myAchievements });
  const finalsQ = useQuery({ queryKey: ["finals"], queryFn: myFinals });

  if (
    blocksQ.isLoading ||
    progressQ.isLoading ||
    bonusesQ.isLoading ||
    achQ.isLoading ||
    finalsQ.isLoading
  ) {
    return <PageLoader />;
  }

  const blocks = blocksQ.data ?? [];
  const progress = progressQ.data;
  const bonuses = bonusesQ.data;
  const achievements = achQ.data ?? [];
  const finals = finalsQ.data ?? [];

  const days = daysSince(user?.learning_started_at);
  const overall = progress?.overall_percent ?? 0;
  const approved = progress?.approved_blocks ?? 0;
  const totalBlocks = progress?.total_active_blocks ?? blocks.length;

  // current block — первый из in_progress/waiting, иначе first not_started
  const blockProgressMap = new Map(
    progress?.blocks.map((b) => [b.block_id, b]) ?? [],
  );
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
  const currentBlockIdx = sortedBlocks.findIndex((b) => {
    const st = blockProgressMap.get(b.id)?.status;
    return st === "in_progress" || st === "waiting_buddy_confirmation";
  });
  const fallbackIdx = sortedBlocks.findIndex(
    (b) => (blockProgressMap.get(b.id)?.status ?? "not_started") !== "approved",
  );
  const activeIdx = currentBlockIdx !== -1 ? currentBlockIdx : fallbackIdx === -1 ? 0 : fallbackIdx;
  const currentBlock = sortedBlocks[activeIdx];
  const currentProgress = currentBlock ? blockProgressMap.get(currentBlock.id) : undefined;

  const received = achievements.filter((a) => a.received);
  const upcoming = achievements
    .filter((a) => !a.received)
    .sort((a, b) => {
      const pa = a.target > 0 ? a.current / a.target : 0;
      const pb = b.target > 0 ? b.current / b.target : 0;
      return pb - pa;
    })
    .slice(0, 3);

  return (
    <div>
      <PageHeader
        eyebrow={`Привет, ${user?.display_name?.split(" ")[0] ?? ""}`}
        title="Мой прогресс"
        description="Сводка по обучению, бонусам, достижениям и финальным проверкам."
        right={
          <Link to="/student/roadmap" className="btn btn-primary">
            Перейти к Roadmap →
          </Link>
        }
      />

      {/* Top stats row */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <StatCard label="Дней обучения" value={String(days)} hint={formatDate(user?.learning_started_at)} />
        <StatCard
          label="Текущий блок"
          value={currentBlock ? `Блок ${String(activeIdx + 1).padStart(2, "0")}` : "—"}
          hint={currentBlock?.title}
          status={currentProgress?.status}
        />
        <StatCard
          label="Общий прогресс"
          value={`${overall}%`}
          hint={`${approved} / ${totalBlocks} блоков закрыто`}
          renderExtra={<ProgressBar value={overall} className="mt-2" height={6} />}
        />
        <StatCard
          label="Бонусы"
          value={String(bonuses?.balance ?? 0)}
          hint={`Скидка: ${(bonuses?.discount_percent ?? 0).toFixed(0)}% / ${bonuses?.discount_cap ?? 15}%`}
          accent
        />
      </div>

      {/* Roadmap strip */}
      <section className="mb-10">
        <SectionHead title="Маршрут" right={<Link to="/student/roadmap" className="caption hover:text-primary">Все блоки →</Link>} />
        <div className="grid grid-cols-5 gap-3">
          {sortedBlocks.map((b, i) => {
            const bp = blockProgressMap.get(b.id);
            const pct = bp?.progress_percent ?? 0;
            const status = bp?.status ?? "not_started";
            const accent =
              status === "approved"
                ? "var(--success)"
                : status === "waiting_buddy_confirmation"
                  ? "var(--warning)"
                  : status === "in_progress"
                    ? "var(--primary)"
                    : "var(--border-bright)";
            return (
              <Link
                key={b.id}
                to="/student/roadmap"
                state={{ blockId: b.id }}
                className="elevated p-4 flex flex-col gap-3 transition-all hover:border-border-bright"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="font-mono font-bold text-[16px]"
                    style={{ color: accent }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <StatusBadge status={status} />
                </div>
                <div className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[34px]">
                  {b.title}
                </div>
                <ProgressBar
                  value={pct}
                  variant={
                    status === "approved" ? "success" : status === "waiting_buddy_confirmation" ? "warn" : "default"
                  }
                  height={6}
                />
                <div className="font-mono text-[11px] text-text-2 flex justify-between">
                  <span>{bp?.viewed_required ?? 0} / {bp?.total_required ?? 0}</span>
                  <span>{pct}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {/* Finals */}
        <section className="col-span-1">
          <SectionHead title="Финальные этапы" />
          <div className="space-y-3">
            {finals.length === 0 && (
              <div className="card p-6 text-text-3 text-[13px]">Откроются после закрытия всех блоков.</div>
            )}
            {finals.map((f) => (
              <div key={f.id} className="elevated p-4 flex items-center justify-between">
                <div>
                  <div className="caption mb-1">
                    {f.type === "final_technical" ? "Финал" : "Финал"}
                  </div>
                  <div className="text-[15px] font-semibold">
                    {f.type === "final_technical" ? "Техничка" : "Прожарка"}
                  </div>
                  {f.scheduled_at && (
                    <div className="text-[11px] text-text-3 mt-1 font-mono">
                      {formatDate(f.scheduled_at)}
                    </div>
                  )}
                </div>
                <StatusBadge status={f.status} />
              </div>
            ))}
          </div>
        </section>

        {/* Achievements */}
        <section className="col-span-2">
          <SectionHead
            title="Достижения"
            right={
              <Link to="/student/achievements" className="caption hover:text-primary">
                Все ({received.length}/{achievements.length}) →
              </Link>
            }
          />
          <div className="grid grid-cols-3 gap-3">
            {received.slice(0, 3).map((a) => (
              <Link
                key={a.achievement.id}
                to="/student/achievements"
                className="elevated p-4 flex items-center gap-3 hover:border-border-bright"
              >
                <HexBadge glyph={a.achievement.title[0]?.toUpperCase() ?? "?"} size={52} accent="secondary" />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{a.achievement.title}</div>
                  <div className="text-[11px] text-text-2 mt-0.5 flex items-center gap-1">
                    <BonusCoin size={11} variant="secondary" />
                    +{ACHIEVEMENT_REWARDS[a.achievement.title] ?? a.achievement.reward_bonus}
                  </div>
                </div>
              </Link>
            ))}
            {received.length === 0 && (
              <div className="card p-6 text-text-3 text-[13px] col-span-3">
                Пока нет получённых достижений — начните с первого материала roadmap.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Upcoming achievements */}
      {upcoming.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Следующие достижения" />
          <div className="grid grid-cols-3 gap-4">
            {upcoming.map((a) => (
              <AchievementCard key={a.achievement.id} item={a} variantAccent="secondary" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  status?: string;
  accent?: boolean;
  renderExtra?: React.ReactNode;
}
function StatCard({ label, value, hint, status, accent, renderExtra }: StatCardProps) {
  return (
    <div className="elevated p-5 flex flex-col gap-1 relative overflow-hidden">
      {accent && (
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(closest-side, rgba(255,61,154,0.2), transparent 70%)",
          }}
        />
      )}
      <div className="caption">{label}</div>
      <div className={`font-mono font-bold text-[32px] -tracking-[0.02em] ${accent ? "text-secondary" : "text-text"}`}>
        {value}
      </div>
      {hint && <div className="text-[12px] text-text-2 leading-snug">{hint}</div>}
      {status && <div className="mt-2"><StatusBadge status={status} /></div>}
      {renderExtra}
    </div>
  );
}

function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-3 mb-5">
      <h2 className="text-[18px] font-semibold -tracking-tight">{title}</h2>
      {right}
    </div>
  );
}

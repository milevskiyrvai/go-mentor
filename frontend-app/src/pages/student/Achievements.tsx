import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { myAchievements } from "@/api/achievements";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { AchievementCard } from "@/components/AchievementCard";
import { HexBadge } from "@/components/HexBadge";
import { ACHIEVEMENT_REWARDS } from "@/lib/achievements";
import type { AchievementProgressItem } from "@/api/types";

type Filter = "all" | "received" | "locked";

function rewardOf(a: AchievementProgressItem): number {
  const override = ACHIEVEMENT_REWARDS[a.achievement.title];
  return override ?? a.achievement.reward_bonus ?? 0;
}

export function StudentAchievements() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["achievements"],
    queryFn: myAchievements,
  });
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => data ?? [], [data]);
  const received = useMemo(() => items.filter((i) => i.received), [items]);
  const locked = useMemo(() => items.filter((i) => !i.received), [items]);

  // Заработанные бонусы = сумма наград полученных достижений (ТЗ §14).
  const earnedBonus = useMemo(
    () => received.reduce((sum, a) => sum + rewardOf(a), 0),
    [received],
  );

  // Самое «близкое» к получению locked-достижение → для inline-превью «печати».
  const nextUp = useMemo(() => {
    const candidates = locked.filter((l) => l.target > 0 && l.current > 0);
    if (candidates.length === 0) return undefined;
    return [...candidates].sort(
      (a, b) => b.current / b.target - a.current / a.target,
    )[0];
  }, [locked]);

  // Превью в карточке коллекции: либо последнее полученное, либо ближайшее.
  const previewItem = received[received.length - 1] ?? nextUp;

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <div>
        <PageHeader
          eyebrow="Коллекция"
          title="Достижения"
          description="Открывайте печати-медальоны за пройденные этапы. Каждое достижение — это бонусы и место в коллекции."
        />
        <div className="card card-pad flex flex-col items-center text-center gap-3 py-16">
          <div className="text-[15px] font-semibold">Не удалось загрузить достижения</div>
          <p className="text-text-2 text-[13px] max-w-sm">
            Произошла ошибка при обращении к серверу. Попробуйте обновить.
          </p>
          <button className="btn btn-primary" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Обновляем…" : "Повторить"}
          </button>
        </div>
      </div>
    );
  }

  const total = items.length;
  const collectedPct = total > 0 ? Math.round((received.length / total) * 100) : 0;
  const visible = filter === "received" ? received : filter === "locked" ? locked : items;

  return (
    <div>
      {/* ===== page head: subtitle + статус-пилюли ===== */}
      <PageHeader
        eyebrow="Коллекция"
        title="Достижения"
        description={
          <>
            Собрано <b className="text-text font-semibold">{received.length}</b> из{" "}
            <b className="text-text font-semibold">{total}</b> · заработано{" "}
            <b className="text-secondary font-semibold">{earnedBonus}</b> бонусов
          </>
        }
        right={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <span className="pill approved">
              <span className="led" />
              {received.length} получено
            </span>
            <span className="pill not-started">
              <span className="led" />
              {locked.length} в процессе
            </span>
          </div>
        }
      />

      {/* ===== collection meter + inline toast preview ===== */}
      <div className="card card-pad flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-[14px] font-bold">Коллекция достижений</span>
            <span className="font-mono text-[14px] text-text-2">
              {received.length} / {total}
            </span>
          </div>
          <div className="bar" style={{ height: 10 }}>
            <i
              style={{ width: `${collectedPct}%`, background: "var(--secondary)" }}
            />
          </div>
        </div>

        {previewItem && (
          <div className="toast lg:max-w-[360px] w-full">
            <HexBadge
              glyph={glyphForTitle(previewItem.achievement.title)}
              locked={!previewItem.received}
              accent={previewItem.received ? "secondary" : "primary"}
              imageUrl={previewItem.achievement.image_url}
              size={48}
            />
            <div className="tb">
              <span className="e">
                {previewItem.received ? "Достижение получено" : "Почти получено"}
              </span>
              <b>{previewItem.achievement.title}</b>
              {previewItem.achievement.description && (
                <span>{previewItem.achievement.description}</span>
              )}
            </div>
            <span className="rw">+{rewardOf(previewItem)}</span>
          </div>
        )}
      </div>

      {/* ===== фильтры ===== */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          Все ({total})
        </FilterBtn>
        <FilterBtn active={filter === "received"} onClick={() => setFilter("received")}>
          Получено ({received.length})
        </FilterBtn>
        <FilterBtn active={filter === "locked"} onClick={() => setFilter("locked")}>
          В процессе ({locked.length})
        </FilterBtn>
      </div>

      {/* ===== grid ===== */}
      {total === 0 ? (
        <div className="card card-pad flex flex-col items-center text-center gap-3 py-16">
          <HexBadge glyph="✦" locked size={72} />
          <div className="text-[15px] font-semibold">Пока нет достижений</div>
          <p className="text-text-2 text-[13px] max-w-sm">
            Открывайте roadmap, проходите блоки и собеседования — печати-медальоны
            появятся здесь автоматически.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="card card-pad text-text-3 text-[13px] text-center py-16">
          {filter === "received"
            ? "Вы ещё не получили ни одного достижения."
            : "Все достижения уже собраны — отличная коллекция!"}
        </div>
      ) : (
        <div className="ach-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((a, idx) => (
            <AchievementCard
              key={a.achievement.id}
              item={a}
              variantAccent={idx % 3 === 1 ? "secondary" : "primary"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={`btn btn-sm ${active ? "btn-primary" : ""}`}>
      {children}
    </button>
  );
}

// Глиф печати по названию (повторяет логику AchievementCard для превью).
function glyphForTitle(title: string): string {
  if (/финал/i.test(title)) return "★";
  if (/блок\s*1/i.test(title)) return "1";
  if (/блок\s*2/i.test(title)) return "2";
  if (/блок\s*3/i.test(title)) return "3";
  if (/блок\s*4/i.test(title)) return "4";
  if (/блок\s*5/i.test(title)) return "5";
  if (/mock/i.test(title)) return "M";
  if (/real|серия/i.test(title)) return "R";
  if (/профиль/i.test(title)) return "P";
  if (/1x1|1×1/i.test(title)) return "★";
  if (/первый шаг/i.test(title)) return "✦";
  if (/разогрев/i.test(title)) return "✦";
  if (/фокус/i.test(title)) return "◎";
  return title.slice(0, 1).toUpperCase();
}

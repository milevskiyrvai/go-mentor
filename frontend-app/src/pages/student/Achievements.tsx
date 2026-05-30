import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { myAchievements } from "@/api/achievements";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { AchievementCard } from "@/components/AchievementCard";

export function StudentAchievements() {
  const { data, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: myAchievements,
  });
  const [filter, setFilter] = useState<"all" | "received" | "locked">("all");

  if (isLoading) return <PageLoader />;

  const items = data ?? [];
  const received = items.filter((i) => i.received);
  const locked = items.filter((i) => !i.received);
  const visible =
    filter === "received" ? received : filter === "locked" ? locked : items;

  return (
    <div>
      <PageHeader
        eyebrow="Коллекция"
        title="Достижения"
        description="Открывайте бейджи за пройденные этапы. Каждое достижение — это бонусы и место в коллекции."
        right={
          <div className="flex flex-col items-end">
            <div className="caption">Получено</div>
            <div className="font-mono font-bold text-secondary text-[26px]">
              {received.length} / {items.length}
            </div>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-7">
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          Все ({items.length})
        </FilterBtn>
        <FilterBtn active={filter === "received"} onClick={() => setFilter("received")}>
          Получено ({received.length})
        </FilterBtn>
        <FilterBtn active={filter === "locked"} onClick={() => setFilter("locked")}>
          Закрыто ({locked.length})
        </FilterBtn>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {visible.map((a, idx) => (
          <AchievementCard
            key={a.achievement.id}
            item={a}
            variantAccent={idx % 2 === 0 ? "primary" : "secondary"}
          />
        ))}
        {visible.length === 0 && (
          <div className="col-span-4 text-text-3 text-[13px] text-center py-16">
            Нет достижений в выбранной категории.
          </div>
        )}
      </div>
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
    <button
      onClick={onClick}
      className={`btn btn-sm ${active ? "btn-primary" : ""}`}
    >
      {children}
    </button>
  );
}

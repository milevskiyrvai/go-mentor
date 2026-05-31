import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBlock, listBlocks } from "@/api/roadmap";
import { markViewed, myProgress, unmarkViewed } from "@/api/progress";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, Spinner } from "@/components/Spinner";
import { RoadmapBlockCard } from "@/components/RoadmapBlockCard";
import { MaterialCard } from "@/components/MaterialCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { BlockProgressSummary, MaterialType, RoadmapMaterial } from "@/api/types";

const SECTION_ORDER: MaterialType[] = ["theory", "questions", "practice", "homework"];
const SECTION_LABEL: Record<MaterialType, string> = {
  theory: "Теория",
  questions: "Вопросы",
  practice: "Практика",
  homework: "Домашка",
};

export function StudentRoadmap() {
  const location = useLocation() as { state?: { blockId?: string } };
  const queryClient = useQueryClient();

  const blocksQ = useQuery({ queryKey: ["blocks"], queryFn: listBlocks });
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: myProgress });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedBlocks = useMemo(
    () => (blocksQ.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [blocksQ.data],
  );

  const progressMap = useMemo(
    () => new Map<string, BlockProgressSummary>(
      (progressQ.data?.blocks ?? []).map((b) => [b.block_id, b]),
    ),
    [progressQ.data],
  );

  const viewedSet = useMemo(
    () => new Set(progressQ.data?.viewed_material_ids ?? []),
    [progressQ.data],
  );

  // Начальный выбор: из навигации или первый незакрытый блок.
  useEffect(() => {
    if (selectedId || sortedBlocks.length === 0) return;
    if (location.state?.blockId && sortedBlocks.some((b) => b.id === location.state!.blockId)) {
      setSelectedId(location.state.blockId!);
      return;
    }
    const firstOpen = sortedBlocks.find(
      (b) => (progressMap.get(b.id)?.status ?? "not_started") !== "approved",
    );
    setSelectedId((firstOpen ?? sortedBlocks[0]).id);
  }, [sortedBlocks, progressMap, location.state, selectedId]);

  const selectedIndex = sortedBlocks.findIndex((b) => b.id === selectedId);

  const detailQ = useQuery({
    queryKey: ["block", selectedId],
    queryFn: () => getBlock(selectedId!),
    enabled: !!selectedId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    queryClient.invalidateQueries({ queryKey: ["block", selectedId] });
  };
  const markMut = useMutation({ mutationFn: markViewed, onSuccess: invalidate });
  const unmarkMut = useMutation({ mutationFn: unmarkViewed, onSuccess: invalidate });
  const toggling = markMut.isPending || unmarkMut.isPending;

  // ---------- Loading / error / empty (страница) ----------
  if (blocksQ.isLoading || progressQ.isLoading) return <PageLoader />;

  if (blocksQ.isError || progressQ.isError) {
    return (
      <div>
        <PageHeader eyebrow="Маршрут" title="Roadmap" />
        <div className="card card-pad text-center text-[14px] text-text-2">
          Не удалось загрузить маршрут.{" "}
          <button
            className="text-primary font-semibold hover:underline"
            onClick={() => {
              blocksQ.refetch();
              progressQ.refetch();
            }}
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const overall = Math.round(progressQ.data?.overall_percent ?? 0);
  const approvedCount = progressQ.data?.approved_blocks ?? 0;
  const totalCount = progressQ.data?.total_active_blocks ?? sortedBlocks.length;

  const inProgressBlock = sortedBlocks.find(
    (b) => progressMap.get(b.id)?.status === "in_progress",
  );

  const subParts: string[] = [];
  if (totalCount > 0) subParts.push(`${approvedCount} из ${totalCount} блоков закрыто`);
  if (inProgressBlock) subParts.push(`блок «${inProgressBlock.title}» в работе`);

  if (sortedBlocks.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Маршрут" title="Roadmap" />
        <div className="card card-pad text-center">
          <h3 className="text-[16px] font-bold mb-1">Маршрут пока пуст</h3>
          <p className="text-[13px] text-text-2">
            Блоки обучения ещё не опубликованы. Загляните позже.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Маршрут"
        title="Roadmap"
        description={subParts.join(" · ") || undefined}
        right={
          <span className="pill approved">
            <span className="led" />
            {overall}% программы
          </span>
        }
      />

      {/* ===== Two-column: список блоков + детали выбранного ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4 items-start">
        {/* LEFT: список блоков */}
        <div className="flex flex-col gap-3.5">
          {sortedBlocks.map((b, i) => (
            <RoadmapBlockCard
              key={b.id}
              index={i}
              block={b}
              progress={progressMap.get(b.id)}
              viewedIds={viewedSet}
              active={selectedId === b.id}
              onClick={() => setSelectedId(b.id)}
            />
          ))}
        </div>

        {/* RIGHT: детали выбранного блока */}
        <BlockDetail
          loading={detailQ.isLoading}
          error={detailQ.isError}
          onRetry={() => detailQ.refetch()}
          title={detailQ.data?.block.title}
          numLabel={selectedIndex >= 0 ? String(selectedIndex + 1).padStart(2, "0") : "—"}
          status={selectedId ? progressMap.get(selectedId)?.status : undefined}
          progress={selectedId ? progressMap.get(selectedId) : undefined}
          materials={detailQ.data?.materials ?? []}
          viewedSet={viewedSet}
          toggling={toggling}
          onToggle={(m) =>
            viewedSet.has(m.id) ? unmarkMut.mutate(m.id) : markMut.mutate(m.id)
          }
        />
      </div>
    </div>
  );
}

/* ============================================================
   Правая панель: детали блока с материалами по секциям
   ============================================================ */
interface DetailProps {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  numLabel: string;
  title?: string;
  status?: BlockProgressSummary["status"];
  progress?: BlockProgressSummary;
  materials: RoadmapMaterial[];
  viewedSet: Set<string>;
  toggling: boolean;
  onToggle: (m: RoadmapMaterial) => void;
}

function BlockDetail({
  loading,
  error,
  onRetry,
  numLabel,
  title,
  status,
  progress,
  materials,
  viewedSet,
  toggling,
  onToggle,
}: DetailProps) {
  const active = materials.filter((m) => m.is_active);

  const viewedCount = active.filter((m) => viewedSet.has(m.id)).length;
  const requiredLeft = active.filter((m) => m.is_required && !viewedSet.has(m.id)).length;

  const pct = Math.round(progress?.progress_percent ?? 0);

  const statusPillClass =
    status === "approved"
      ? "approved"
      : status === "waiting_buddy_confirmation"
        ? "waiting"
        : status === "in_progress"
          ? "in-progress"
          : "not-started";
  const statusLabel =
    status === "approved"
      ? "Закрыт"
      : status === "waiting_buddy_confirmation"
        ? "Ждём Buddy"
        : status === "in_progress"
          ? `В работе · ${pct}%`
          : "Не начат";

  // Группировка материалов по секциям (порядок секций фиксированный).
  const groups = SECTION_ORDER.map((type) => {
    const list = active
      .filter((m) => m.type === type)
      .sort((a, b) => a.sort_order - b.sort_order);
    const done = list.filter((m) => viewedSet.has(m.id)).length;
    return { type, list, done };
  }).filter((g) => g.list.length > 0);

  return (
    <div className="card flex flex-col overflow-hidden lg:sticky lg:top-6 min-h-[280px]">
      {/* header */}
      <div className="flex items-center gap-3.5 px-5 py-4 border-b border-border">
        <div
          className="block-num"
          style={{
            width: 46,
            height: 46,
            flex: "0 0 46px",
            background: "var(--primary-soft)",
            color: "var(--primary-ink)",
            borderColor: "transparent",
          }}
        >
          {numLabel}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[18px] font-bold -tracking-tight truncate">
            {loading ? "Загрузка…" : title ?? "Блок не выбран"}
          </h3>
          {!loading && !error && active.length > 0 && (
            <div className="text-[12.5px] text-text-2 mt-0.5">
              {active.length} материалов · {viewedCount} просмотрено
              {requiredLeft > 0 && ` · ${requiredLeft} обязательных осталось`}
            </div>
          )}
        </div>
        {!loading && status && (
          <span className={`pill ${statusPillClass}`}>
            <span className="led" />
            {statusLabel}
          </span>
        )}
      </div>

      {/* body */}
      <div className="p-5 flex flex-col gap-6">
        {loading && (
          <div className="flex items-center justify-center py-14">
            <Spinner size={28} />
          </div>
        )}

        {!loading && error && (
          <div className="text-center text-[13px] text-text-2 py-10">
            Не удалось загрузить блок.{" "}
            <button className="text-primary font-semibold hover:underline" onClick={onRetry}>
              Повторить
            </button>
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="text-center text-[13px] text-text-3 py-10">
            В этом блоке пока нет материалов.
          </div>
        )}

        {!loading &&
          !error &&
          groups.map((g) => (
            <div key={g.type} className="flex flex-col gap-2.5">
              {/* group header */}
              <div className="flex items-center gap-2.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-text">
                  {SECTION_LABEL[g.type]}
                </span>
                <span
                  className={`num text-[12px] font-bold ${
                    g.done < g.list.length ? "text-primary" : "text-text-3"
                  }`}
                >
                  {g.done} / {g.list.length}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              {g.list.map((m) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  viewed={viewedSet.has(m.id)}
                  onToggle={toggling ? undefined : () => onToggle(m)}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

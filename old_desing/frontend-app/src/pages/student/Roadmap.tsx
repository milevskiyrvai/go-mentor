import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBlock, listBlocks } from "@/api/roadmap";
import { markViewed, myProgress, unmarkViewed } from "@/api/progress";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { RoadmapBlockCard } from "@/components/RoadmapBlockCard";
import { MaterialCard } from "@/components/MaterialCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import type { RoadmapMaterial } from "@/api/types";

const SECTION_LABEL: Record<RoadmapMaterial["type"], string> = {
  theory: "Теория",
  questions: "Вопросы",
  practice: "Практика",
  homework: "Домашка",
};

export function StudentRoadmap() {
  const location = useLocation() as { state?: { blockId?: string } };
  const blocksQ = useQuery({ queryKey: ["blocks"], queryFn: listBlocks });
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: myProgress });
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<RoadmapMaterial["type"] | "all">("all");

  const sortedBlocks = useMemo(
    () => (blocksQ.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [blocksQ.data],
  );

  const progressMap = useMemo(() => {
    const m = new Map(progressQ.data?.blocks.map((b) => [b.block_id, b]) ?? []);
    return m;
  }, [progressQ.data]);

  const viewedSet = useMemo(
    () => new Set(progressQ.data?.viewed_material_ids ?? []),
    [progressQ.data],
  );

  // initial expand: from state or first non-approved
  useEffect(() => {
    if (expandedId) return;
    if (location.state?.blockId) {
      setExpandedId(location.state.blockId);
      return;
    }
    const first = sortedBlocks.find((b) => {
      const st = progressMap.get(b.id)?.status ?? "not_started";
      return st !== "approved";
    });
    if (first) setExpandedId(first.id);
  }, [sortedBlocks, progressMap, location.state, expandedId]);

  const expandedBlockQ = useQuery({
    queryKey: ["block", expandedId],
    queryFn: () => getBlock(expandedId!),
    enabled: !!expandedId,
  });

  const markMut = useMutation({
    mutationFn: markViewed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["block", expandedId] });
    },
  });
  const unmarkMut = useMutation({
    mutationFn: unmarkViewed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["block", expandedId] });
    },
  });

  if (blocksQ.isLoading || progressQ.isLoading) return <PageLoader />;

  const overall = progressQ.data?.overall_percent ?? 0;

  const materials = expandedBlockQ.data?.materials ?? [];
  const filteredMaterials =
    tab === "all" ? materials : materials.filter((m) => m.type === tab);

  return (
    <div>
      <PageHeader
        eyebrow="Маршрут"
        title="Roadmap обучения"
        description="Идите блоками по порядку или открывайте любой — материалы доступны в любом порядке."
        right={
          <div className="flex flex-col items-end">
            <div className="caption">Общий прогресс</div>
            <div className="font-mono font-bold text-primary text-[26px]">{overall}%</div>
          </div>
        }
      />

      {/* Blocks grid */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {sortedBlocks.map((b, i) => (
          <RoadmapBlockCard
            key={b.id}
            index={i}
            block={b}
            progress={progressMap.get(b.id)}
            viewedIds={viewedSet}
            active={expandedId === b.id}
            onClick={() => setExpandedId(b.id === expandedId ? null : b.id)}
          />
        ))}
      </div>

      {/* Expanded block detail */}
      {expandedId && expandedBlockQ.data && (
        <section className="elevated p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="caption mb-1">
                Блок {String(sortedBlocks.findIndex((b) => b.id === expandedId) + 1).padStart(2, "0")}
              </div>
              <h2 className="text-[24px] font-bold -tracking-tight">
                {expandedBlockQ.data.block.title}
              </h2>
              {expandedBlockQ.data.block.description && (
                <p className="text-text-2 mt-1.5 max-w-2xl text-[14px] leading-snug">
                  {expandedBlockQ.data.block.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {progressMap.get(expandedId) && (
                <StatusBadge status={progressMap.get(expandedId)!.status} />
              )}
              {progressMap.get(expandedId)?.status === "waiting_buddy_confirmation" && (
                <div className="text-[11px] text-warning font-mono uppercase tracking-wider">
                  Все обязательные пройдены — ждём Buddy
                </div>
              )}
            </div>
          </div>

          {progressMap.get(expandedId) && (
            <div className="mb-5">
              <ProgressBar
                value={progressMap.get(expandedId)!.progress_percent}
                variant={
                  progressMap.get(expandedId)!.status === "approved"
                    ? "success"
                    : progressMap.get(expandedId)!.status === "waiting_buddy_confirmation"
                      ? "warn"
                      : "default"
                }
                showLabel
              />
            </div>
          )}

          {/* tabs */}
          <div className="flex items-center gap-2 mb-5 border-b border-border">
            <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
              Все ({materials.length})
            </TabBtn>
            {(["theory", "questions", "practice", "homework"] as const).map((t) => {
              const cnt = materials.filter((m) => m.type === t).length;
              if (cnt === 0) return null;
              return (
                <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>
                  {SECTION_LABEL[t]} ({cnt})
                </TabBtn>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            {filteredMaterials.length === 0 && (
              <div className="text-text-3 text-[13px]">Материалов пока нет.</div>
            )}
            {filteredMaterials.map((m) => (
              <MaterialCard
                key={m.id}
                material={m}
                viewed={viewedSet.has(m.id)}
                onToggle={() =>
                  viewedSet.has(m.id) ? unmarkMut.mutate(m.id) : markMut.mutate(m.id)
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TabBtn({
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
      className={`px-4 py-2.5 text-[13px] font-medium transition-all border-b-2 -mb-[1px] ${
        active ? "border-primary text-text" : "border-transparent text-text-2 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

import { api } from "./client";
import type { RoadmapBlock, RoadmapMaterial } from "./types";

export async function listBlocks(): Promise<RoadmapBlock[]> {
  const { data } = await api.get<{ items: RoadmapBlock[] }>("/roadmap/blocks");
  return data.items ?? [];
}

export async function getBlock(id: string): Promise<{ block: RoadmapBlock; materials: RoadmapMaterial[] }> {
  const { data } = await api.get<{ block: RoadmapBlock; materials: RoadmapMaterial[] }>(
    `/roadmap/blocks/${id}`,
  );
  // Backend returns `null` for empty array fields — normalize to [] so consumers
  // can safely call `.length` / `.map` without runtime crashes.
  return { ...data, materials: data.materials ?? [] };
}

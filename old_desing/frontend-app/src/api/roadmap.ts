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
  return data;
}

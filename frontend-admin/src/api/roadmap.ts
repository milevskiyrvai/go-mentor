import { apiClient } from "./client";
import type {
  BlockDetailResponse,
  ContentType,
  MaterialKind,
  PreviewMetadata,
  RoadmapBlock,
  RoadmapMaterial,
} from "./types";

export async function listBlocks(includeInactive = true): Promise<RoadmapBlock[]> {
  const { data } = await apiClient.get<{ items: RoadmapBlock[] }>(
    `/roadmap/blocks?include_inactive=${includeInactive}`
  );
  return data.items ?? [];
}

export async function getBlock(id: string, includeInactive = true): Promise<BlockDetailResponse> {
  const { data } = await apiClient.get<BlockDetailResponse>(
    `/roadmap/blocks/${id}?include_inactive=${includeInactive}`
  );
  return data;
}

export interface CreateBlockBody {
  title: string;
  description?: string;
}

export async function createBlock(body: CreateBlockBody): Promise<RoadmapBlock> {
  const { data } = await apiClient.post<RoadmapBlock>("/admin/roadmap/blocks", body);
  return data;
}

export interface UpdateBlockBody {
  title?: string;
  description?: string;
  is_active?: boolean;
}

export async function updateBlock(id: string, body: UpdateBlockBody): Promise<RoadmapBlock> {
  const { data } = await apiClient.patch<RoadmapBlock>(`/admin/roadmap/blocks/${id}`, body);
  return data;
}

export async function deleteBlock(id: string): Promise<void> {
  await apiClient.delete(`/admin/roadmap/blocks/${id}`);
}

export async function reorderBlocks(orderedIds: string[]): Promise<void> {
  await apiClient.post("/admin/roadmap/blocks/reorder", { ordered_ids: orderedIds });
}

export interface CreateMaterialBody {
  block_id: string;
  title: string;
  description?: string;
  type: MaterialKind;
  content_type: ContentType;
  url?: string;
  content?: string;
  preview_title?: string;
  preview_description?: string;
  preview_image?: string;
  source?: string;
  is_required: boolean;
}

export async function createMaterial(body: CreateMaterialBody): Promise<RoadmapMaterial> {
  const { data } = await apiClient.post<RoadmapMaterial>("/admin/roadmap/materials", body);
  return data;
}

export interface UpdateMaterialBody {
  title?: string;
  description?: string;
  type?: MaterialKind;
  content_type?: ContentType;
  url?: string;
  content?: string;
  preview_title?: string;
  preview_description?: string;
  preview_image?: string;
  source?: string;
  is_required?: boolean;
  is_active?: boolean;
}

export async function updateMaterial(id: string, body: UpdateMaterialBody): Promise<RoadmapMaterial> {
  const { data } = await apiClient.patch<RoadmapMaterial>(`/admin/roadmap/materials/${id}`, body);
  return data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await apiClient.delete(`/admin/roadmap/materials/${id}`);
}

export async function reorderMaterials(blockId: string, orderedIds: string[]): Promise<void> {
  await apiClient.post("/admin/roadmap/materials/reorder", {
    block_id: blockId,
    ordered_ids: orderedIds,
  });
}

export async function fetchPreview(url: string): Promise<PreviewMetadata> {
  const { data } = await apiClient.post<PreviewMetadata>("/admin/roadmap/materials/fetch-preview", {
    url,
  });
  return data;
}

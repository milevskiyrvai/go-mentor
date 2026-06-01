import { api } from "./client";
import type { StudentProgressSummary } from "./types";

// The Go backend serializes empty slices as JSON `null`. Normalize the nested
// array fields to [] so consumers can safely call `.map` / `.length`.
function normalizeProgress(data: StudentProgressSummary): StudentProgressSummary {
  return {
    ...data,
    blocks: data.blocks ?? [],
    viewed_material_ids: data.viewed_material_ids ?? [],
  };
}

export async function myProgress(): Promise<StudentProgressSummary> {
  const { data } = await api.get<StudentProgressSummary>("/me/progress");
  return normalizeProgress(data);
}

export async function studentProgress(studentId: string): Promise<StudentProgressSummary> {
  const { data } = await api.get<StudentProgressSummary>(`/users/${studentId}/progress`);
  return normalizeProgress(data);
}

export async function markViewed(materialId: string): Promise<void> {
  await api.post(`/me/materials/${materialId}/view`);
}

export async function unmarkViewed(materialId: string): Promise<void> {
  await api.delete(`/me/materials/${materialId}/view`);
}

export async function approveBlock(blockId: string, studentId: string): Promise<void> {
  await api.post(`/roadmap/blocks/${blockId}/approve`, { student_id: studentId });
}

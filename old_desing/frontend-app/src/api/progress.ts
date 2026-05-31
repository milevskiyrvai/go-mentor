import { api } from "./client";
import type { StudentProgressSummary } from "./types";

export async function myProgress(): Promise<StudentProgressSummary> {
  const { data } = await api.get<StudentProgressSummary>("/me/progress");
  return data;
}

export async function studentProgress(studentId: string): Promise<StudentProgressSummary> {
  const { data } = await api.get<StudentProgressSummary>(`/users/${studentId}/progress`);
  return data;
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

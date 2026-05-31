import { apiClient } from "./client";
import type { AdminStats } from "./types";

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>("/admin/stats");
  return data;
}

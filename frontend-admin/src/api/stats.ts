import { apiClient } from "./client";
import type { AdminStats } from "./types";

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>("/admin/stats");
  // Go backend serializes empty slices as `null` — normalize nested arrays.
  return { ...data, recent_one_on_one: data.recent_one_on_one ?? [] };
}

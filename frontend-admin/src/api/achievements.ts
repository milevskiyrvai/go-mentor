import { apiClient } from "./client";
import type { Achievement } from "./types";

export async function listAchievements(includeInactive = true): Promise<Achievement[]> {
  const { data } = await apiClient.get<{ items: Achievement[] }>(
    `/achievements?include_inactive=${includeInactive}`
  );
  return data.items ?? [];
}

export interface CreateAchievementBody {
  title: string;
  description?: string;
  reward_bonus: number;
  image_url?: string;
  condition_type: string;
  condition_params?: unknown;
  sort_order?: number;
}

export async function createAchievement(body: CreateAchievementBody): Promise<Achievement> {
  const { data } = await apiClient.post<Achievement>("/admin/achievements/", body);
  return data;
}

export interface UpdateAchievementBody {
  title?: string;
  description?: string;
  reward_bonus?: number;
  image_url?: string;
  condition_type?: string;
  condition_params?: unknown;
  sort_order?: number;
  is_active?: boolean;
}

export async function updateAchievement(id: string, body: UpdateAchievementBody): Promise<Achievement> {
  const { data } = await apiClient.patch<Achievement>(`/admin/achievements/${id}`, body);
  return data;
}

export async function listAchievementUsers(id: string): Promise<string[]> {
  const { data } = await apiClient.get<{ user_ids: string[] }>(`/admin/achievements/${id}/users`);
  return data.user_ids ?? [];
}

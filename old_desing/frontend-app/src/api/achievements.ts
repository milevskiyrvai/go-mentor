import { api } from "./client";
import type { Achievement, AchievementProgressItem } from "./types";

export async function listAchievements(): Promise<Achievement[]> {
  const { data } = await api.get<{ items: Achievement[] }>("/achievements");
  return data.items ?? [];
}

export async function myAchievements(): Promise<AchievementProgressItem[]> {
  const { data } = await api.get<{ items: AchievementProgressItem[] }>("/me/achievements");
  return data.items ?? [];
}

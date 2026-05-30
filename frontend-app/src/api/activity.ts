import { api } from "./client";
import type { ActivityEvent, Notification } from "./types";

export async function listStudentActivity(studentId: string, limit = 100): Promise<ActivityEvent[]> {
  const { data } = await api.get<{ items: ActivityEvent[] }>(
    `/users/${studentId}/activity?limit=${limit}`,
  );
  return data.items ?? [];
}

export async function listNotifications(onlyUnread = false): Promise<Notification[]> {
  const q = onlyUnread ? "?only_unread=true&limit=50" : "?limit=50";
  const { data } = await api.get<{ items: Notification[] }>(`/me/notifications${q}`);
  return data.items ?? [];
}

export async function markNotificationsRead(ids?: number[]): Promise<void> {
  await api.post("/me/notifications/read", ids ? { ids } : {});
}

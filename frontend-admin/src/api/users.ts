import { apiClient } from "./client";
import type { CreateUserBody, Role, UpdateUserBody, User, UserListItem } from "./types";

// Go backend serializes empty/nil slices as JSON `null`. Normalize `roles` to []
// so consumers can safely call `.includes` / `.map` / `.length`.
function normalizeUser<T extends { roles?: Role[] }>(u: T): T {
  return { ...u, roles: u.roles ?? [] };
}

export interface ListUsersFilter {
  role?: "" | Role;
  include_deleted?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listUsers(filter: ListUsersFilter = {}): Promise<UserListItem[]> {
  const params = new URLSearchParams();
  if (filter.role) params.set("role", filter.role);
  if (filter.include_deleted) params.set("include_deleted", "true");
  if (filter.q) params.set("q", filter.q);
  if (filter.limit) params.set("limit", String(filter.limit));
  if (filter.offset) params.set("offset", String(filter.offset));
  const { data } = await apiClient.get<{ items: UserListItem[] }>(`/admin/users/?${params.toString()}`);
  return (data.items ?? []).map(normalizeUser);
}

export async function createUser(body: CreateUserBody): Promise<User> {
  const { data } = await apiClient.post<User>("/admin/users/", body);
  return normalizeUser(data);
}

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/admin/users/${id}`);
  return normalizeUser(data);
}

export async function updateUser(id: string, body: UpdateUserBody): Promise<User> {
  const { data } = await apiClient.patch<User>(`/admin/users/${id}`, body);
  return normalizeUser(data);
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}

export async function resetPassword(id: string, newPassword: string): Promise<void> {
  await apiClient.post(`/admin/users/${id}/reset-password`, { new_password: newPassword });
}

export async function assignBuddy(studentId: string, buddyId: string): Promise<void> {
  await apiClient.post(`/admin/users/${studentId}/assign-buddy`, { buddy_id: buddyId });
}

export async function unassignBuddy(studentId: string): Promise<void> {
  await apiClient.delete(`/admin/users/${studentId}/assign-buddy`);
}

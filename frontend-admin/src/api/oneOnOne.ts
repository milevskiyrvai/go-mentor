import { apiClient } from "./client";
import type { OneOnOneRequest, OneOnOneStatus } from "./types";

export async function listOneOnOne(status?: OneOnOneStatus | ""): Promise<OneOnOneRequest[]> {
  const params = status ? `?status=${status}` : "";
  const { data } = await apiClient.get<{ items: OneOnOneRequest[] }>(`/admin/one-on-one/${params}`);
  return data.items ?? [];
}

export async function approveOneOnOne(id: string): Promise<OneOnOneRequest> {
  const { data } = await apiClient.post<OneOnOneRequest>(`/admin/one-on-one/${id}/approve`);
  return data;
}

export async function rejectOneOnOne(id: string): Promise<OneOnOneRequest> {
  const { data } = await apiClient.post<OneOnOneRequest>(`/admin/one-on-one/${id}/reject`);
  return data;
}

export async function completeOneOnOne(id: string): Promise<OneOnOneRequest> {
  const { data } = await apiClient.post<OneOnOneRequest>(`/admin/one-on-one/${id}/complete`);
  return data;
}

export async function cancelOneOnOne(id: string): Promise<OneOnOneRequest> {
  const { data } = await apiClient.post<OneOnOneRequest>(`/admin/one-on-one/${id}/cancel`);
  return data;
}

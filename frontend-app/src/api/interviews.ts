import { api } from "./client";
import type { Interview } from "./types";

export interface AddRealDto {
  url: string;
  company?: string;
  position?: string;
  grade?: string;
  stack?: string;
  date?: string;
  result?: string;
}

export interface CreateMockDto {
  student_id: string;
  company?: string;
  position?: string;
  grade?: string;
  stack?: string;
  date?: string;
}

export interface UpdateInterviewDto {
  url?: string;
  company?: string;
  position?: string;
  grade?: string;
  stack?: string;
  date?: string;
  status?: string;
  result?: string;
  feedback?: string;
}

export async function myInterviews(type?: "mock" | "real"): Promise<Interview[]> {
  const q = type ? `?type=${type}` : "";
  const { data } = await api.get<{ items: Interview[] }>(`/me/interviews${q}`);
  return data.items ?? [];
}

export async function studentInterviews(studentId: string, type?: "mock" | "real"): Promise<Interview[]> {
  const q = type ? `?type=${type}` : "";
  const { data } = await api.get<{ items: Interview[] }>(`/users/${studentId}/interviews${q}`);
  return data.items ?? [];
}

export async function interviewsCatalog(params?: {
  company?: string;
  grade?: string;
  result?: string;
}): Promise<Interview[]> {
  const { data } = await api.get<{ items: Interview[] }>("/interviews/catalog", { params });
  return data.items ?? [];
}

export async function addReal(dto: AddRealDto): Promise<Interview> {
  const { data } = await api.post<Interview>("/me/interviews/real", dto);
  return data;
}

export async function createMock(dto: CreateMockDto): Promise<Interview> {
  const { data } = await api.post<Interview>("/interviews/mock", dto);
  return data;
}

export async function completeMock(id: string, feedback: string): Promise<Interview> {
  const { data } = await api.post<Interview>(`/interviews/${id}/complete`, { feedback });
  return data;
}

export async function updateInterview(id: string, dto: UpdateInterviewDto): Promise<Interview> {
  const { data } = await api.patch<Interview>(`/interviews/${id}`, dto);
  return data;
}

export async function deleteInterview(id: string): Promise<void> {
  await api.delete(`/interviews/${id}`);
}

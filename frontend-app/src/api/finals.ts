import { api } from "./client";
import type { FinalCheck, FinalCheckType } from "./types";

export async function myFinals(): Promise<FinalCheck[]> {
  const { data } = await api.get<{ items: FinalCheck[] }>("/me/finals");
  return data.items ?? [];
}

export async function studentFinals(studentId: string): Promise<FinalCheck[]> {
  const { data } = await api.get<{ items: FinalCheck[] }>(`/users/${studentId}/finals`);
  return data.items ?? [];
}

export async function scheduleFinal(
  student_id: string,
  type: FinalCheckType,
  scheduled_at: string,
): Promise<void> {
  await api.post("/finals/schedule", { student_id, type, scheduled_at });
}

export async function completeFinal(
  student_id: string,
  type: FinalCheckType,
  success: boolean,
): Promise<void> {
  await api.post("/finals/complete", { student_id, type, success });
}

import { apiClient } from "./client";
import type { LoginResponse, MeResponse, Role } from "./types";

export async function login(loginValue: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", {
    login: loginValue,
    password,
  });
  return data;
}

export async function me(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return data;
}

export async function selectRole(role: Role): Promise<{ selected_role: Role }> {
  const { data } = await apiClient.post<{ selected_role: Role }>("/auth/select-role", { role });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

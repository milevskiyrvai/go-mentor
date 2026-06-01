import { apiClient } from "./client";
import type { LoginResponse, MeResponse, Role } from "./types";

// Go backend serializes empty/nil slices as JSON `null`. Normalize `roles` to []
// so consumers can safely call `.map` / `.includes` / `.length`.
function normalizeMe<T extends { roles?: Role[] }>(data: T): T {
  return { ...data, roles: data.roles ?? [] };
}

export async function login(loginValue: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", {
    login: loginValue,
    password,
  });
  return normalizeMe(data);
}

export async function me(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return normalizeMe(data);
}

export async function selectRole(role: Role): Promise<{ selected_role: Role }> {
  const { data } = await apiClient.post<{ selected_role: Role }>("/auth/select-role", { role });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

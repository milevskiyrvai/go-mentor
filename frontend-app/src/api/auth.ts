import { api } from "./client";
import type { LoginResponse, MeResponse, Role } from "./types";

// Go backend serializes empty/nil slices as JSON `null`. Normalize `roles` to []
// so consumers can safely call `.map` / `.includes` / `.length`.
function normalizeMe<T extends { roles?: Role[] }>(data: T): T {
  return { ...data, roles: data.roles ?? [] };
}

export async function login(loginName: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    login: loginName,
    password,
  });
  return normalizeMe(data);
}

export async function me(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("/auth/me");
  return normalizeMe(data);
}

export async function selectRole(role: Role): Promise<void> {
  await api.post("/auth/select-role", { role });
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

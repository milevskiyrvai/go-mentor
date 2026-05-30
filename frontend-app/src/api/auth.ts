import { api } from "./client";
import type { LoginResponse, MeResponse, Role } from "./types";

export async function login(loginName: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    login: loginName,
    password,
  });
  return data;
}

export async function me(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("/auth/me");
  return data;
}

export async function selectRole(role: Role): Promise<void> {
  await api.post("/auth/select-role", { role });
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

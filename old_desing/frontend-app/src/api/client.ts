import axios, { AxiosError } from "axios";

// В dev режиме vite проксирует /api на backend:8080 (см. vite.config.ts).
// В production nginx также проксирует /api → backend.
export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export interface ApiError {
  status: number;
  code: string;
  message?: string;
}

export function isApiError(e: unknown): e is AxiosError<{ error?: string }> {
  return axios.isAxiosError(e);
}

export function extractError(e: unknown): ApiError {
  if (isApiError(e)) {
    return {
      status: e.response?.status ?? 0,
      code: e.response?.data?.error ?? e.code ?? "unknown",
      message: e.message,
    };
  }
  return { status: 0, code: "unknown" };
}

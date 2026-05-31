import axios, { type AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

export interface ApiError {
  error: string;
}

export function getApiErrorCode(err: unknown): string | null {
  const e = err as AxiosError<ApiError>;
  return e?.response?.data?.error ?? null;
}

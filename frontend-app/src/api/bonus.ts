import { api } from "./client";
import type { BonusOverview, BonusTransaction, OneOnOneRequest } from "./types";

export async function myBonuses(): Promise<BonusOverview> {
  const { data } = await api.get<BonusOverview>("/me/bonuses");
  return data;
}

export async function myTransactions(): Promise<BonusTransaction[]> {
  const { data } = await api.get<{ items: BonusTransaction[] }>(
    "/me/bonuses/transactions?limit=100",
  );
  return data.items ?? [];
}

export async function convertBonus(bonus_amount: number): Promise<{ discount_percent: number }> {
  const { data } = await api.post<{ discount_percent: number }>("/me/bonuses/convert", {
    bonus_amount,
  });
  return data;
}

export async function myOneOnOne(): Promise<OneOnOneRequest[]> {
  const { data } = await api.get<{ items: OneOnOneRequest[] }>("/me/one-on-one");
  return data.items ?? [];
}

export async function createOneOnOne(): Promise<OneOnOneRequest> {
  const { data } = await api.post<OneOnOneRequest>("/me/one-on-one");
  return data;
}

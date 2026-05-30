export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function daysSince(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso).getTime();
  return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
}

export function relativeDays(iso?: string): string {
  if (!iso) return "—";
  const d = daysSince(iso);
  if (d <= 0) return "сегодня";
  if (d === 1) return "вчера";
  if (d < 7) return `${d} д. назад`;
  if (d < 30) return `${Math.floor(d / 7)} нед. назад`;
  return formatDate(iso);
}

export function statusToBlockNumber(idx: number): string {
  return String(idx + 1).padStart(2, "0");
}

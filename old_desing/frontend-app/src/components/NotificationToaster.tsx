import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { listNotifications, markNotificationsRead } from "@/api/activity";
import { useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/api/types";
import { HexBadge } from "./HexBadge";

export function NotificationToaster() {
  const [stack, setStack] = useState<Notification[]>([]);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      try {
        const items = await listNotifications(true);
        if (!mounted) return;
        const fresh = items.filter((n) => !seenIds.has(n.id));
        if (fresh.length) {
          setStack((s) => [...fresh, ...s].slice(0, 5));
          setSeenIds((s) => {
            const next = new Set(s);
            fresh.forEach((n) => next.add(n.id));
            return next;
          });
          // ack server
          markNotificationsRead(fresh.map((n) => n.id)).catch(() => {});
          // refresh user-side data after a new event
          queryClient.invalidateQueries({ queryKey: ["progress"] });
          queryClient.invalidateQueries({ queryKey: ["bonuses"] });
          queryClient.invalidateQueries({ queryKey: ["achievements"] });
        }
      } catch {
        /* user might be logged out; ignore */
      }
    };

    // first tick — drain existing unread silently (mark read) but show the most recent for visibility
    tick();
    const t = window.setInterval(tick, 30000);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, [seenIds, queryClient]);

  const handleDismiss = (id: number) => {
    setStack((s) => s.filter((n) => n.id !== id));
  };

  useEffect(() => {
    if (!stack.length) return;
    const timers = stack.map((n) =>
      window.setTimeout(() => handleDismiss(n.id), 7000),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [stack]);

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-[360px]">
      <AnimatePresence>
        {stack.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="card relative overflow-hidden"
            onClick={() => handleDismiss(n.id)}
            style={{ cursor: "pointer" }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{
                background:
                  n.type === "achievement_unlocked"
                    ? "linear-gradient(180deg,var(--primary),var(--secondary))"
                    : "var(--secondary)",
              }}
            />
            <div className="flex items-start gap-3 p-4 pl-5">
              {n.type === "achievement_unlocked" ? (
                <div className="shrink-0">
                  <HexBadge
                    glyph="★"
                    size={56}
                    accent="primary"
                    imageUrl={(n.metadata?.image_url as string | undefined) ?? undefined}
                  />
                </div>
              ) : (
                <div className="shrink-0 w-10 h-10 rounded-md grid place-items-center bg-elevated border border-border text-primary font-mono">
                  ✦
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="caption mb-1">
                  {prettyType(n.type)}
                </div>
                <div className="text-[14px] font-semibold leading-snug">{n.title}</div>
                {n.body && (
                  <div className="text-[12px] text-text-2 mt-1 leading-snug line-clamp-2">
                    {n.body}
                  </div>
                )}
                {typeof n.metadata?.reward_bonus === "number" && (n.metadata.reward_bonus as number) > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/30 font-mono text-[11px] text-secondary">
                    +{n.metadata.reward_bonus as number} бонусов
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function prettyType(t: string): string {
  switch (t) {
    case "achievement_unlocked":
      return "Достижение получено";
    case "block_approved":
      return "Блок подтверждён";
    case "mock_scheduled":
      return "Mock назначен";
    case "final_scheduled":
      return "Финалка назначена";
    case "one_on_one_approved":
      return "1×1 одобрено";
    case "one_on_one_rejected":
      return "1×1 отклонено";
    case "one_on_one_completed":
      return "1×1 проведено";
    case "bonus_credited":
      return "Начислены бонусы";
    case "bonus_debited":
      return "Списаны бонусы";
    default:
      return "Уведомление";
  }
}

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
        {stack.map((n) => {
          const reward = n.metadata?.reward_bonus;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="toast !w-full"
              onClick={() => handleDismiss(n.id)}
              style={{ cursor: "pointer" }}
            >
              {n.type === "achievement_unlocked" ? (
                <HexBadge
                  glyph="★"
                  size={48}
                  accent="primary"
                  imageUrl={(n.metadata?.image_url as string | undefined) ?? undefined}
                />
              ) : (
                <div className="shrink-0 w-12 h-12 rounded-md grid place-items-center bg-bg border border-border text-primary">
                  ✦
                </div>
              )}
              <div className="tb">
                <div className="e">{prettyType(n.type)}</div>
                <b>{n.title}</b>
                {n.body && <span className="line-clamp-2">{n.body}</span>}
              </div>
              {typeof reward === "number" && reward > 0 && (
                <div className="rw">+{reward}</div>
              )}
            </motion.div>
          );
        })}
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

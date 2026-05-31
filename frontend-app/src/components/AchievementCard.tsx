import { motion } from "framer-motion";
import type { AchievementProgressItem } from "@/api/types";
import { HexBadge } from "./HexBadge";
import { BonusCoin } from "./BonusCoin";
import { ACHIEVEMENT_REWARDS } from "@/lib/achievements";

interface Props {
  item: AchievementProgressItem;
  variantAccent?: "primary" | "secondary";
}

export function AchievementCard({ item, variantAccent = "primary" }: Props) {
  const { achievement: a, received, current, target } = item;
  // Награды берём ровно из ТЗ §14, не из БД (если описание совпадает с одной из 14)
  const rewardOverride = ACHIEVEMENT_REWARDS[a.title];
  const reward = rewardOverride ?? a.reward_bonus;
  const accent = received ? variantAccent : "primary";
  const lockedState = !received;
  const progressPct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="elevated relative overflow-hidden flex flex-col items-center gap-3.5 p-6"
      style={{
        minHeight: 340,
        // soft glow on top
        backgroundImage: !lockedState
          ? `radial-gradient(closest-side at 50% 0%, color-mix(in oklab, ${accent === "primary" ? "var(--primary)" : "var(--secondary)"} 20%, transparent), transparent 70%)`
          : "none",
      }}
    >
      {/* lock pip / check pip */}
      {lockedState ? (
        <div className="absolute top-4 right-4 w-[26px] h-[26px] rounded-full bg-bg border border-border grid place-items-center text-text-2 text-[12px]">
          🔒
        </div>
      ) : (
        <div
          className="absolute top-4 right-4 w-[26px] h-[26px] rounded-full grid place-items-center font-bold text-[12px]"
          style={{
            background: accent === "primary" ? "var(--primary)" : "var(--secondary)",
            color: accent === "primary" ? "#FFFFFF" : "#fff",
            boxShadow: `0 0 18px color-mix(in oklab, ${accent === "primary" ? "var(--primary)" : "var(--secondary)"} 60%, transparent)`,
          }}
        >
          ✓
        </div>
      )}

      <HexBadge
        glyph={glyphForTitle(a.title)}
        locked={lockedState}
        accent={accent}
        imageUrl={a.image_url}
        size={108}
      />

      <h3 className="text-[15px] font-semibold text-center -tracking-tight mt-1">{a.title}</h3>
      {a.description && (
        <p className="text-[12px] text-text-2 text-center leading-snug max-w-[220px]">
          {a.description}
        </p>
      )}

      {/* progress for locked */}
      {lockedState && target > 1 && (
        <div className="w-full mt-1 flex flex-col gap-1.5">
          <div className="w-full h-1.5 rounded-[3px] border border-border bg-bg overflow-hidden">
            <div
              className="h-full pbar-fill transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[11px] font-mono text-text-2 flex items-center justify-between">
            <span>
              {current} / {target}
            </span>
            <span>{Math.round(progressPct)}%</span>
          </div>
        </div>
      )}

      {/* reward */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-full mt-auto"
        style={{
          background: lockedState ? "transparent" : "rgba(178,107,69,0.08)",
          border: lockedState
            ? "1px solid var(--border)"
            : "1px solid color-mix(in oklab, var(--secondary) 30%, transparent)",
        }}
      >
        <BonusCoin size={16} variant={lockedState ? "primary" : "secondary"} />
        <span className="font-mono font-bold text-[13px] text-text">+{reward}</span>
        <span className="text-[11px] text-text-2">бонусов</span>
      </div>
    </motion.div>
  );
}

function glyphForTitle(title: string): string {
  // grab first letter or symbol
  if (/финал/i.test(title)) return "★";
  if (/блок\s*1/i.test(title)) return "1";
  if (/блок\s*2/i.test(title)) return "2";
  if (/блок\s*3/i.test(title)) return "3";
  if (/блок\s*4/i.test(title)) return "4";
  if (/блок\s*5/i.test(title)) return "5";
  if (/mock/i.test(title)) return "M";
  if (/real|серия/i.test(title)) return "R";
  if (/профиль/i.test(title)) return "P";
  if (/1x1|1×1/i.test(title)) return "★";
  if (/первый шаг/i.test(title)) return "✦";
  if (/разогрев/i.test(title)) return "✦";
  if (/фокус/i.test(title)) return "◎";
  return title.slice(0, 1).toUpperCase();
}

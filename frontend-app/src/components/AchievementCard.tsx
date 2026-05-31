import { motion } from "framer-motion";
import clsx from "clsx";
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
      className={clsx("ach", lockedState && "locked")}
    >
      {/* check pip (получено) */}
      {!lockedState && <div className="got">✓</div>}

      <HexBadge
        glyph={glyphForTitle(a.title)}
        locked={lockedState}
        accent={accent}
        imageUrl={a.image_url}
        size={86}
      />

      <div className="at">{a.title}</div>
      {a.description && <div className="ad">{a.description}</div>}

      {/* progress for locked */}
      {lockedState && target > 1 && (
        <div className="lockprog">
          <span>
            {current} / {target}
          </span>
          <div className="bar">
            <i style={{ width: `${progressPct}%` }} />
          </div>
          <span>{Math.round(progressPct)}%</span>
        </div>
      )}

      {/* reward */}
      <div className="reward">
        <BonusCoin size={13} variant={lockedState ? "primary" : "secondary"} />
        <span>+{reward}</span>
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

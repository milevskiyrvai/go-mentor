import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateSelf } from "@/api/users";
import { myProgress } from "@/api/progress";
import { listBlocks } from "@/api/roadmap";
import { myAchievements } from "@/api/achievements";
import { listStudentActivity } from "@/api/activity";
import { Avatar } from "@/components/Sidebar";
import { HexBadge } from "@/components/HexBadge";
import { PageLoader } from "@/components/Spinner";
import { useAuth } from "@/stores/auth";

export function StudentProfile() {
  const { user, set, selectedRole } = useAuth();
  const queryClient = useQueryClient();

  // ---- form state (источник истины — user из стора, приходит с бэка) ----
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [about, setAbout] = useState(user?.about ?? "");
  const [isPrivate, setIsPrivate] = useState(user?.is_profile_private ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
    setAvatarUrl(user?.avatar_url ?? "");
    setAbout(user?.about ?? "");
    setIsPrivate(user?.is_profile_private ?? false);
  }, [user]);

  // ---- данные для live-превью «так видят другие» (всё из API) ----
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: myProgress });
  const blocksQ = useQuery({ queryKey: ["blocks"], queryFn: listBlocks });
  const achQ = useQuery({ queryKey: ["achievements"], queryFn: myAchievements });
  const activityQ = useQuery({
    queryKey: ["activity", user?.id],
    queryFn: () => listStudentActivity(user!.id, 200),
    enabled: !!user?.id,
  });

  const isDirty =
    displayName !== (user?.display_name ?? "") ||
    avatarUrl !== (user?.avatar_url ?? "") ||
    about !== (user?.about ?? "") ||
    isPrivate !== (user?.is_profile_private ?? false);

  const mut = useMutation({
    mutationFn: () =>
      updateSelf({
        display_name: displayName,
        avatar_url: avatarUrl || undefined,
        about,
        is_profile_private: isPrivate,
      }),
    onSuccess: (updated) => {
      set({ user: updated });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      setError(null);
    },
    onError: () => setError("Не удалось сохранить изменения"),
  });

  const handleReset = () => {
    setDisplayName(user?.display_name ?? "");
    setAvatarUrl(user?.avatar_url ?? "");
    setAbout(user?.about ?? "");
    setIsPrivate(user?.is_profile_private ?? false);
    setError(null);
  };

  // ---- производные для превью ----
  const progress = progressQ.data;
  const blocks = blocksQ.data ?? [];
  const achievements = achQ.data ?? [];
  const received = achievements.filter((a) => a.received);

  const overall = progress?.overall_percent ?? 0;
  const approved = progress?.approved_blocks ?? 0;
  const totalBlocks = progress?.total_active_blocks ?? blocks.length;

  // текущий блок: первый in_progress/waiting, иначе первый не-approved
  const currentBlockTitle = useMemo(() => {
    if (!progress) return undefined;
    const statusById = new Map(progress.blocks.map((b) => [b.block_id, b.status]));
    const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
    const active =
      sorted.find((b) => {
        const st = statusById.get(b.id);
        return st === "in_progress" || st === "waiting_buddy_confirmation";
      }) ?? sorted.find((b) => (statusById.get(b.id) ?? "not_started") !== "approved");
    return active?.title;
  }, [progress, blocks]);

  // тепловая карта активности — последние 7 дней по реальным событиям
  const heat = useMemo(() => buildWeekHeat(activityQ.data ?? []), [activityQ.data]);
  const activeDays = heat.filter((v) => v > 0).length;
  const activityLabel =
    activeDays >= 5 ? "высокая" : activeDays >= 2 ? "средняя" : activeDays >= 1 ? "низкая" : "нет";

  const previewLoading =
    progressQ.isLoading || blocksQ.isLoading || achQ.isLoading || activityQ.isLoading;

  // первичная загрузка пользователя (стор ещё пуст)
  if (!user) return <PageLoader />;

  return (
    <div className="flex flex-col flex-1 gap-7">
      {/* ============ PAGE HEAD ============ */}
      <div className="page-head !mb-0">
        <div>
          <h1>Профиль</h1>
          <div className="sub">
            Публичный профиль <b>{isPrivate ? "закрыт" : "открыт"}</b> ·{" "}
            <span className="num">{received.length}</span>{" "}
            {pluralAch(received.length)}
          </div>
        </div>
        <div className="right">
          <button
            className="btn ghost"
            disabled={!isDirty || mut.isPending}
            onClick={handleReset}
          >
            Отменить
          </button>
          <button
            className="btn secondary"
            disabled={!isDirty || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>

      {/* ============ TWO COLUMNS ============ */}
      <div
        className="grid items-start gap-7 flex-1
                   grid-cols-1 lg:grid-cols-[1.05fr_.95fr]"
      >
        {/* ===== EDIT FORM ===== */}
        <div className="card card-pad">
          <div className="card-head">
            <h3>Личные данные</h3>
          </div>

          {/* avatar editor */}
          <div className="ava-edit flex items-center gap-4 mb-5">
            <Avatar
              name={displayName || user.display_name}
              url={avatarUrl}
              role={selectedRole}
              size={72}
              className="!rounded-[10px]"
            />
            <div className="min-w-0 flex-1">
              <input
                className="input"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…/avatar.png"
              />
              <div className="text-[11.5px] text-text-3 font-semibold mt-1.5">
                Ссылка на изображение · PNG или JPG
              </div>
            </div>
          </div>

          <div className="field">
            <label>Отображаемое имя</label>
            <input
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Алиса Иванова"
            />
          </div>

          <div className="field">
            <label>О себе</label>
            <textarea
              className="textarea"
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Расскажите, кто вы, чем занимаетесь и какие цели в Go."
            />
          </div>

          {/* telegram — назначается админом, read-only */}
          <div className="field">
            <label>Telegram</label>
            <div className="lockfield flex items-center gap-2.5 border border-border bg-bg rounded-[6px] px-3 py-2.5 text-[14px] font-semibold">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-[17px] h-[17px] text-primary shrink-0"
              >
                <path d="M21.9 4.5 18.7 19c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.4 13 1.6 11.5c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.7Z" />
              </svg>
              <span className="text-primary font-bold">
                {user.telegram_username ? `@${user.telegram_username}` : "не назначен"}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="w-[15px] h-[15px] ml-auto text-text-3 shrink-0"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="hint">Назначается администратором — изменить нельзя</div>
          </div>

          {/* visibility */}
          <div className="field !mb-0 pt-[18px] border-t border-border">
            <label>Видимость публичного профиля</label>
            <div className="flex items-center justify-between gap-3.5 mt-1">
              <button
                type="button"
                className={`switch ${isPrivate ? "" : "on"}`}
                aria-pressed={!isPrivate}
                onClick={() => setIsPrivate((v) => !v)}
              >
                <span className="track" />
                <span className="lab">{isPrivate ? "Профиль закрыт" : "Профиль открыт"}</span>
              </button>
              <span className="text-[12px] text-text-3 font-semibold max-w-[230px] text-right leading-snug">
                Закрытый профиль показывает только имя, аватар и Telegram
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-[13px] px-3 py-2 rounded-md border border-danger/40 bg-danger/10 text-danger">
              {error}
            </div>
          )}
          {saved && (
            <div className="mt-4 text-[13px] text-success font-semibold">
              ✓ Изменения сохранены
            </div>
          )}
        </div>

        {/* ===== LIVE PREVIEW ===== */}
        <div>
          <div className="eyebrow mb-2.5 flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="w-3.5 h-3.5"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Так видят другие
          </div>

          <div className="card overflow-hidden !p-0">
            {/* preview head */}
            <div className="flex flex-col items-center text-center gap-3 px-6 pt-7 pb-6 border-b border-border bg-bg">
              <Avatar
                name={displayName || user.display_name}
                url={avatarUrl}
                role={selectedRole}
                size={84}
                className="!rounded-[14px] !text-[30px]"
              />
              <div>
                <div className="text-[20px] font-bold -tracking-[0.01em]">
                  {displayName || "—"}
                </div>
                {user.telegram_username && (
                  <a
                    href={`https://t.me/${user.telegram_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M21.9 4.5 18.7 19c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.4 13 1.6 11.5c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.7Z" />
                    </svg>
                    @{user.telegram_username}
                  </a>
                )}
              </div>
            </div>

            {/* OPEN profile detail */}
            {!isPrivate &&
              (previewLoading ? (
                <div className="px-6 py-8 flex justify-center">
                  <PageLoaderInline />
                </div>
              ) : (
                <div className="flex flex-col gap-5 px-6 py-5">
                  {/* about (если есть) */}
                  {about && (
                    <div className="text-[13px] text-text-2 leading-snug whitespace-pre-line">
                      {about}
                    </div>
                  )}

                  {/* progress */}
                  <PreviewSection title="Прогресс обучения">
                    <div className="flex items-center gap-3">
                      <span className="text-[22px] font-extrabold tabular-nums -tracking-[0.02em] text-primary min-w-[54px]">
                        {overall}%
                      </span>
                      <div className="bar success flex-1">
                        <i style={{ width: `${overall}%` }} />
                      </div>
                    </div>
                    <div className="text-[12px] text-text-2 font-semibold mt-2.5">
                      {approved} из {totalBlocks} {pluralBlock(totalBlocks)} закрыто
                      {currentBlockTitle ? ` · сейчас «${currentBlockTitle}»` : ""}
                    </div>
                  </PreviewSection>

                  {/* achievements seals */}
                  <PreviewSection title={`Достижения · ${received.length}`}>
                    {received.length === 0 ? (
                      <div className="text-[12px] text-text-3 font-semibold">
                        Пока нет полученных достижений
                      </div>
                    ) : (
                      <div className="flex gap-2.5 flex-wrap">
                        {received.slice(0, 6).map((a, i) => (
                          <HexBadge
                            key={a.achievement.id}
                            glyph={a.achievement.title[0]?.toUpperCase() ?? "★"}
                            imageUrl={a.achievement.image_url}
                            size={46}
                            accent={i % 3 === 1 ? "secondary" : i % 3 === 2 ? "amber" : "primary"}
                          />
                        ))}
                        {received.length > 6 && (
                          <div className="seal" style={{ width: 46, height: 46, flex: "0 0 46px" }}>
                            <span className="gl" style={{ fontSize: 15 }}>
                              +{received.length - 6}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </PreviewSection>

                  {/* activity heatmap */}
                  <PreviewSection title={`Активность · ${activityLabel}`}>
                    <div className="flex gap-[5px]">
                      {heat.map((level, i) => (
                        <i
                          key={i}
                          className="flex-1 h-[26px] rounded-[4px]"
                          style={{ background: heatColor(level) }}
                        />
                      ))}
                    </div>
                    <div className="text-[12px] text-text-2 font-semibold mt-2.5">
                      Активен {activeDays} из 7 дней недели
                    </div>
                  </PreviewSection>
                </div>
              ))}

            {/* CLOSED profile detail */}
            {isPrivate && (
              <div className="px-6 py-8 text-center text-text-2">
                <div className="w-[46px] h-[46px] rounded-full bg-bg border border-border grid place-items-center mx-auto mb-3 text-text-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="w-[22px] h-[22px]"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-[14px] font-bold text-text">Профиль закрыт</div>
                <div className="text-[12.5px] mt-1">
                  Прогресс, достижения и активность скрыты от других
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-text-3 mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function PageLoaderInline() {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-border border-t-primary"
      style={{ width: 26, height: 26 }}
      role="status"
    />
  );
}

// 7 ячеек (Пн..Вс), значение = число событий за день недели за последние 7 дней
function buildWeekHeat(events: { created_at: string }[]): number[] {
  const counts = new Array(7).fill(0);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  for (const ev of events) {
    const t = new Date(ev.created_at).getTime();
    if (isNaN(t) || t < weekAgo) continue;
    // нормализуем к Пн=0 .. Вс=6
    const dow = (new Date(t).getDay() + 6) % 7;
    counts[dow] += 1;
  }
  return counts;
}

function heatColor(level: number): string {
  if (level <= 0) return "var(--primary-soft)";
  if (level === 1) return "color-mix(in oklab, var(--primary) 35%, var(--surface-2))";
  if (level === 2) return "color-mix(in oklab, var(--primary) 60%, var(--surface-2))";
  return "var(--primary)";
}

function pluralAch(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "достижений";
  if (b > 1 && b < 5) return "достижения";
  if (b === 1) return "достижение";
  return "достижений";
}

function pluralBlock(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "блоков";
  if (b > 1 && b < 5) return "блока";
  if (b === 1) return "блока";
  return "блоков";
}

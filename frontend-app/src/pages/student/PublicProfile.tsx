import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "@/api/users";
import { studentProgress } from "@/api/progress";
import { listBlocks } from "@/api/roadmap";
import { listStudentActivity } from "@/api/activity";
import { api } from "@/api/client";
import type { AchievementProgressItem } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { Avatar } from "@/components/Sidebar";
import { ProgressBar } from "@/components/ProgressBar";
import { HexBadge } from "@/components/HexBadge";

/**
 * Публичный профиль (open / closed) — точная пересборка макета
 * design-output/screens/public-profile.html.
 *
 * Композиция карточки .pp: центрированный верх (аватар / имя / telegram),
 * затем тело с секциями «О себе», «Прогресс обучения», «Достижения»,
 * «Активность». Закрытый профиль рендерит lock-состояние .pp-closed.
 *
 * ТЗ §5.5: бонусы / баланс / историю бонусов ученика тут НЕ показываем
 * (этот экран их и не запрашивает — только профиль, прогресс, ачивки,
 * активность). Buddy видит ту же открытую карточку без финансовых данных.
 */

async function fetchUserAchievements(userId: string): Promise<AchievementProgressItem[]> {
  // /me/achievements это свой; для чужих берём /users/{id}/achievements + /achievements
  const [received, all] = await Promise.all([
    api.get<{ items: { id: number; user_id: string; achievement_id: string; received_at: string }[] }>(
      `/users/${userId}/achievements`,
    ),
    api.get<{
      items: {
        id: string;
        title: string;
        description?: string;
        reward_bonus: number;
        image_url?: string;
        condition_type: string;
        condition_params: any;
        is_active: boolean;
        sort_order: number;
      }[];
    }>(`/achievements`),
  ]);
  // Go-бэк отдаёт пустые слайсы как null — нормализуем, иначе null.map крашит
  // публичный профиль ученика без достижений (React Router «Application Error»).
  const receivedItems = received.data.items ?? [];
  const allItems = all.data.items ?? [];
  const map = new Map(receivedItems.map((r) => [r.achievement_id, true]));
  return allItems.map((a) => ({
    achievement: a as any,
    received: !!map.get(a.id),
    current: map.get(a.id) ? 1 : 0,
    target: 1,
  }));
}

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Считает активность за последние 7 дней (Пн..Вс текущей недели). */
function buildWeekHeat(timestamps: string[]): { active: boolean[]; activeCount: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (today.getDay() + 6) % 7; // 0 = Пн
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);

  const active = new Array(7).fill(false);
  for (const ts of timestamps) {
    const d = new Date(ts);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((day.getTime() - monday.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) active[diff] = true;
  }
  return { active, activeCount: active.filter(Boolean).length };
}

function activityLevel(count: number): string {
  if (count >= 6) return "высокая";
  if (count >= 3) return "средняя";
  if (count >= 1) return "низкая";
  return "нет";
}

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const profileQ = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => getPublicProfile(id!),
    enabled: !!id,
  });

  const isPrivate = profileQ.data?.is_profile_private;
  const detailsEnabled = !!id && profileQ.isSuccess && !isPrivate;

  const progressQ = useQuery({
    queryKey: ["public-progress", id],
    queryFn: () => studentProgress(id!),
    enabled: detailsEnabled,
    retry: false,
  });
  const blocksQ = useQuery({
    queryKey: ["blocks"],
    queryFn: listBlocks,
    enabled: detailsEnabled,
    retry: false,
  });
  const achQ = useQuery({
    queryKey: ["public-ach", id],
    queryFn: () => fetchUserAchievements(id!),
    enabled: detailsEnabled,
    retry: false,
  });
  const activityQ = useQuery({
    queryKey: ["public-activity", id],
    queryFn: () => listStudentActivity(id!, 200),
    enabled: detailsEnabled,
    retry: false,
  });

  // ---- loading / error / empty (профиль) ----
  if (profileQ.isLoading) return <PageLoader />;

  if (profileQ.isError) {
    return (
      <div>
        <PageHeader eyebrow="Публичный профиль" title="Ошибка загрузки" />
        <div className="card p-8 text-center text-[13px] text-text-2">
          Не удалось загрузить профиль.
          <div className="mt-4">
            <button className="btn btn-sm" onClick={() => profileQ.refetch()}>
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileQ.data) {
    return (
      <div>
        <PageHeader eyebrow="Публичный профиль" title="Профиль не найден" />
        <div className="card p-8 text-center text-[13px] text-text-3">
          Такого участника не существует или он недоступен.
        </div>
      </div>
    );
  }

  const p = profileQ.data;
  const tg = p.telegram_username?.replace(/^@/, "");

  const heat = buildWeekHeat((activityQ.data ?? []).map((e) => e.created_at));

  const receivedAch = (achQ.data ?? []).filter((a) => a.received);

  // подпись к прогрессу: «X из Y блоков закрыто · сейчас «<title>»»
  let currentBlockTitle: string | null = null;
  if (progressQ.data && blocksQ.data) {
    const map = new Map(progressQ.data.blocks.map((b) => [b.block_id, b]));
    const ordered = blocksQ.data.slice().sort((a, b) => a.sort_order - b.sort_order);
    const cur = ordered.find((b) => {
      const st = map.get(b.id)?.status;
      return st && st !== "approved" && st !== "not_started";
    });
    currentBlockTitle = cur?.title ?? null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* page-head с backlink (макет: «Назад к каталогу») */}
      <header className="mb-7">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-text-2 hover:text-primary transition-colors"
        >
          <svg
            className="w-[15px] h-[15px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Назад
        </button>
        <h1 className="text-[26px] font-bold -tracking-[0.02em] leading-tight mt-2">
          Публичный профиль
        </h1>
        <div className="text-text-2 text-[13px] mt-1">
          {isPrivate ? "Закрытый профиль" : "Открытый профиль"}
        </div>
      </header>

      {/* Карточка профиля — повторяет .pp из макета, max-w для desktop */}
      <div className="w-full max-w-[460px] mx-auto md:mx-0">
        <div className="pp">
          {/* pp-top: центрированный аватар / имя / telegram */}
          <div className="pp-top">
            <Avatar
              name={p.display_name}
              url={p.avatar_url}
              role={isPrivate ? "buddy" : "student"}
              size={84}
              className="!rounded-[14px] text-[30px] font-extrabold"
            />
            <div>
              <div className="pp-name">{p.display_name}</div>
              {tg ? (
                <div className="mt-[7px]">
                  <a
                    href={`https://t.me/${tg}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pp-tg"
                  >
                    <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.9 4.5 18.7 19c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.4 13 1.6 11.5c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.7Z" />
                    </svg>
                    @{tg}
                  </a>
                </div>
              ) : (
                <div className="mt-[7px] text-[12px] text-text-3">Telegram не указан</div>
              )}
            </div>
          </div>

          {isPrivate ? (
            /* ===== CLOSED — макет .pp-closed ===== */
            <div className="pp-closed">
              <div className="ico">
                <svg
                  className="w-[22px] h-[22px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="t">Профиль закрыт</div>
              <div className="d">
                Участник скрыл прогресс, достижения и активность.
                <br />
                Доступны только имя, аватар и Telegram.
              </div>
            </div>
          ) : (
            /* ===== OPEN — макет .pp-body ===== */
            <div className="pp-body">
              {/* О себе */}
              {p.about && (
                <div className="pp-sec">
                  <div className="sh">О себе</div>
                  <p className="pp-bio whitespace-pre-line">{p.about}</p>
                </div>
              )}

              {/* Прогресс обучения */}
              <div className="pp-sec">
                <div className="sh">Прогресс обучения</div>
                {progressQ.isLoading ? (
                  <div className="bar mute"><i style={{ width: "0%" }} /></div>
                ) : progressQ.isError ? (
                  <div className="text-[12px] text-text-3">Прогресс недоступен</div>
                ) : progressQ.data ? (
                  <>
                    <div className="pp-prog">
                      <span className="p">{progressQ.data.overall_percent}%</span>
                      <ProgressBar
                        value={progressQ.data.overall_percent}
                        variant="success"
                        className="flex-1"
                      />
                    </div>
                    <div className="text-[12px] text-text-2 font-semibold mt-[9px]">
                      {progressQ.data.approved_blocks} из {progressQ.data.total_active_blocks} блоков
                      закрыто
                      {currentBlockTitle && (
                        <>
                          {" · сейчас «"}
                          {currentBlockTitle}
                          {"»"}
                        </>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Достижения */}
              <div className="pp-sec">
                <div className="sh">Достижения · {receivedAch.length}</div>
                {achQ.isLoading ? (
                  <div className="pp-seals">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="seal locked" />
                    ))}
                  </div>
                ) : achQ.isError ? (
                  <div className="text-[12px] text-text-3">Не удалось загрузить достижения</div>
                ) : receivedAch.length === 0 ? (
                  <div className="text-[12px] text-text-3">Достижений пока нет</div>
                ) : (
                  <div className="pp-seals">
                    {receivedAch.map((a) => (
                      <HexBadge
                        key={a.achievement.id}
                        glyph={a.achievement.title[0]?.toUpperCase() ?? "★"}
                        size={46}
                        accent="secondary"
                        imageUrl={a.achievement.image_url}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Активность */}
              <div className="pp-sec">
                <div className="sh">Активность · {activityLevel(heat.activeCount)}</div>
                {activityQ.isLoading ? (
                  <div className="pp-heat">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <i key={i} style={{ background: "var(--primary-soft)" }} />
                    ))}
                  </div>
                ) : activityQ.isError ? (
                  <div className="text-[12px] text-text-3">Активность недоступна</div>
                ) : (
                  <>
                    <div className="pp-heat">
                      {heat.active.map((on, i) => (
                        <i
                          key={i}
                          title={DAY_LABELS[i]}
                          style={{
                            background: on
                              ? "var(--primary)"
                              : "var(--primary-soft)",
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-[12px] text-text-2 font-semibold mt-[9px]">
                      {heat.activeCount === 0
                        ? "Нет активности на этой неделе"
                        : `Активность ${heat.activeCount} из 7 дней недели`}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

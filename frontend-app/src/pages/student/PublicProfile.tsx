import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "@/api/users";
import { studentProgress } from "@/api/progress";
import { api } from "@/api/client";
import type { AchievementProgressItem } from "@/api/types";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { Avatar } from "@/components/Sidebar";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { HexBadge } from "@/components/HexBadge";
import { formatDate } from "@/lib/format";

async function fetchUserAchievements(userId: string): Promise<AchievementProgressItem[]> {
  // /me/achievements это свой; для чужих пользователей берём /users/{id}/achievements + /achievements
  const [received, all] = await Promise.all([
    api.get<{ items: { id: number; user_id: string; achievement_id: string; received_at: string }[] }>(
      `/users/${userId}/achievements`,
    ),
    api.get<{ items: { id: string; title: string; description?: string; reward_bonus: number; image_url?: string; condition_type: string; condition_params: any; is_active: boolean; sort_order: number }[] }>(
      `/achievements`,
    ),
  ]);
  const map = new Map(received.data.items.map((r) => [r.achievement_id, true]));
  return all.data.items.map((a) => ({
    achievement: a as any,
    received: !!map.get(a.id),
    current: map.get(a.id) ? 1 : 0,
    target: 1,
  }));
}

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const profileQ = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => getPublicProfile(id!),
    enabled: !!id,
  });
  const progressQ = useQuery({
    queryKey: ["public-progress", id],
    queryFn: () => studentProgress(id!),
    enabled: !!id && !profileQ.data?.is_profile_private,
    retry: false,
  });
  const achQ = useQuery({
    queryKey: ["public-ach", id],
    queryFn: () => fetchUserAchievements(id!),
    enabled: !!id && !profileQ.data?.is_profile_private,
    retry: false,
  });

  if (profileQ.isLoading) return <PageLoader />;
  if (!profileQ.data) return <div>Профиль не найден</div>;

  const p = profileQ.data;

  return (
    <div>
      <PageHeader eyebrow="Публичный профиль" title={p.display_name} />

      <div className="grid grid-cols-[360px_1fr] gap-8">
        <aside className="card p-6 h-fit">
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={p.display_name} url={p.avatar_url} size={72} />
            <div className="min-w-0">
              <div className="text-[18px] font-bold -tracking-tight truncate">{p.display_name}</div>
              {p.telegram_username && (
                <a
                  href={`https://t.me/${p.telegram_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] text-primary hover:underline"
                >
                  t.me/{p.telegram_username}
                </a>
              )}
            </div>
          </div>
          {p.about && (
            <div className="text-[13px] text-text-2 leading-snug whitespace-pre-line mb-4">
              {p.about}
            </div>
          )}
          {p.learning_started_at && (
            <div className="caption text-text-3 normal-case font-sans tracking-normal">
              На платформе с {formatDate(p.learning_started_at)}
              {p.learning_days !== undefined && ` · ${p.learning_days} дн.`}
            </div>
          )}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {p.roles?.map((r) => (
              <span key={r} className="pill capitalize">{r}</span>
            ))}
            <span className={`pill ${p.is_profile_private ? "" : "required"}`}>
              {p.is_profile_private ? "Закрытый" : "Открытый"}
            </span>
          </div>
        </aside>

        <div className="space-y-7">
          {p.is_profile_private ? (
            <div className="card p-8 text-text-3 text-[13px] text-center">
              Пользователь закрыл расширенный профиль. Виден только аватар, имя и telegram.
            </div>
          ) : (
            <>
              {progressQ.data && (
                <section>
                  <h2 className="text-[18px] font-semibold mb-4 -tracking-tight">Прогресс</h2>
                  <div className="elevated p-5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="caption">Общий прогресс</div>
                        <div className="font-mono font-bold text-primary text-[28px] -tracking-[0.02em]">
                          {progressQ.data.overall_percent}%
                        </div>
                      </div>
                      <div className="caption">
                        {progressQ.data.approved_blocks} / {progressQ.data.total_active_blocks} блоков
                      </div>
                    </div>
                    <ProgressBar value={progressQ.data.overall_percent} />
                  </div>
                  <div className="space-y-2">
                    {progressQ.data.blocks.map((b, i) => (
                      <div key={b.block_id} className="elevated p-3 flex items-center gap-3">
                        <div className="font-mono font-bold w-8 text-text-2">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div className="flex-1">
                          <ProgressBar
                            value={b.progress_percent}
                            height={6}
                            variant={b.status === "approved" ? "success" : "default"}
                          />
                        </div>
                        <div className="font-mono text-[12px] text-text-2 w-12 text-right">
                          {b.progress_percent}%
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {achQ.data && (
                <section>
                  <h2 className="text-[18px] font-semibold mb-4 -tracking-tight">
                    Достижения ({achQ.data.filter((a) => a.received).length})
                  </h2>
                  <div className="grid grid-cols-5 gap-3">
                    {achQ.data
                      .filter((a) => a.received)
                      .map((a) => (
                        <div key={a.achievement.id} className="elevated p-3 flex flex-col items-center gap-2">
                          <HexBadge
                            glyph={a.achievement.title[0] ?? "?"}
                            size={56}
                            accent="secondary"
                            imageUrl={a.achievement.image_url}
                          />
                          <div className="text-[11px] text-center font-medium leading-tight">
                            {a.achievement.title}
                          </div>
                        </div>
                      ))}
                    {achQ.data.filter((a) => a.received).length === 0 && (
                      <div className="text-text-3 text-[13px] col-span-5 py-6 text-center">
                        Достижений пока нет
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

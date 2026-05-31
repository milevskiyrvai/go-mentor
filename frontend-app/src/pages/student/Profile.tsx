import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSelf } from "@/api/users";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/stores/auth";
import { Avatar } from "@/components/Sidebar";
import { formatDate } from "@/lib/format";

export function StudentProfile() {
  const { user, set, selectedRole } = useAuth();
  const queryClient = useQueryClient();
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

  const mut = useMutation({
    mutationFn: () =>
      updateSelf({
        display_name: displayName,
        avatar_url: avatarUrl || undefined,
        about: about,
        is_profile_private: isPrivate,
      }),
    onSuccess: (updated) => {
      set({ user: updated });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      setError(null);
    },
    onError: () => setError("Не удалось сохранить"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Профиль"
        title="Мой профиль"
        description="Управляйте аватаром, отображаемым именем, описанием и видимостью публичного профиля."
      />

      <div className="grid grid-cols-[1fr_400px] gap-8">
        {/* Form */}
        <div className="space-y-5">
          <div className="card p-6 space-y-4">
            <div>
              <label className="caption mb-1.5 block">Avatar URL</label>
              <input
                className="input"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://i.imgur.com/avatar.png"
              />
            </div>
            <div>
              <label className="caption mb-1.5 block">Отображаемое имя</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Алиса Иванова"
              />
            </div>
            <div>
              <label className="caption mb-1.5 block">О себе</label>
              <textarea
                className="textarea"
                rows={5}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Расскажите, кто вы, чем занимаетесь, какие цели в Go."
              />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-[15px]">Приватный профиль</h3>
                <p className="text-text-2 text-[12px] mt-1 max-w-md leading-snug">
                  Когда включено, другие пользователи видят только имя, аватар и telegram. Прогресс, достижения и активность скрыты. Buddy всё равно видит ваш прогресс.
                </p>
              </div>
              <Toggle checked={isPrivate} onChange={setIsPrivate} />
            </div>
          </div>

          {error && (
            <div className="text-[13px] px-3 py-2 rounded-md border border-danger/40 bg-danger/10 text-danger">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary"
              disabled={mut.isPending}
              onClick={() => mut.mutate()}
            >
              Сохранить изменения
            </button>
            {saved && (
              <span className="text-success text-[13px] font-mono">✓ Сохранено</span>
            )}
          </div>
        </div>

        {/* Preview */}
        <aside className="card p-6 h-fit sticky top-6">
          <div className="caption mb-4">Live-превью</div>
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={displayName} url={avatarUrl} role={selectedRole} size={64} />
            <div>
              <div className="text-[18px] font-bold -tracking-tight">{displayName || "—"}</div>
              <div className="text-[12px] text-text-2 font-mono">@{user?.login}</div>
              {user?.telegram_username && (
                <a
                  href={`https://t.me/${user.telegram_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] text-primary hover:underline mt-1 inline-block"
                >
                  t.me/{user.telegram_username}
                </a>
              )}
            </div>
          </div>
          {about && (
            <div className="text-[13px] text-text-2 leading-snug whitespace-pre-line mb-4">
              {about}
            </div>
          )}
          {user?.learning_started_at && (
            <div className="caption text-text-3 normal-case font-sans tracking-normal">
              На платформе с {formatDate(user.learning_started_at)}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
            <span className={`pill ${isPrivate ? "" : "required"}`}>
              {isPrivate ? "Закрытый профиль" : "Открытый профиль"}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full border transition-all ${
        checked ? "bg-primary/20 border-primary" : "bg-bg border-border"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[22px] h-[22px] rounded-full transition-all ${
          checked ? "translate-x-5 bg-primary shadow-[0_0_10px_rgba(95,130,104,0.5)]" : "bg-text-3"
        }`}
      />
    </button>
  );
}

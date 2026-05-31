import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/Button";
import { Drawer } from "@/components/Drawer";
import { TextField } from "@/components/TextField";
import {
  listAchievements,
  createAchievement,
  updateAchievement,
  listAchievementUsers,
} from "@/api/achievements";
import type { Achievement } from "@/api/types";

const CONDITION_TYPES = [
  { value: "materials_viewed_count", label: "По кол-ву материалов" },
  { value: "block_approved", label: "Закрытие блока N" },
  { value: "interviews_count", label: "По кол-ву собеседований" },
  { value: "profile_completed", label: "Профиль оформлен" },
  { value: "finals_completed", label: "Финальные пройдены" },
  { value: "first_one_on_one_approved", label: "Первый 1×1 одобрен" },
];

export function AchievementsPage() {
  const qc = useQueryClient();
  const achQ = useQuery({
    queryKey: ["admin", "achievements"],
    queryFn: () => listAchievements(true),
  });
  const [editing, setEditing] = useState<Achievement | "new" | null>(null);

  const items = achQ.data ?? [];

  const userCounts = useQueries({
    queries: items.map((a) => ({
      queryKey: ["admin", "achievements", a.id, "users"],
      queryFn: () => listAchievementUsers(a.id),
      enabled: !!a.id,
      staleTime: 60_000,
    })),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (a: Achievement) => updateAchievement(a.id, { is_active: !a.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "achievements"] }),
  });

  return (
    <>
      <Crumbs segments={[{ label: "GO_MENTOR", to: "/admin/dashboard" }, { label: "ADMIN", to: "/admin/dashboard" }]} liveSegment="ДОСТИЖЕНИЯ" />
      <PageHead
        eyebrow="ADMIN · ACHIEVEMENTS"
        title="Достижения"
        description={
          <>
            <b>{items.length}</b> достижений в каталоге. Можно создавать, редактировать, менять
            награду и условие, включать/выключать. Под каждой ачивкой счётчик «получили N»
            (live из БД).
          </>
        }
        right={
          <Button variant="warn" arrow onClick={() => setEditing("new")}>
            + Новое достижение
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((a, idx) => {
          const count = userCounts[idx]?.data?.length ?? 0;
          return (
            <article
              key={a.id}
              className="card-base p-4 flex flex-col gap-3"
              style={{
                background: a.is_active ? "var(--elevated)" : "var(--surface)",
                opacity: a.is_active ? 1 : 0.65,
              }}
            >
              <div className="flex items-start gap-3">
                <AchievementBadge achievement={a} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold truncate">{a.title}</div>
                  <div className="text-text-3 text-[11px] font-mono uppercase tracking-wider mt-1">
                    {a.condition_type}
                  </div>
                </div>
              </div>
              {a.description && (
                <p className="m-0 text-[12.5px] text-text-2 leading-relaxed">{a.description}</p>
              )}

              <div className="flex items-center gap-2 mt-auto pt-2">
                <span
                  className="font-mono font-bold inline-flex items-center gap-1.5"
                  style={{ fontSize: "13px", color: "var(--warning)" }}
                >
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(169,132,47,0.9), var(--warning) 70%)",
                      boxShadow: "0 0 10px rgba(169,132,47,0.4)",
                    }}
                  />
                  +{a.reward_bonus}
                </span>
                <span
                  className="font-mono uppercase ml-auto"
                  style={{ fontSize: "10px", color: "var(--text-3)" }}
                >
                  Получили: {count}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                  edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActiveMut.mutate(a)}>
                  {a.is_active ? "off" : "on"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {editing && (
        <AchievementDrawer
          mode={editing === "new" ? "create" : "edit"}
          achievement={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "achievements"] });
          }}
        />
      )}
    </>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  if (achievement.image_url) {
    return (
      <div
        className="w-[52px] h-[52px] rounded-md flex-shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${achievement.image_url})`,
          border: "1px solid var(--border)",
        }}
      />
    );
  }
  return (
    <div
      className="w-[52px] h-[52px] rounded-md flex-shrink-0 grid place-items-center font-mono font-bold"
      style={{
        fontSize: "18px",
        color: "#1e1700",
        background: "linear-gradient(140deg, var(--warning), var(--danger))",
        boxShadow: "0 0 18px -8px var(--warning)",
      }}
    >
      ✦
    </div>
  );
}

function AchievementDrawer({
  mode,
  achievement,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  achievement?: Achievement;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(achievement?.title ?? "");
  const [description, setDescription] = useState(achievement?.description ?? "");
  const [reward, setReward] = useState(String(achievement?.reward_bonus ?? 50));
  const [imageUrl, setImageUrl] = useState(achievement?.image_url ?? "");
  const [conditionType, setConditionType] = useState(
    achievement?.condition_type ?? "materials_viewed_count"
  );
  const [conditionParams, setConditionParams] = useState(
    achievement?.condition_params
      ? JSON.stringify(achievement.condition_params, null, 2)
      : `{"count": 10}`
  );
  const [paramsError, setParamsError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => {
      let params: unknown = {};
      try {
        params = JSON.parse(conditionParams || "{}");
        setParamsError(null);
      } catch {
        setParamsError("Невалидный JSON");
        throw new Error("invalid_json");
      }
      if (mode === "create") {
        return createAchievement({
          title: title.trim(),
          description: description.trim() || undefined,
          reward_bonus: Number(reward) || 0,
          image_url: imageUrl.trim() || undefined,
          condition_type: conditionType,
          condition_params: params,
        });
      }
      return updateAchievement(achievement!.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        reward_bonus: Number(reward) || 0,
        image_url: imageUrl.trim() || undefined,
        condition_type: conditionType,
        condition_params: params,
      });
    },
    onSuccess: onSaved,
  });

  // Template for current condition type:
  const showCondHint = (() => {
    switch (conditionType) {
      case "materials_viewed_count":
        return `{"count": 10}`;
      case "block_approved":
        return `{"block_index": 1}  // 1-based`;
      case "interviews_count":
        return `{"type": "real", "count": 3}  // type: "mock"|"real"`;
      case "profile_completed":
      case "finals_completed":
      case "first_one_on_one_approved":
        return `{}`;
      default:
        return "";
    }
  })();

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === "create" ? "Новое достижение" : `Редактирование · ${achievement?.title}`}
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="warn"
            className="flex-1"
            onClick={() => mut.mutate()}
            disabled={!title || mut.isPending}
          >
            {mut.isPending ? "Сохранение..." : mode === "create" ? "Создать" : "Сохранить"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Название"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="flex flex-col">
          <div className="caption mb-2">Описание</div>
          <textarea
            className="input-base"
            style={{
              minHeight: "70px",
              padding: "12px 14px",
              alignItems: "flex-start",
              height: "auto",
              fontFamily: "var(--sans)",
              fontSize: "13.5px",
            }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Награда (бонусы)"
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
          />
          <TextField
            label="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="flex flex-col">
          <div className="caption mb-2">Тип условия</div>
          <select
            className="input-base"
            value={conditionType}
            onChange={(e) => {
              setConditionType(e.target.value);
              // also clear params with new template
              switch (e.target.value) {
                case "materials_viewed_count":
                  setConditionParams(`{"count": 10}`);
                  break;
                case "block_approved":
                  setConditionParams(`{"block_index": 1}`);
                  break;
                case "interviews_count":
                  setConditionParams(`{"type": "real", "count": 3}`);
                  break;
                default:
                  setConditionParams("{}");
              }
            }}
          >
            {CONDITION_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <div className="caption mb-2">Параметры условия (JSON)</div>
          <textarea
            className="input-base"
            style={{
              minHeight: "100px",
              padding: "12px 14px",
              alignItems: "flex-start",
              height: "auto",
              fontFamily: "var(--mono)",
              fontSize: "12px",
            }}
            value={conditionParams}
            onChange={(e) => setConditionParams(e.target.value)}
          />
          <div className="caption mt-1" style={{ color: "var(--text-3)" }}>
            Пример: {showCondHint}
          </div>
          {paramsError && (
            <div
              className="text-[12px] px-3 py-2 mt-2 rounded-md"
              style={{
                color: "var(--danger)",
                background: "rgba(175,88,64,0.08)",
                border: "1px solid rgba(175,88,64,0.3)",
              }}
            >
              {paramsError}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

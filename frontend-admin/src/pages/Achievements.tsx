import { useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import clsx from "clsx";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { Drawer } from "@/components/Drawer";
import { TextField } from "@/components/TextField";
import {
  listAchievements,
  createAchievement,
  updateAchievement,
  listAchievementUsers,
} from "@/api/achievements";
import {
  listOneOnOne,
  approveOneOnOne,
  rejectOneOnOne,
} from "@/api/oneOnOne";
import { listUsers } from "@/api/users";
import type { Achievement, OneOnOneRequest, UserListItem } from "@/api/types";
import { getApiErrorCode } from "@/api/client";

/* ============================================================
   Условия выдачи достижения (§15). Значение = condition_type,
   которое уходит на бэк. Лейбл — человекочитаемый.
   ============================================================ */
const CONDITION_TYPES: { value: string; label: string }[] = [
  { value: "materials_viewed_count", label: "Открыл N материалов" },
  { value: "block_approved", label: "Наставник подтвердил блок N" },
  { value: "interviews_count", label: "Пройдено N собеседований" },
  { value: "profile_completed", label: "Профиль оформлен" },
  { value: "finals_completed", label: "Финальные пройдены" },
  { value: "first_one_on_one_approved", label: "Первый 1×1 одобрен" },
  { value: "manual", label: "Ручная выдача админом" },
];

const CONDITION_LABEL: Record<string, string> = Object.fromEntries(
  CONDITION_TYPES.map((c) => [c.value, c.label])
);

type SealColor = "primary" | "sage" | "amber";

/* Медальон не хранится на бэке отдельным полем — выводим символ и
   цвет детерминированно из самого достижения, чтобы каталог был
   стабильным между перезагрузками (макет admin-achievements.html). */
function sealGlyph(a: Achievement): string {
  const t = (a.title ?? "").trim();
  if (!t) return "★";
  const first = t[0];
  return /[A-Za-zА-Яа-я0-9]/.test(first) ? first.toUpperCase() : "★";
}

function sealColor(a: Achievement): SealColor {
  const r = a.reward_bonus;
  if (r >= 200) return "amber";
  if (r >= 100) return "sage";
  return "primary";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AchievementsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"ach" | "req">("ach");
  const [editing, setEditing] = useState<Achievement | "new" | null>(null);
  const [recipientsFor, setRecipientsFor] = useState<Achievement | null>(null);

  const achQ = useQuery({
    queryKey: ["admin", "achievements"],
    queryFn: () => listAchievements(true),
  });
  const items = achQ.data ?? [];

  // Счётчики «получили N» — live из БД, по одному запросу на ачивку.
  const userCounts = useQueries({
    queries: items.map((a) => ({
      queryKey: ["admin", "achievements", a.id, "users"],
      queryFn: () => listAchievementUsers(a.id),
      enabled: !!a.id,
      staleTime: 60_000,
    })),
  });
  const countById = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((a, i) => m.set(a.id, userCounts[i]?.data?.length ?? 0));
    return m;
  }, [items, userCounts]);

  // Заявки 1×1 (§21) — для бейджа на табе и второй панели.
  const reqQ = useQuery({
    queryKey: ["admin", "one-on-one"],
    queryFn: () => listOneOnOne(),
  });
  const allReq = reqQ.data ?? [];
  const pendingReq = allReq.filter((r) => r.status === "pending");
  const processedReq = allReq.filter((r) => r.status !== "pending");

  return (
    <>
      <Crumbs
        segments={[
          { label: "GO_MENTOR", to: "/admin/dashboard" },
          { label: "ADMIN", to: "/admin/dashboard" },
        ]}
        liveSegment="ДОСТИЖЕНИЯ"
      />
      <PageHead
        eyebrow="ADMIN · ДОСТИЖЕНИЯ И ЗАЯВКИ"
        title="Достижения и заявки"
        description={
          <>
            <b>{items.length}</b> достижений в каталоге ·{" "}
            <b>{pendingReq.length}</b> заявок 1×1 ждут одобрения. Создавай и
            редактируй достижения (награда, условие, порядок, вкл/выкл), смотри
            получивших, одобряй или отклоняй запросы на 1×1.
          </>
        }
        right={
          tab === "ach" ? (
            <Button variant="warn" arrow onClick={() => setEditing("new")}>
              + Достижение
            </Button>
          ) : undefined
        }
      />

      {/* ===== Tabs ===== */}
      <div className="tabs">
        <button
          type="button"
          className={clsx("tab", tab === "ach" && "active")}
          onClick={() => setTab("ach")}
        >
          Каталог достижений <span className="c">{items.length}</span>
        </button>
        <button
          type="button"
          className={clsx("tab", tab === "req" && "active")}
          onClick={() => setTab("req")}
        >
          Заявки 1×1 <span className="c">{pendingReq.length}</span>
        </button>
      </div>

      {/* ===== Panel: achievements catalog ===== */}
      {tab === "ach" && (
        <AchievementsPanel
          loading={achQ.isLoading}
          error={achQ.isError}
          items={items}
          countById={countById}
          onCreate={() => setEditing("new")}
          onEdit={(a) => setEditing(a)}
          onOpenRecipients={(a) => setRecipientsFor(a)}
          onToggleActive={(a) =>
            updateAchievement(a.id, { is_active: !a.is_active }).then(() =>
              qc.invalidateQueries({ queryKey: ["admin", "achievements"] })
            )
          }
        />
      )}

      {/* ===== Panel: 1×1 requests ===== */}
      {tab === "req" && (
        <OneOnOnePanel
          loading={reqQ.isLoading}
          error={reqQ.isError}
          pending={pendingReq}
          processed={processedReq}
          onChanged={() =>
            qc.invalidateQueries({ queryKey: ["admin", "one-on-one"] })
          }
        />
      )}

      {editing && (
        <AchievementDrawer
          mode={editing === "new" ? "create" : "edit"}
          achievement={editing === "new" ? undefined : editing}
          nextOrder={items.length + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "achievements"] });
          }}
        />
      )}

      {recipientsFor && (
        <RecipientsDrawer
          achievement={recipientsFor}
          onClose={() => setRecipientsFor(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   PANEL 1 — Каталог достижений (карточки-медальоны)
   ============================================================ */

function AchievementsPanel({
  loading,
  error,
  items,
  countById,
  onCreate,
  onEdit,
  onOpenRecipients,
  onToggleActive,
}: {
  loading: boolean;
  error: boolean;
  items: Achievement[];
  countById: Map<string, number>;
  onCreate: () => void;
  onEdit: (a: Achievement) => void;
  onOpenRecipients: (a: Achievement) => void;
  onToggleActive: (a: Achievement) => void;
}) {
  if (loading) {
    return (
      <div className="ach-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card-base p-[18px] flex flex-col gap-3"
            style={{ minHeight: 180, opacity: 0.5 }}
          >
            <div
              className="w-12 h-12 rounded-md"
              style={{ background: "var(--bg)" }}
            />
            <div className="h-3.5 w-2/3 rounded" style={{ background: "var(--bg)" }} />
            <div className="h-2.5 w-full rounded" style={{ background: "var(--bg)" }} />
            <div className="h-2.5 w-1/2 rounded" style={{ background: "var(--bg)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-[13px] px-4 py-6 rounded-lg text-center"
        style={{
          color: "var(--danger)",
          background: "var(--danger-soft)",
          border: "1px solid var(--line)",
        }}
      >
        Не удалось загрузить достижения. Обнови страницу.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-lg px-6 py-14 text-center flex flex-col items-center gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <div className="seal" style={{ width: 64, height: 64, flex: "0 0 64px" }}>
          <span className="gl" style={{ fontSize: 22 }}>
            ★
          </span>
        </div>
        <div>
          <div className="text-[15px] font-bold mb-1">Каталог пуст</div>
          <div className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
            Создай первое достижение — оно появится у студентов после включения.
          </div>
        </div>
        <Button variant="warn" arrow onClick={onCreate}>
          + Достижение
        </Button>
      </div>
    );
  }

  return (
    <div className="ach-grid">
      {items.map((a) => (
        <AchievementCard
          key={a.id}
          achievement={a}
          count={countById.get(a.id) ?? 0}
          onEdit={() => onEdit(a)}
          onOpenRecipients={() => onOpenRecipients(a)}
          onToggleActive={() => onToggleActive(a)}
        />
      ))}
    </div>
  );
}

function Seal({
  glyph,
  color,
  className,
  style,
}: {
  glyph: string;
  color: SealColor;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx("seal", className)}
      data-seal={color === "primary" ? undefined : color}
      style={style}
    >
      <span className="gl">{glyph}</span>
    </div>
  );
}

function AchievementCard({
  achievement,
  count,
  onEdit,
  onOpenRecipients,
  onToggleActive,
}: {
  achievement: Achievement;
  count: number;
  onEdit: () => void;
  onOpenRecipients: () => void;
  onToggleActive: () => void;
}) {
  const a = achievement;
  const glyph = sealGlyph(a);
  const color = sealColor(a);

  return (
    <article
      className={clsx("ach-card clickable", !a.is_active && "draft")}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("button")) return;
        onOpenRecipients();
      }}
    >
      {!a.is_active && (
        <StatusBadge kind="not-started" className="!absolute top-[14px] right-[14px]">
          Черновик
        </StatusBadge>
      )}

      {a.image_url ? (
        <div
          className="seal bg-cover bg-center"
          style={{ backgroundImage: `url(${a.image_url})` }}
          aria-hidden
        />
      ) : (
        <Seal glyph={glyph} color={color} />
      )}

      <div>
        <div className="at">{a.title}</div>
        {a.description && <div className="ad">{a.description}</div>}
      </div>

      {count > 0 ? (
        <div className="recip-foot">
          <span className="av-stack">
            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
              <span key={i}>{["МК", "ОЗ", "СК"][i]}</span>
            ))}
          </span>
          {count} получили
        </div>
      ) : (
        <div className="recip-foot" style={{ color: "var(--ink-3)" }}>
          Ещё никто не получил
        </div>
      )}

      <div className="af">
        <span className="reward">+{a.reward_bonus}</span>
        <div className="acard-acts">
          <button
            type="button"
            className="iconbtn edit"
            aria-label="изменить"
            onClick={onEdit}
            title="Редактировать"
          >
            <svg
              className="i"
              style={{ width: 15, height: 15 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path d="M4 20h4L18 10l-4-4L4 16v4Z" strokeLinejoin="round" />
              <path d="M14 6l4 4" />
            </svg>
          </button>
          <button
            type="button"
            className="iconbtn"
            aria-label={a.is_active ? "скрыть" : "включить"}
            onClick={onToggleActive}
            title={a.is_active ? "Скрыть (в черновик)" : "Включить"}
          >
            {a.is_active ? (
              <svg
                className="i"
                style={{ width: 15, height: 15 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                className="i"
                style={{ width: 15, height: 15 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M9.9 5.2A9.5 9.5 0 0 1 22 12a13 13 0 0 1-2.2 3M6.1 6.2A13 13 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3.1-.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   PANEL 2 — Заявки 1×1 (ledger, approve/reject §21)
   ============================================================ */

function OneOnOnePanel({
  loading,
  error,
  pending,
  processed,
  onChanged,
}: {
  loading: boolean;
  error: boolean;
  pending: OneOnOneRequest[];
  processed: OneOnOneRequest[];
  onChanged: () => void;
}) {
  const usersQ = useQuery({
    queryKey: ["admin", "users-lookup-for-one-on-one"],
    queryFn: () => listUsers({ include_deleted: true }),
  });
  const userById = (id: string): UserListItem | undefined =>
    usersQ.data?.find((u) => u.id === id);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = (id: string, action: "approve" | "reject") => {
    setActionError(null);
    setBusyId(id);
    const fn = action === "approve" ? approveOneOnOne : rejectOneOnOne;
    fn(id)
      .then(() => onChanged())
      .catch((err) => {
        const code = getApiErrorCode(err);
        setActionError(
          code === "insufficient_funds"
            ? "У студента недостаточно бонусов (нужно 1000)"
            : code === "invalid_status"
            ? "Действие недоступно в текущем статусе"
            : "Не удалось выполнить действие"
        );
      })
      .finally(() => setBusyId(null));
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-text-3">
        <span className="inline-block w-5 h-5 rounded-full border-2 border-warning border-t-transparent spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-[13px] px-4 py-6 rounded-lg text-center"
        style={{
          color: "var(--danger)",
          background: "var(--danger-soft)",
          border: "1px solid var(--line)",
        }}
      >
        Не удалось загрузить заявки. Обнови страницу.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {actionError && (
        <div
          className="text-[13px] px-3 py-2 rounded-md"
          style={{
            color: "var(--danger)",
            background: "var(--danger-soft)",
            border: "1px solid transparent",
          }}
        >
          {actionError}
        </div>
      )}

      {/* Pending */}
      <div
        className="card-base"
        style={{ padding: 0, overflow: "hidden" }}
      >
        {pending.length === 0 ? (
          <div className="px-[18px] py-12 text-center">
            <div className="text-[14px] font-bold mb-1">Новых заявок нет</div>
            <div className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
              Все запросы на 1×1 обработаны.
            </div>
          </div>
        ) : (
          <div className="ledger" style={{ padding: "0 18px" }}>
            {pending.map((r) => {
              const u = userById(r.student_id);
              const busy = busyId === r.id;
              return (
                <div className="txn" key={r.id}>
                  <div
                    className="ic"
                    style={{
                      background: "var(--secondary-soft)",
                      color: "var(--secondary)",
                      borderColor: "transparent",
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    1×1
                  </div>
                  <div>
                    <div className="tt">Запрос на 1×1</div>
                    <div className="ds">
                      {u?.display_name ?? r.student_id.slice(0, 8)}
                      {u?.telegram_username ? ` · @${u.telegram_username}` : ""} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <div className="right flex gap-2 items-center">
                    <span style={{ color: "var(--secondary)", fontWeight: 800, fontSize: 13 }}>
                      −1 000
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => act(r.id, "reject")}
                    >
                      Отклонить
                    </Button>
                    <Button
                      variant="warn"
                      size="sm"
                      disabled={busy}
                      onClick={() => act(r.id, "approve")}
                    >
                      {busy ? "..." : "Одобрить"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Processed */}
      {processed.length > 0 && (
        <div className="card-base" style={{ padding: 0, overflow: "hidden" }}>
          <div className="px-[18px] pt-4 pb-2.5">
            <h3
              className="text-[13px] uppercase m-0"
              style={{ color: "var(--ink-3)", letterSpacing: "0.08em" }}
            >
              Обработанные
            </h3>
          </div>
          <div className="ledger" style={{ padding: "0 18px 6px" }}>
            {processed.map((r) => {
              const u = userById(r.student_id);
              const isApproved = r.status === "approved" || r.status === "completed";
              return (
                <div className="txn" key={r.id}>
                  <div
                    className="ic"
                    style={
                      isApproved
                        ? {
                            background: "var(--primary-soft)",
                            color: "var(--primary-ink)",
                            borderColor: "transparent",
                          }
                        : {
                            background: "var(--danger-soft)",
                            color: "var(--danger)",
                            borderColor: "transparent",
                          }
                    }
                  >
                    {isApproved ? (
                      <svg
                        className="i"
                        style={{ width: 15, height: 15 }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.4}
                      >
                        <polyline
                          points="5 12 10 17 19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      "✕"
                    )}
                  </div>
                  <div>
                    <div className="tt">Запрос на 1×1</div>
                    <div className="ds">
                      {u?.display_name ?? r.student_id.slice(0, 8)} ·{" "}
                      {(r.processed_at
                        ? new Date(r.processed_at)
                        : new Date(r.updated_at)
                      ).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      ·{" "}
                      {r.status === "rejected" || r.status === "cancelled"
                        ? "бонусы возвращены"
                        : "списано 1 000"}
                    </div>
                  </div>
                  <div className="right">
                    <StatusBadge kind={r.status}>
                      {r.status === "approved"
                        ? "Одобрена"
                        : r.status === "completed"
                        ? "Завершена"
                        : r.status === "rejected"
                        ? "Отклонена"
                        : "Отменена"}
                    </StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DRAWER — Форма достижения (§15): картинка/символ + цвет, название,
   описание, награда, порядок, условие выдачи, активность, удаление.
   ============================================================ */

const COLOR_OPTIONS: { value: SealColor; label: string }[] = [
  { value: "primary", label: "шалфей" },
  { value: "sage", label: "терракота" },
  { value: "amber", label: "янтарь" },
];

function AchievementDrawer({
  mode,
  achievement,
  nextOrder,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  achievement?: Achievement;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(achievement?.title ?? "");
  const [description, setDescription] = useState(achievement?.description ?? "");
  const [reward, setReward] = useState(String(achievement?.reward_bonus ?? 50));
  const [order, setOrder] = useState(
    String(achievement?.sort_order ?? nextOrder)
  );
  const [conditionType, setConditionType] = useState(
    achievement?.condition_type ?? "materials_viewed_count"
  );
  const [imageUrl, setImageUrl] = useState(achievement?.image_url ?? "");
  const [glyph, setGlyph] = useState(
    achievement ? sealGlyph(achievement) : "★"
  );
  const [color, setColor] = useState<SealColor>(
    achievement ? sealColor(achievement) : "primary"
  );
  const [isActive, setIsActive] = useState(achievement?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  // Параметры условия (§15) — структурированные поля под выбранный тип.
  const initialParams = (achievement?.condition_params ?? {}) as Record<string, unknown>;
  const [paramCount, setParamCount] = useState(
    String((initialParams.count as number) ?? 10)
  );
  const [paramBlockIndex, setParamBlockIndex] = useState(
    String((initialParams.block_index as number) ?? 1)
  );
  const [paramInterviewType, setParamInterviewType] = useState(
    (initialParams.type as string) ?? "real"
  );

  const buildParams = (): Record<string, unknown> => {
    switch (conditionType) {
      case "materials_viewed_count":
        return { count: Number(paramCount) || 0 };
      case "block_approved":
        return { block_index: Number(paramBlockIndex) || 1 };
      case "interviews_count":
        return { type: paramInterviewType, count: Number(paramCount) || 0 };
      default:
        return {};
    }
  };

  const mut = useMutation({
    mutationFn: () => {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        reward_bonus: Number(reward) || 0,
        image_url: imageUrl.trim() || undefined,
        condition_type: conditionType,
        condition_params: buildParams(),
      };
      if (mode === "create") {
        return createAchievement(body);
      }
      return updateAchievement(achievement!.id, { ...body, is_active: isActive });
    },
    onSuccess: onSaved,
    onError: () => setError("Не удалось сохранить достижение"),
  });

  const showCount =
    conditionType === "materials_viewed_count" ||
    conditionType === "interviews_count";
  const showBlockIndex = conditionType === "block_approved";
  const showInterviewType = conditionType === "interviews_count";

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        mode === "create"
          ? "Новое достижение"
          : `Редактирование · ${achievement?.title}`
      }
      footer={
        <>
          {mode === "edit" && (
            <button
              type="button"
              className="del"
              onClick={() => {
                if (
                  achievement &&
                  confirm(
                    `Выключить достижение «${achievement.title}»? Оно скроется у студентов (черновик).`
                  )
                ) {
                  updateAchievement(achievement.id, { is_active: false }).then(
                    onSaved
                  );
                }
              }}
            >
              Скрыть достижение
            </button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="warn"
            onClick={() => mut.mutate()}
            disabled={!title.trim() || mut.isPending}
          >
            {mut.isPending
              ? "Сохранение..."
              : mode === "create"
              ? "Создать"
              : "Сохранить"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Медальон: символ + цвет (макет §15) */}
        <div className="flex flex-col">
          <div className="caption mb-2">Картинка медальона</div>
          <div className="sealpick">
            {imageUrl.trim() ? (
              <div
                className="seal bg-cover bg-center"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  width: 72,
                  height: 72,
                  flex: "0 0 72px",
                }}
              />
            ) : (
              <Seal
                glyph={glyph || "★"}
                color={color}
                style={{ width: 72, height: 72, flex: "0 0 72px" }}
              />
            )}
            <div className="sp-controls">
              <TextField
                label=""
                value={glyph}
                onChange={(e) => setGlyph(e.target.value.slice(0, 3))}
                placeholder="символ: ★, B1, M…"
              />
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setColor(c.value)}
                    className={clsx(
                      "w-6 h-6 rounded-full cursor-pointer transition-transform",
                      color === c.value && "scale-110"
                    )}
                    style={{
                      background:
                        c.value === "primary"
                          ? "var(--primary)"
                          : c.value === "sage"
                          ? "var(--secondary)"
                          : "var(--warning)",
                      border:
                        color === c.value
                          ? "2px solid var(--ink)"
                          : "2px solid var(--surface)",
                      boxShadow: "0 0 0 1px var(--line)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="hint mt-2 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
            Свой символ/эмодзи или ссылка на иконку. Цвет — из палитры платформы.
          </div>
        </div>

        <TextField
          label="URL картинки (опционально)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />

        <TextField
          label="Название"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="например, Первый блок закрыт"
        />

        <div className="flex flex-col">
          <div className="caption mb-2">Описание</div>
          <textarea
            className="input-base"
            style={{
              minHeight: 70,
              padding: "12px 14px",
              alignItems: "flex-start",
              height: "auto",
              fontFamily: "var(--sans)",
              fontSize: "13.5px",
            }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="За что выдаётся достижение"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Награда, бонусы"
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="250"
          />
          <TextField
            label="Порядок"
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="1"
          />
        </div>

        {/* Условие выдачи (§15) */}
        <div className="flex flex-col">
          <div className="caption mb-2">Условие выдачи</div>
          <select
            className="input-base"
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
          >
            {CONDITION_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="hint mt-1.5 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
            Триггер, по которому достижение начисляется автоматически (или
            вручную).
          </div>
        </div>

        {(showCount || showBlockIndex || showInterviewType) && (
          <div className="grid grid-cols-2 gap-3">
            {showInterviewType && (
              <div className="flex flex-col">
                <div className="caption mb-2">Тип собеседования</div>
                <select
                  className="input-base"
                  value={paramInterviewType}
                  onChange={(e) => setParamInterviewType(e.target.value)}
                >
                  <option value="mock">Mock</option>
                  <option value="real">Real</option>
                </select>
              </div>
            )}
            {showCount && (
              <TextField
                label="Сколько (N)"
                type="number"
                value={paramCount}
                onChange={(e) => setParamCount(e.target.value)}
              />
            )}
            {showBlockIndex && (
              <TextField
                label="Номер блока (1-based)"
                type="number"
                value={paramBlockIndex}
                onChange={(e) => setParamBlockIndex(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Активность (только при редактировании — при создании всегда активно) */}
        {mode === "edit" && (
          <>
            <div style={{ borderTop: "1px solid var(--line)" }} className="pt-4" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold">Активно</div>
                <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                  Выключенное достижение скрыто у студентов (черновик).
                </div>
              </div>
              <button
                type="button"
                className={clsx("switch", isActive && "on")}
                onClick={() => setIsActive((v) => !v)}
                aria-pressed={isActive}
              >
                <span className="track" />
              </button>
            </div>
          </>
        )}

        {error && (
          <div
            className="text-[12px] px-3 py-2 rounded-md"
            style={{
              color: "var(--danger)",
              background: "var(--danger-soft)",
              border: "1px solid transparent",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ============================================================
   DRAWER — Получившие достижение (§15): live-список из БД
   ============================================================ */

function RecipientsDrawer({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const a = achievement;
  const usersIdsQ = useQuery({
    queryKey: ["admin", "achievements", a.id, "users"],
    queryFn: () => listAchievementUsers(a.id),
  });
  const usersQ = useQuery({
    queryKey: ["admin", "users-lookup-for-one-on-one"],
    queryFn: () => listUsers({ include_deleted: true }),
  });

  const userIds = usersIdsQ.data ?? [];
  const userById = (id: string): UserListItem | undefined =>
    usersQ.data?.find((u) => u.id === id);

  const loading = usersIdsQ.isLoading || usersQ.isLoading;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Получившие достижение"
      footer={
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      <div className="recip-sum">
        {a.image_url ? (
          <div
            className="seal bg-cover bg-center"
            style={{
              backgroundImage: `url(${a.image_url})`,
              width: 52,
              height: 52,
              flex: "0 0 52px",
            }}
          />
        ) : (
          <Seal
            glyph={sealGlyph(a)}
            color={sealColor(a)}
            style={{ width: 52, height: 52, flex: "0 0 52px" }}
          />
        )}
        <div>
          <div className="flex items-baseline gap-[7px]">
            <span className="n">{userIds.length}</span>
            <span className="l">{a.title}</span>
          </div>
          <div className="l">
            +{a.reward_bonus} бонусов ·{" "}
            {a.condition_type === "manual"
              ? "выдаётся вручную"
              : "выдаётся автоматически"}{" "}
            · {CONDITION_LABEL[a.condition_type] ?? a.condition_type}
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center text-text-3">
          <span className="inline-block w-5 h-5 rounded-full border-2 border-primary border-t-transparent spin" />
        </div>
      )}

      {!loading && userIds.length === 0 && (
        <div
          className="py-7 text-center text-[13px] font-semibold"
          style={{ color: "var(--ink-3)" }}
        >
          Достижение ещё никто не получил
        </div>
      )}

      {!loading && userIds.length > 0 && (
        <div className="recip-list">
          {userIds.map((id) => {
            const u = userById(id);
            const name = u?.display_name ?? id.slice(0, 8);
            return (
              <div className="recip" key={id}>
                <div className="av">{initials(name)}</div>
                <div>
                  <div className="nm">{name}</div>
                  <div className="hd">
                    {u?.telegram_username
                      ? `@${u.telegram_username}`
                      : u?.login ?? id.slice(0, 12)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

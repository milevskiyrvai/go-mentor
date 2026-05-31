import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  assignBuddy,
  unassignBuddy,
} from "@/api/users";
import type { Role, UserListItem } from "@/api/types";
import { getApiErrorCode } from "@/api/client";
import clsx from "clsx";

type RoleFilter = "all" | Role;

const ROLE_LABEL: Record<Role, string> = {
  student: "Студент",
  buddy: "Buddy",
  admin: "Админ",
};

/* ===================== PAGE ===================== */

export function UsersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);

  // Полный список (с учётом архива) — для таблицы и счётчиков табов.
  const usersQuery = useQuery({
    queryKey: ["admin", "users", { showDeleted }],
    queryFn: () => listUsers({ include_deleted: showDeleted }),
  });

  const all = usersQuery.data ?? [];

  const counts = useMemo(() => {
    const active = all.filter((u) => !u.is_deleted);
    return {
      all: active.length,
      student: active.filter((u) => u.roles.includes("student")).length,
      buddy: active.filter((u) => u.roles.includes("buddy")).length,
      admin: active.filter((u) => u.roles.includes("admin")).length,
    };
  }, [all]);

  const rows = useMemo(() => {
    return all.filter((u) => {
      if (!showDeleted && u.is_deleted) return false;
      if (filter === "all") return true;
      return u.roles.includes(filter);
    });
  }, [all, filter, showDeleted]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  return (
    <>
      {/* ===== Page head ===== */}
      <div className="page-head">
        <div>
          <h1>Пользователи</h1>
          <div className="sub">
            <b className="num">{counts.all}</b> активных аккаунтов · {counts.student} студентов ·{" "}
            {counts.buddy} Buddy · {counts.admin} админа
          </div>
        </div>
        <div className="right" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <label
            className={clsx("switch", showDeleted && "on")}
            style={{ gap: 9 }}
            onClick={() => setShowDeleted((v) => !v)}
          >
            <span className="track" />
            <span className="lab" style={{ fontSize: 13 }}>
              Показать архив
            </span>
          </label>
          <button className="btn secondary" onClick={() => setCreateOpen(true)}>
            <svg
              className="i"
              style={{ width: 16, height: 16 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Добавить
          </button>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <Tab active={filter === "all"} onClick={() => setFilter("all")} label="Все" count={counts.all} />
        <Tab
          active={filter === "student"}
          onClick={() => setFilter("student")}
          label="Студенты"
          count={counts.student}
        />
        <Tab
          active={filter === "buddy"}
          onClick={() => setFilter("buddy")}
          label="Buddy"
          count={counts.buddy}
        />
        <Tab
          active={filter === "admin"}
          onClick={() => setFilter("admin")}
          label="Админы"
          count={counts.admin}
        />
      </div>

      {/* ===== Table ===== */}
      <div className="card flat" style={{ flex: 1, padding: 0, overflow: "hidden" }}>
        <div className="usr-head usr-cols">
          <div>Пользователь</div>
          <div>Роль</div>
          <div>Поток / привязка</div>
          <div>Telegram</div>
          <div />
        </div>

        <div>
          {usersQuery.isLoading && <TableLoading />}

          {usersQuery.isError && !usersQuery.isLoading && (
            <div className="usr-empty">
              <b>Не удалось загрузить пользователей</b>
              <button className="btn ghost sm" onClick={() => usersQuery.refetch()}>
                Повторить
              </button>
            </div>
          )}

          {!usersQuery.isLoading && !usersQuery.isError && rows.length === 0 && (
            <div className="usr-empty">
              <b>Здесь пока пусто</b>
              <span>
                {filter === "all"
                  ? "Ни одного аккаунта не найдено."
                  : `Нет пользователей с ролью «${ROLE_LABEL[filter as Role]}».`}
              </span>
              <button className="btn secondary sm" onClick={() => setCreateOpen(true)}>
                Добавить пользователя
              </button>
            </div>
          )}

          {!usersQuery.isLoading &&
            !usersQuery.isError &&
            rows.map((u) => (
              <UserRow key={u.id} user={u} onEdit={() => setEditing(u)} onInvalidate={invalidate} />
            ))}
        </div>
      </div>

      {createOpen && (
        <UserDrawer
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {editing && (
        <UserDrawer
          mode="edit"
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
    </>
  );
}

/* ===================== TAB ===================== */

function Tab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button className={clsx("tab", active && "active")} type="button" onClick={onClick}>
      {label} <span className="c num">{count}</span>
    </button>
  );
}

/* ===================== ROW ===================== */

function avatarInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function avatarColor(name: string) {
  const palette = ["var(--primary)", "var(--secondary)", "var(--warning)", "var(--primary-ink)"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function RoleBadge({ role }: { role: Role }) {
  return <span className={clsx("rolebadge", role)}>{ROLE_LABEL[role]}</span>;
}

function primaryRole(roles: Role[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("buddy")) return "buddy";
  return "student";
}

function UserRow({
  user,
  onEdit,
  onInvalidate,
}: {
  user: UserListItem;
  onEdit: () => void;
  onInvalidate: () => void;
}) {
  const isStudent = user.roles.includes("student");
  const isBuddy = user.roles.includes("buddy");

  const restoreMut = useMutation({
    mutationFn: () => updateUser(user.id, { roles: user.roles }),
    onSuccess: onInvalidate,
  });

  return (
    <div className={clsx("usr-row", "usr-cols", user.is_deleted && "deleted")} data-role={primaryRole(user.roles)}>
      <div className="usr-name">
        <div
          className="avatar"
          style={{ background: user.is_deleted ? "var(--ink-3)" : avatarColor(user.display_name) }}
        >
          {avatarInitials(user.display_name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="nm">{user.display_name}</div>
          <div className="em">{user.login}</div>
        </div>
      </div>

      <div>
        <RoleBadge role={primaryRole(user.roles)} />
      </div>

      <div className="usr-link">
        {user.is_deleted ? (
          <span style={{ color: "var(--ink-3)" }}>в архиве</span>
        ) : isBuddy && !isStudent ? (
          <>
            <b>{user.students_count}</b> учеников
          </>
        ) : isStudent ? (
          user.buddy_name ? (
            <>
              Buddy <b>{user.buddy_name}</b>
            </>
          ) : (
            <span style={{ color: "var(--ink-3)" }}>Buddy не назначен</span>
          )
        ) : (
          <span style={{ color: "var(--ink-3)" }}>—</span>
        )}
      </div>

      <div className={clsx("usr-tg", !user.telegram_username && "none")}>
        {user.telegram_username ? `@${user.telegram_username.replace(/^@/, "")}` : "не задан"}
      </div>

      <div className="acts">
        {user.is_deleted ? (
          <button
            className="btn ghost sm"
            disabled={restoreMut.isPending}
            onClick={() => restoreMut.mutate()}
          >
            {restoreMut.isPending ? "..." : "Восстановить"}
          </button>
        ) : isStudent && !user.buddy_id ? (
          <button className="btn secondary sm" onClick={onEdit}>
            Назначить
          </button>
        ) : (
          <button className="btn ghost sm" onClick={onEdit}>
            Изменить
          </button>
        )}
      </div>
    </div>
  );
}

function TableLoading() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="usr-row usr-cols" key={i}>
          <div className="usr-name">
            <div className="avatar skel" style={{ background: "var(--line)" }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="skel-bar" style={{ width: "60%" }} />
              <div className="skel-bar" style={{ width: "40%", marginTop: 6, height: 9 }} />
            </div>
          </div>
          <div>
            <div className="skel-bar" style={{ width: 64, height: 18, borderRadius: 999 }} />
          </div>
          <div>
            <div className="skel-bar" style={{ width: "70%" }} />
          </div>
          <div>
            <div className="skel-bar" style={{ width: 80 }} />
          </div>
          <div className="acts">
            <div className="skel-bar" style={{ width: 70, height: 30, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </>
  );
}

/* ===================== DRAWER (create / edit) ===================== */

function genPassword() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "Gm-";
  for (let i = 0; i < 8; i++) p += c[Math.floor(Math.random() * c.length)];
  return p;
}

function UserDrawer({
  mode,
  user,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  user?: UserListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit";

  const [login, setLogin] = useState(user?.login ?? "");
  const [password, setPassword] = useState(isEdit ? "" : genPassword());
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [telegram, setTelegram] = useState(user?.telegram_username ? `@${user.telegram_username.replace(/^@/, "")}` : "");
  const [roles, setRoles] = useState<Role[]>(user?.roles ?? ["student"]);
  const [startedAt, setStartedAt] = useState(
    user?.learning_started_at ? user.learning_started_at.slice(0, 10) : ""
  );
  const [buddyId, setBuddyId] = useState(user?.buddy_id ?? "");
  const [showPwReset, setShowPwReset] = useState(false);
  const [pwResetValue, setPwResetValue] = useState("");
  const [pwResetDone, setPwResetDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStudent = roles.includes("student");

  // Список Buddy для селекта (только когда нужен — для студента).
  const buddiesQuery = useQuery({
    queryKey: ["admin", "users", { role: "buddy" }],
    queryFn: () => listUsers({ role: "buddy" }),
    enabled: isStudent,
  });
  const buddies = buddiesQuery.data ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleRole = (r: Role) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const tgClean = telegram.trim() ? telegram.trim().replace(/^@/, "") : null;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (isEdit && user) {
        await updateUser(user.id, {
          display_name: displayName.trim(),
          telegram_username: tgClean,
          learning_started_at: isStudent && startedAt ? new Date(startedAt).toISOString() : null,
          roles,
        });
        // Привязка Buddy для студента — отдельным эндпоинтом.
        if (isStudent) {
          const prev = user.buddy_id ?? "";
          if (buddyId && buddyId !== prev) await assignBuddy(user.id, buddyId);
          else if (!buddyId && prev) await unassignBuddy(user.id);
        }
      } else {
        const created = await createUser({
          login: login.trim(),
          password,
          display_name: displayName.trim(),
          telegram_username: tgClean,
          learning_started_at: isStudent && startedAt ? new Date(startedAt).toISOString() : null,
          roles,
        });
        if (isStudent && buddyId) await assignBuddy(created.id, buddyId);
      }
    },
    onSuccess: onSaved,
    onError: (err) => {
      const code = getApiErrorCode(err);
      setError(
        code === "login_taken"
          ? "Такой логин уже занят"
          : code === "telegram_taken"
          ? "Этот Telegram уже используется"
          : "Не удалось сохранить пользователя"
      );
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteUser(user!.id),
    onSuccess: onSaved,
    onError: () => setError("Не удалось перенести в архив"),
  });

  const pwResetMut = useMutation({
    mutationFn: () => resetPassword(user!.id, pwResetValue),
    onSuccess: () => setPwResetDone(true),
    onError: () => setError("Не удалось сменить пароль"),
  });

  const canSave =
    displayName.trim().length > 0 &&
    roles.length > 0 &&
    (isEdit || (login.trim().length > 0 && password.length > 0));

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>{isEdit ? "Редактирование" : "Новый пользователь"}</h3>
          <button className="modal-x" type="button" aria-label="закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* Логин */}
          <div className="field">
            <label>Логин</label>
            <input
              className="input"
              type="text"
              placeholder="например, a.petrova"
              value={login}
              disabled={isEdit}
              onChange={(e) => setLogin(e.target.value)}
            />
            {isEdit && <div className="hint">Логин нельзя изменить</div>}
          </div>

          {/* Пароль: создание — temp, редактирование — кнопка смены */}
          {!isEdit ? (
            <div className="field">
              <label>Временный пароль</label>
              <div className="pw-field">
                <input
                  className="input"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="btn ghost" type="button" onClick={() => setPassword(genPassword())}>
                  Сгенерировать
                </button>
              </div>
              <div className="hint">Ученик сменит пароль при первом входе</div>
            </div>
          ) : (
            <div className="field">
              <label>Пароль</label>
              {!showPwReset ? (
                <>
                  <button
                    className="btn ghost"
                    type="button"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      setShowPwReset(true);
                      setPwResetValue(genPassword());
                    }}
                  >
                    Сменить пароль
                  </button>
                  <div className="hint">Будет задан новый временный пароль</div>
                </>
              ) : pwResetDone ? (
                <div
                  className="hint"
                  style={{ color: "var(--success)", fontWeight: 600 }}
                >
                  Пароль изменён · передайте его пользователю вне платформы
                </div>
              ) : (
                <>
                  <div className="pw-field">
                    <input
                      className="input"
                      type="text"
                      value={pwResetValue}
                      onChange={(e) => setPwResetValue(e.target.value)}
                    />
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={!pwResetValue || pwResetMut.isPending}
                      onClick={() => pwResetMut.mutate()}
                    >
                      {pwResetMut.isPending ? "..." : "ОК"}
                    </button>
                  </div>
                  <div className="hint">Старый пароль будет аннулирован сразу</div>
                </>
              )}
            </div>
          )}

          {/* Имя */}
          <div className="field">
            <label>Отображаемое имя</label>
            <input
              className="input"
              type="text"
              placeholder="Имя Фамилия"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Telegram */}
          <div className="field">
            <label>Telegram username</label>
            <input
              className="input"
              type="text"
              placeholder="@username"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
          </div>

          {/* Роли */}
          <div className="field">
            <label>Роли</label>
            <div className="rolepick">
              {(["student", "buddy", "admin"] as Role[]).map((r) => (
                <label key={r}>
                  <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} />
                  <span className="bx">
                    <svg
                      style={{ width: 11, height: 11 }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3.5}
                    >
                      <polyline points="5 12 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="tx">{ROLE_LABEL[r]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Параметры студента */}
          {isStudent && (
            <div>
              <div className="divider" />
              <div className="divider-lbl">Параметры студента</div>
              <div className="row">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Дата начала</label>
                  <input
                    className="input"
                    type="date"
                    value={startedAt}
                    onChange={(e) => setStartedAt(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Buddy ученика</label>
                  <div className="select" style={{ display: "block" }}>
                    <select value={buddyId} onChange={(e) => setBuddyId(e.target.value)}>
                      <option value="">Не назначен</option>
                      {buddiesQuery.isLoading && <option disabled>Загрузка...</option>}
                      {buddies.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                fontSize: 12.5,
                color: "var(--danger)",
                background: "var(--danger-soft)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--r-sm)",
                padding: "9px 12px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          {isEdit && !user?.is_deleted && (
            <button
              className="del"
              type="button"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (confirm(`Перенести «${user?.display_name}» в архив? Это soft delete — пользователя можно восстановить.`)) {
                  deleteMut.mutate();
                }
              }}
            >
              {deleteMut.isPending ? "Удаление..." : "Удалить в архив"}
            </button>
          )}
          <button className="btn ghost" type="button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn secondary"
            type="button"
            disabled={!canSave || saveMut.isPending}
            onClick={() => {
              setError(null);
              saveMut.mutate();
            }}
          >
            {saveMut.isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

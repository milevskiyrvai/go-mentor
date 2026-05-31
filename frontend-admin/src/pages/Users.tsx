import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { Drawer } from "@/components/Drawer";
import { TextField } from "@/components/TextField";
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

type RoleFilter = "" | Role;

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [assigningBuddyFor, setAssigningBuddyFor] = useState<UserListItem | null>(null);
  const [resettingPwdFor, setResettingPwdFor] = useState<UserListItem | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { role: roleFilter, showDeleted, search }],
    queryFn: () =>
      listUsers({
        role: roleFilter || undefined,
        include_deleted: showDeleted,
        q: search || undefined,
      }),
  });

  // Стабильные счётчики ролей: считаются на **полном** списке (без role/search фильтров),
  // только showDeleted применяется — это согласуется с переключателем "Активные/Удалённые".
  const allUsersQuery = useQuery({
    queryKey: ["admin", "users", "counts", { showDeleted }],
    queryFn: () => listUsers({ include_deleted: showDeleted }),
  });

  const items = usersQuery.data ?? [];
  const allUsers = allUsersQuery.data ?? [];

  const allRoleCounts = useMemo(() => {
    const all = allUsers.length;
    const s = allUsers.filter((u) => u.roles.includes("student")).length;
    const b = allUsers.filter((u) => u.roles.includes("buddy")).length;
    const a = allUsers.filter((u) => u.roles.includes("admin")).length;
    return { all, s, b, a };
  }, [allUsers]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const handleDelete = (u: UserListItem) => {
    if (u.is_deleted) return;
    if (!confirm(`Soft delete пользователя «${u.display_name}»? Его можно будет видеть в фильтре "deleted".`)) {
      return;
    }
    deleteMut.mutate(u.id);
  };

  return (
    <>
      <Crumbs segments={[{ label: "GO_MENTOR", to: "/admin/dashboard" }, { label: "ADMIN", to: "/admin/dashboard" }]} liveSegment="ПОЛЬЗОВАТЕЛИ" />
      <PageHead
        eyebrow="ADMIN · USERS"
        title="Пользователи"
        description={
          <>
            <b>{items.length}</b> найдено. Поиск по имени или логину. Можно создавать,
            редактировать, менять пароль, назначать Buddy, soft-delete.
          </>
        }
        right={
          <Button variant="warn" arrow onClick={() => setCreateOpen(true)}>
            + Создать пользователя
          </Button>
        }
      />

      {/* Toolbar */}
      <div
        className="flex items-center gap-3.5 flex-wrap p-2.5 rounded-lg"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="input-base flex-1"
          style={{ height: "38px", maxWidth: "340px" }}
        >
          <span className="text-text-3">⌕</span>
          <input
            className="flex-1 bg-transparent border-0 outline-none text-text text-[13px]"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterGroup label="роль:">
          <FilterPill active={roleFilter === ""} onClick={() => setRoleFilter("")}>
            Все · {allRoleCounts.all}
          </FilterPill>
          <FilterPill active={roleFilter === "student"} onClick={() => setRoleFilter("student")}>
            Студенты · {allRoleCounts.s}
          </FilterPill>
          <FilterPill active={roleFilter === "buddy"} onClick={() => setRoleFilter("buddy")}>
            Buddy · {allRoleCounts.b}
          </FilterPill>
          <FilterPill active={roleFilter === "admin"} onClick={() => setRoleFilter("admin")}>
            Админы · {allRoleCounts.a}
          </FilterPill>
        </FilterGroup>
        <FilterGroup label="статус:">
          <FilterPill active={!showDeleted} onClick={() => setShowDeleted(false)}>
            Активные
          </FilterPill>
          <FilterPill active={showDeleted} onClick={() => setShowDeleted(true)}>
            Удалённые
          </FilterPill>
        </FilterGroup>
      </div>

      {/* Table */}
      <section
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: "13px" }}>
          <thead>
            <tr>
              <Th>Пользователь</Th>
              <Th width="140px">Роли</Th>
              <Th width="170px">Buddy</Th>
              <Th width="140px">Telegram</Th>
              <Th width="120px">Старт</Th>
              <Th width="120px">Статус</Th>
              <Th width="220px" align="right">Действия</Th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-3">
                  <span className="inline-block w-5 h-5 rounded-full border-2 border-warning border-t-transparent spin" />
                </td>
              </tr>
            )}
            {!usersQuery.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-3 font-mono uppercase text-[11px] tracking-wider">
                  Ничего не найдено
                </td>
              </tr>
            )}
            {items.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onEdit={() => setEditing(u)}
                onAssignBuddy={() => setAssigningBuddyFor(u)}
                onResetPwd={() => setResettingPwdFor(u)}
                onDelete={() => handleDelete(u)}
              />
            ))}
          </tbody>
        </table>
        <div
          className="flex items-center gap-2.5 px-4.5 py-3 font-mono uppercase tracking-wider"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
            fontSize: "11px",
            color: "var(--text-3)",
          }}
        >
          <span>
            Показано <b className="text-text-2">{items.length}</b>
          </span>
        </div>
      </section>

      {createOpen && (
        <CreateUserDrawer
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
          }}
        />
      )}

      {editing && (
        <EditUserDrawer
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
          }}
        />
      )}

      {assigningBuddyFor && (
        <AssignBuddyDrawer
          student={assigningBuddyFor}
          onClose={() => setAssigningBuddyFor(null)}
          onSaved={() => {
            setAssigningBuddyFor(null);
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
          }}
        />
      )}

      {resettingPwdFor && (
        <ResetPasswordDrawer
          user={resettingPwdFor}
          onClose={() => setResettingPwdFor(null)}
        />
      )}
    </>
  );
}

function Th({
  children,
  width,
  align,
}: {
  children: React.ReactNode;
  width?: string;
  align?: "right";
}) {
  return (
    <th
      style={{
        textAlign: align ?? "left",
        fontFamily: "var(--mono)",
        fontSize: "10px",
        color: "var(--text-3)",
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        width,
      }}
    >
      {children}
    </th>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="h-7 px-2 inline-flex items-center rounded-md font-mono uppercase tracking-wider"
        style={{
          fontSize: "10px",
          color: "var(--text-3)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-7 px-2.5 rounded-md text-[12px] cursor-pointer transition-colors",
        active ? "" : "text-text-2 hover:border-border-bright"
      )}
      style={
        active
          ? {
              color: "var(--warning)",
              border: "1px solid rgba(169,132,47,0.4)",
              background: "rgba(169,132,47,0.08)",
              boxShadow: "0 0 14px -8px var(--warning)",
            }
          : {
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }
      }
    >
      {children}
    </button>
  );
}

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function pickGradient(name: string) {
  const palettes = [
    "linear-gradient(140deg, #B26B45, #5F8268)",
    "linear-gradient(140deg, #C7B8A0, #B26B45)",
    "linear-gradient(140deg, #FF7AB3, #FFD9A8)",
    "linear-gradient(140deg, #C9A24A, #C2705A)",
    "linear-gradient(140deg, #7FA37E, #5F8268)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}

function RoleChip({ role }: { role: Role }) {
  const colors = {
    student: { c: "var(--primary)", bg: "rgba(95,130,104,0.1)", b: "rgba(95,130,104,0.35)" },
    buddy: { c: "var(--secondary)", bg: "rgba(178,107,69,0.1)", b: "rgba(178,107,69,0.35)" },
    admin: { c: "var(--warning)", bg: "rgba(169,132,47,0.1)", b: "rgba(169,132,47,0.35)" },
  } as const;
  const s = colors[role];
  return (
    <span
      className="inline-flex items-center h-[22px] px-2 rounded font-mono font-bold uppercase mr-1"
      style={{
        fontSize: "10px",
        letterSpacing: "0.08em",
        color: s.c,
        background: s.bg,
        border: `1px solid ${s.b}`,
      }}
    >
      {role}
    </span>
  );
}

function UserRow({
  user,
  onEdit,
  onAssignBuddy,
  onResetPwd,
  onDelete,
}: {
  user: UserListItem;
  onEdit: () => void;
  onAssignBuddy: () => void;
  onResetPwd: () => void;
  onDelete: () => void;
}) {
  const isStudent = user.roles.includes("student");
  return (
    <tr
      onClick={(e) => {
        // Не открывать редактирование при клике на кнопку.
        const target = e.target as HTMLElement;
        if (target.closest("button, a")) return;
        if (user.is_deleted) return;
        onEdit();
      }}
      className="hover:bg-elevated transition-colors cursor-pointer"
      style={{
        opacity: user.is_deleted ? 0.5 : 1,
        cursor: user.is_deleted ? "default" : "pointer",
      }}
    >
      <td className="px-3.5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-md grid place-items-center font-mono font-bold flex-shrink-0"
            style={{
              fontSize: "12px",
              color: "#22050f",
              background: user.is_deleted ? "#3a3d48" : pickGradient(user.display_name),
            }}
          >
            {user.is_deleted ? "??" : avatarInitials(user.display_name)}
          </div>
          <div className="flex flex-col">
            <b className="text-text text-[13px] font-semibold">{user.display_name}</b>
            <small
              className="font-mono mt-0.5"
              style={{ fontSize: "10.5px", color: "var(--text-3)", letterSpacing: "0.04em" }}
            >
              login · {user.login}
            </small>
          </div>
        </div>
      </td>
      <td className="px-3.5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {user.roles.map((r) => (
          <RoleChip key={r} role={r} />
        ))}
      </td>
      <td className="px-3.5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {isStudent ? (
          user.buddy_name ? (
            <span className="text-text text-[12.5px]">{user.buddy_name}</span>
          ) : (
            <span
              className="font-mono text-text-3"
              style={{ fontSize: "11px" }}
            >
              — нет
            </span>
          )
        ) : user.roles.includes("buddy") ? (
          <span className="font-mono text-text-3" style={{ fontSize: "11px" }}>
            {user.students_count} учеников
          </span>
        ) : (
          <span className="font-mono text-text-3" style={{ fontSize: "11px" }}>
            —
          </span>
        )}
      </td>
      <td
        className="px-3.5 py-3.5 font-mono"
        style={{
          borderBottom: "1px solid var(--border)",
          fontSize: "12px",
          color: "var(--text-2)",
        }}
      >
        {user.telegram_username ?? <span style={{ color: "var(--text-3)" }}>—</span>}
      </td>
      <td
        className="px-3.5 py-3.5 font-mono"
        style={{
          borderBottom: "1px solid var(--border)",
          fontSize: "12px",
          color: "var(--text-2)",
        }}
      >
        {user.learning_started_at
          ? new Date(user.learning_started_at).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : "—"}
      </td>
      <td className="px-3.5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {user.is_deleted ? (
          <StatusBadge kind="deleted">удалён</StatusBadge>
        ) : (
          <StatusBadge kind="active">активен</StatusBadge>
        )}
      </td>
      <td
        className="px-3.5 py-3.5 text-right"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <ActionBtn onClick={onEdit}>ред.</ActionBtn>
        {isStudent && <ActionBtn onClick={onAssignBuddy}>buddy</ActionBtn>}
        <ActionBtn onClick={onResetPwd}>пароль</ActionBtn>
        {!user.is_deleted && (
          <ActionBtn danger onClick={onDelete}>
            удал.
          </ActionBtn>
        )}
      </td>
    </tr>
  );
}

function ActionBtn({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-[26px] px-2.5 rounded-md font-mono cursor-pointer ml-1 transition-colors",
        danger
          ? "hover:text-danger hover:border-danger/40"
          : "hover:text-text hover:border-border-bright"
      )}
      style={{
        fontSize: "11px",
        letterSpacing: "0.06em",
        textTransform: "lowercase",
        color: danger ? "var(--danger)" : "var(--text-2)",
        border: "1px solid var(--border)",
        background: "transparent",
      }}
    >
      {children}
    </button>
  );
}

/* =========== CREATE DRAWER =========== */

function CreateUserDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [roles, setRoles] = useState<Role[]>(["student"]);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createUser({
        login: login.trim(),
        password,
        display_name: displayName.trim(),
        telegram_username: telegram.trim() ? telegram.trim().replace(/^@/, "") : null,
        learning_started_at: startedAt ? new Date(startedAt).toISOString() : null,
        roles,
      }),
    onSuccess: onCreated,
    onError: (err) => {
      const code = getApiErrorCode(err);
      setError(
        code === "login_taken"
          ? "Такой логин уже занят"
          : code === "telegram_taken"
          ? "Этот Telegram уже используется"
          : "Не удалось создать пользователя"
      );
    },
  });

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setPassword(p);
  };

  const toggleRole = (r: Role) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Создать пользователя"
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="warn"
            className="flex-1"
            onClick={() => mut.mutate()}
            disabled={!login || !password || !displayName || roles.length === 0 || mut.isPending}
            arrow
          >
            {mut.isPending ? "Создание..." : "Создать"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2.5">
          <TextField
            label="Логин"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="ivan_dev"
          />
          <TextField
            label="Отображаемое имя"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Иван Леонов"
          />
        </div>

        <div className="flex flex-col">
          <div
            className="font-mono uppercase tracking-[0.14em] flex items-center gap-2 mb-2"
            style={{ fontSize: "10px", color: "var(--text-2)" }}
          >
            <span>Временный пароль</span>
            <span style={{ color: "var(--warning)" }}>*</span>
          </div>
          <div className="input-base">
            <input
              className="flex-1 bg-transparent border-0 outline-none text-text text-[13.5px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="введи или сгенерируй"
              type="text"
            />
            <button
              type="button"
              onClick={genPassword}
              className="font-mono cursor-pointer px-2 py-1 rounded"
              style={{
                fontSize: "9.5px",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            >
              сгенер.
            </button>
          </div>
        </div>

        <TextField
          label="Telegram-логин"
          hint="без @ или с @"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="ivan_leo"
        />

        <div className="flex flex-col">
          <div
            className="font-mono uppercase tracking-[0.14em] mb-2"
            style={{ fontSize: "10px", color: "var(--text-2)" }}
          >
            Роли
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["student", "buddy", "admin"] as Role[]).map((r) => {
              const active = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors"
                  style={
                    active
                      ? {
                          fontSize: "12.5px",
                          color: "var(--text)",
                          border: "1px solid rgba(169,132,47,0.45)",
                          background: "rgba(169,132,47,0.08)",
                          boxShadow: "0 0 14px -8px var(--warning)",
                        }
                      : {
                          fontSize: "12.5px",
                          color: "var(--text-2)",
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                        }
                  }
                >
                  <span
                    className="w-4 h-4 rounded grid place-items-center font-mono font-bold"
                    style={
                      active
                        ? {
                            fontSize: "10px",
                            background: "var(--warning)",
                            color: "#1e1700",
                            border: "1px solid var(--warning)",
                          }
                        : {
                            fontSize: "10px",
                            border: "1px solid var(--border-bright)",
                            background: "var(--surface)",
                          }
                    }
                  >
                    {active ? "✓" : ""}
                  </span>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {roles.includes("student") && (
          <TextField
            label="Дата начала обучения"
            hint="для Student"
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        )}

        {error && (
          <div
            className="text-[12px] px-3 py-2 rounded-md"
            style={{
              color: "var(--danger)",
              background: "rgba(175,88,64,0.08)",
              border: "1px solid rgba(175,88,64,0.3)",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* =========== EDIT DRAWER =========== */

function EditUserDrawer({
  user,
  onClose,
  onSaved,
}: {
  user: UserListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [telegram, setTelegram] = useState(user.telegram_username ?? "");
  const [startedAt, setStartedAt] = useState(
    user.learning_started_at ? user.learning_started_at.slice(0, 10) : ""
  );
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      updateUser(user.id, {
        display_name: displayName.trim(),
        telegram_username: telegram.trim() ? telegram.trim().replace(/^@/, "") : null,
        learning_started_at: startedAt ? new Date(startedAt).toISOString() : null,
        roles,
      }),
    onSuccess: onSaved,
    onError: (err) => {
      const code = getApiErrorCode(err);
      setError(
        code === "telegram_taken" ? "Этот Telegram уже используется" : "Не удалось сохранить"
      );
    },
  });

  const toggleRole = (r: Role) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Редактирование · ${user.display_name}`}
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="warn"
            className="flex-1"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || roles.length === 0}
          >
            {mut.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className="px-3 py-2 rounded-md font-mono"
          style={{
            fontSize: "11px",
            color: "var(--text-3)",
            background: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          login · {user.login} · {user.id}
        </div>

        <TextField
          label="Отображаемое имя"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <TextField
          label="Telegram-логин"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
        />

        <div className="flex flex-col">
          <div
            className="font-mono uppercase tracking-[0.14em] mb-2"
            style={{ fontSize: "10px", color: "var(--text-2)" }}
          >
            Роли
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["student", "buddy", "admin"] as Role[]).map((r) => {
              const active = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-[12.5px]"
                  style={
                    active
                      ? {
                          color: "var(--text)",
                          border: "1px solid rgba(169,132,47,0.45)",
                          background: "rgba(169,132,47,0.08)",
                        }
                      : {
                          color: "var(--text-2)",
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                        }
                  }
                >
                  <span
                    className="w-4 h-4 rounded grid place-items-center font-mono font-bold"
                    style={
                      active
                        ? {
                            fontSize: "10px",
                            background: "var(--warning)",
                            color: "#1e1700",
                            border: "1px solid var(--warning)",
                          }
                        : {
                            fontSize: "10px",
                            border: "1px solid var(--border-bright)",
                            background: "var(--surface)",
                          }
                    }
                  >
                    {active ? "✓" : ""}
                  </span>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {roles.includes("student") && (
          <TextField
            label="Дата начала обучения"
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        )}

        {error && (
          <div
            className="text-[12px] px-3 py-2 rounded-md"
            style={{
              color: "var(--danger)",
              background: "rgba(175,88,64,0.08)",
              border: "1px solid rgba(175,88,64,0.3)",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* =========== ASSIGN BUDDY DRAWER =========== */

function AssignBuddyDrawer({
  student,
  onClose,
  onSaved,
}: {
  student: UserListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const buddies = useQuery({
    queryKey: ["admin", "users", { role: "buddy" }],
    queryFn: () => listUsers({ role: "buddy" }),
  });

  const [selected, setSelected] = useState<string>(student.buddy_id ?? "");

  const assignMut = useMutation({
    mutationFn: () => assignBuddy(student.id, selected),
    onSuccess: onSaved,
  });

  const unassignMut = useMutation({
    mutationFn: () => unassignBuddy(student.id),
    onSuccess: onSaved,
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Buddy для · ${student.display_name}`}
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="warn"
            className="flex-1"
            onClick={() => assignMut.mutate()}
            disabled={!selected || assignMut.isPending}
          >
            {assignMut.isPending ? "Назначаю..." : "Назначить Buddy"}
          </Button>
          {student.buddy_id && (
            <Button
              variant="danger-ghost"
              onClick={() => unassignMut.mutate()}
              disabled={unassignMut.isPending}
            >
              Снять
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="caption">Выбери Buddy</div>
        {buddies.isLoading && (
          <div className="text-text-3 text-[12px]">Загрузка...</div>
        )}
        <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-auto">
          {(buddies.data ?? []).map((b) => (
            <label
              key={b.id}
              className="flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors"
              style={
                selected === b.id
                  ? {
                      border: "1px solid rgba(169,132,47,0.4)",
                      background: "rgba(169,132,47,0.08)",
                    }
                  : { border: "1px solid var(--border)", background: "var(--bg)" }
              }
            >
              <input
                type="radio"
                name="buddy"
                checked={selected === b.id}
                onChange={() => setSelected(b.id)}
                className="accent-warning"
              />
              <div
                className="w-8 h-8 rounded-md grid place-items-center font-mono font-bold"
                style={{
                  fontSize: "11px",
                  color: "#22050f",
                  background: pickGradient(b.display_name),
                }}
              >
                {avatarInitials(b.display_name)}
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-[13px] font-semibold">{b.display_name}</span>
                <span className="font-mono text-[10.5px] text-text-3">
                  @{b.login} · {b.students_count} учеников
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

/* =========== RESET PASSWORD DRAWER =========== */

function ResetPasswordDrawer({
  user,
  onClose,
}: {
  user: UserListItem;
  onClose: () => void;
}) {
  const [newPwd, setNewPwd] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => resetPassword(user.id, newPwd),
    onSuccess: () => setDone(true),
    onError: () => setError("Не удалось сменить пароль"),
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Сменить пароль · ${user.display_name}`}
      footer={
        done ? (
          <Button variant="warn" className="w-full" onClick={onClose}>
            Готово
          </Button>
        ) : (
          <div className="flex gap-2.5">
            <Button
              variant="warn"
              className="flex-1"
              onClick={() => mut.mutate()}
              disabled={!newPwd || mut.isPending}
            >
              {mut.isPending ? "Сменяю..." : "Сменить пароль"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
          </div>
        )
      }
    >
      {!done ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] m-0" style={{ color: "var(--text-2)" }}>
            Введи новый пароль для пользователя. Старый пароль будет аннулирован сразу.
          </p>
          <TextField
            label="Новый пароль"
            required
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="минимум 8 символов"
            type="text"
          />
          {error && (
            <div
              className="text-[12px] px-3 py-2 rounded-md"
              style={{
                color: "var(--danger)",
                background: "rgba(175,88,64,0.08)",
                border: "1px solid rgba(175,88,64,0.3)",
              }}
            >
              {error}
            </div>
          )}
        </div>
      ) : (
        <div
          className="px-4 py-4 rounded-md flex flex-col gap-2"
          style={{
            background: "rgba(95,130,104,0.08)",
            border: "1px solid rgba(95,130,104,0.3)",
            color: "var(--success)",
          }}
        >
          <b className="text-[14px]">Пароль изменён</b>
          <span className="font-mono text-[12px] text-text">
            Передай новый пароль пользователю вне платформы.
          </span>
        </div>
      )}
    </Drawer>
  );
}

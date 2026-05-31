import { NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "@/stores/auth";
import { logout, selectRole } from "@/api/auth";
import type { Role } from "@/api/types";
import { Logo } from "./Logo";
import { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const STUDENT_NAV: NavItem[] = [
  { to: "/student/dashboard", label: "Мой прогресс", icon: "▸" },
  { to: "/student/roadmap", label: "Roadmap", icon: "≣" },
  { to: "/student/achievements", label: "Достижения", icon: "✦" },
  { to: "/student/bonuses", label: "Бонусы", icon: "$" },
  { to: "/student/interviews", label: "Собеседования", icon: "◌" },
  { to: "/student/calendar", label: "Календарь", icon: "▥" },
  { to: "/student/profile", label: "Профиль", icon: "○" },
];

const BUDDY_NAV: NavItem[] = [
  { to: "/buddy/students", label: "Мои ученики", icon: "◐" },
  { to: "/buddy/calendar", label: "Календарь", icon: "▥" },
  { to: "/buddy/interviews", label: "Mock-собеседования", icon: "◌" },
  { to: "/buddy/profile", label: "Профиль", icon: "○" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user, roles, selectedRole, reset } = useAuth();
  const [switching, setSwitching] = useState(false);

  const navItems = selectedRole === "buddy" ? BUDDY_NAV : STUDENT_NAV;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      reset();
      navigate("/login", { replace: true });
    }
  };

  const handleSwitchRole = async (role: Role) => {
    if (role === selectedRole || switching) return;
    setSwitching(true);
    try {
      await selectRole(role);
      // hard reload — JWT обновился в куке
      window.location.href = role === "buddy" ? "/buddy/students" : "/student/dashboard";
    } finally {
      setSwitching(false);
    }
  };

  const roleColors: Record<Role, string> = {
    student: "var(--primary)",
    buddy: "var(--secondary)",
    admin: "var(--warning)",
  };

  const roleLabels: Record<Role, string> = {
    student: "Студент",
    buddy: "Buddy",
    admin: "Админ",
  };

  return (
    <aside className="sidebar fixed inset-y-0 left-0 w-[260px] z-30 px-[18px] py-6">
      <div className="brand px-2 pb-[18px]">
        <Logo size={34} />
        <div className="brand-name">
          Go Mentor
          <small>Платформа менторства</small>
        </div>
      </div>

      {/* User card */}
      <div className="sb-user mb-3">
        <Avatar
          name={user?.display_name ?? ""}
          url={user?.avatar_url}
          role={selectedRole}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold truncate leading-tight">
            {user?.display_name}
          </div>
          <div className="text-[11px] text-text-2 mt-0.5 flex items-center gap-1.5">
            <span className="role-dot" style={{ background: roleColors[selectedRole ?? "student"] }} />
            {selectedRole ? roleLabels[selectedRole] : ""}
          </div>
        </div>
      </div>

      <div className="sb-label">Навигация</div>
      <nav className="flex-1 space-y-1 overflow-y-auto -mx-0">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx("nav-item", isActive && "active")}
          >
            <span className="ic">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Role switcher */}
      {roles.filter((r) => r !== "admin").length > 1 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="sb-label !pt-0 !px-1">Режим</div>
          <div className="grid grid-cols-2 gap-2 px-0">
            {roles
              .filter((r) => r !== "admin")
              .map((r) => (
                <button
                  key={r}
                  onClick={() => handleSwitchRole(r)}
                  disabled={switching}
                  className={clsx(
                    "btn btn-sm justify-center",
                    r === selectedRole && "primary",
                  )}
                >
                  <span
                    className="role-dot"
                    style={{ background: r === selectedRole ? "currentColor" : roleColors[r] }}
                  />
                  <span>{roleLabels[r]}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="sb-foot mt-3">
        <span className="led" />
        <span>В сети</span>
        <button
          onClick={handleLogout}
          title="Выйти"
          className="ml-auto text-text-3 hover:text-danger transition-colors font-medium"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}

interface AvatarProps {
  name: string;
  url?: string;
  role?: Role | null;
  size?: number;
  className?: string;
}

// Детерминированная палитра по имени (без неона) — шалфей / терракота / амбра
const AVATAR_TONES = ["#5F8268", "#B26B45", "#A9842F", "#456450"];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({ name, url, role, size = 36, className }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  // роль приоритетнее, иначе — детерминированно по имени
  const bg =
    role === "buddy"
      ? "var(--secondary)"
      : role === "admin"
        ? "var(--warning)"
        : role === "student"
          ? "var(--primary)"
          : avatarColor(name);

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={clsx("avatar object-cover border border-border", className)}
        style={{ width: size, height: size, flex: `0 0 ${size}px` }}
      />
    );
  }
  return (
    <div
      className={clsx("avatar", className)}
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        background: bg,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials || "?"}
    </div>
  );
}

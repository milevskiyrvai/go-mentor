import { NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuthStore } from "@/stores/auth";
import * as authApi from "@/api/auth";

type NavItem = {
  path: string;
  label: string;
  iconChar: string;
};

const items: NavItem[] = [
  { path: "/admin/dashboard", label: "Дашборд", iconChar: "D" },
  { path: "/admin/users", label: "Пользователи", iconChar: "U" },
  { path: "/admin/roadmap", label: "Roadmap", iconChar: "R" },
  { path: "/admin/achievements", label: "Достижения", iconChar: "A" },
  { path: "/admin/one-on-one", label: "Заявки 1×1", iconChar: "1" },
  { path: "/admin/analytics", label: "Аналитика", iconChar: "↗" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user, roles, clear } = useAuthStore();

  const initials = (user?.display_name ?? "AD")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const canSwitchBuddy = roles.includes("buddy");

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clear();
    navigate("/login", { replace: true });
  };

  const handleSwitchToBuddy = async () => {
    try {
      await authApi.selectRole("buddy");
    } catch {
      /* ignore */
    }
    // env.VITE_APP_URL → fallback на текущий хост, заменив "admin." на "app." (или localhost:5173 в dev).
    const envUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_APP_URL;
    if (envUrl) {
      window.location.href = envUrl;
      return;
    }
    const host = window.location.hostname;
    if (host.startsWith("admin.")) {
      window.location.href = `${window.location.protocol}//app.${host.slice(6)}/`;
    } else {
      window.location.href = "http://localhost:5173/";
    }
  };

  return (
    <aside
      className="sidebar w-full rounded-lg p-[14px] flex flex-col gap-1 sticky top-6"
      style={{ alignSelf: "start", maxHeight: "calc(100vh - 48px)", overflow: "auto" }}
    >
      {/* User block */}
      <div className="sb-user mb-1.5">
        <div
          className="avatar w-[38px] h-[38px] flex-shrink-0"
          style={{ background: "var(--warning)" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-tight truncate">
            {user?.display_name ?? "Admin"}
          </div>
          <div className="flex items-center gap-1.5 mt-1 rolebadge admin" style={{ background: "transparent", color: "var(--warning)", padding: 0 }}>
            <span className="role-dot" style={{ background: "var(--warning)" }} />
            Admin
          </div>
        </div>
      </div>

      <div className="sb-label">Admin</div>

      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => clsx("nav-item nav-admin", isActive && "active")}
        >
          <span className="ic">{item.iconChar}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}

      {canSwitchBuddy && (
        <>
          <div className="sb-label">Режим</div>
          <button
            type="button"
            onClick={handleSwitchToBuddy}
            className="nav-item text-left"
          >
            <span className="ic">←</span>
            <span>В Buddy-режим</span>
          </button>
        </>
      )}

      <button type="button" onClick={handleLogout} className="nav-item text-left mt-1">
        <span className="ic">⎋</span>
        <span>Выход</span>
      </button>

      <div className="sb-foot mt-auto">
        <span className="led" />
        <span>v0.1 · ADMIN CONSOLE</span>
      </div>
    </aside>
  );
}

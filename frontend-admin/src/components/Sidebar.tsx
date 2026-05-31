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
      className="role-a w-full bg-surface border border-border rounded-lg p-[14px] flex flex-col gap-1 sticky top-6"
      style={{ alignSelf: "start", maxHeight: "calc(100vh - 48px)", overflow: "auto" }}
    >
      {/* User block with warning border */}
      <div
        className="flex items-center gap-3 p-3 rounded-md bg-bg mb-1.5"
        style={{
          border: "1px solid rgba(169,132,47,0.22)",
          boxShadow: "inset 0 0 0 1px rgba(169,132,47,0.06)",
        }}
      >
        <div
          className="w-[38px] h-[38px] rounded-[9px] grid place-items-center font-mono font-bold text-[13px] flex-shrink-0"
          style={{
            background: "linear-gradient(140deg, #C9A24A 0%, #C2705A 100%)",
            color: "#1e1700",
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-tight truncate">
            {user?.display_name ?? "Admin"}
          </div>
          <div
            className="flex items-center gap-1.5 mt-1 font-mono uppercase font-semibold tracking-[0.12em]"
            style={{ fontSize: "10px", color: "var(--warning)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "currentColor", boxShadow: "0 0 8px currentColor" }}
            />
            Admin
          </div>
        </div>
      </div>

      <div className="caption px-3 pt-3.5 pb-1.5">Admin</div>

      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] cursor-pointer relative transition-colors",
              isActive
                ? "text-text bg-elevated active-warn"
                : "text-text-2 hover:bg-elevated hover:text-text"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className="absolute -left-[14px] top-2 bottom-2 w-[3px] rounded-[2px]"
                  style={{
                    background: "var(--warning)",
                    boxShadow: "0 0 14px var(--warning)",
                  }}
                />
              )}
              <div
                className={clsx(
                  "w-5 h-5 rounded-md grid place-items-center font-mono text-[10px] font-bold flex-shrink-0",
                  isActive ? "" : "text-text-3"
                )}
                style={
                  isActive
                    ? {
                        color: "var(--warning)",
                        border: "1px solid rgba(169,132,47,0.6)",
                        background: "rgba(169,132,47,0.1)",
                        boxShadow: "0 0 14px rgba(169,132,47,0.25)",
                      }
                    : { border: "1px solid var(--border-bright)" }
                }
              >
                {item.iconChar}
              </div>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}

      {canSwitchBuddy && (
        <>
          <div className="caption px-3 pt-3.5 pb-1.5">Режим</div>
          <button
            type="button"
            onClick={handleSwitchToBuddy}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-text-2 hover:bg-elevated hover:text-text transition-colors text-left"
          >
            <div
              className="w-5 h-5 rounded-md grid place-items-center font-mono text-[10px] font-bold flex-shrink-0 text-text-3"
              style={{ border: "1px solid var(--border-bright)" }}
            >
              ←
            </div>
            <span>В Buddy-режим</span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-text-2 hover:bg-elevated hover:text-text transition-colors text-left mt-1"
      >
        <div
          className="w-5 h-5 rounded-md grid place-items-center font-mono text-[10px] font-bold flex-shrink-0 text-text-3"
          style={{ border: "1px solid var(--border-bright)" }}
        >
          ⎋
        </div>
        <span>Выход</span>
      </button>

      <div
        className="mt-auto pt-3.5 flex items-center gap-2 caption"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--success)", boxShadow: "0 0 10px var(--success)" }}
        />
        <span>v0.1 · ADMIN CONSOLE</span>
      </div>
    </aside>
  );
}

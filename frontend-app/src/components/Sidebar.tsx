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

  return (
    <aside
      className="fixed inset-y-0 left-0 w-[260px] border-r border-border bg-surface flex flex-col z-30"
      style={{ background: "var(--surface)" }}
    >
      <div className="px-6 py-6 border-b border-border flex items-center gap-3">
        <Logo size={36} />
        <div className="flex flex-col leading-tight">
          <span className="font-bold tracking-tight">Go Mentor</span>
          <span className="caption mt-1">Платформа менторства</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-[14px] transition-all",
                isActive
                  ? "bg-elevated text-text border border-border-bright shadow-[inset_0_0_0_1px_rgba(212,255,61,0.12)]"
                  : "text-text-2 hover:text-text hover:bg-elevated/60",
              )
            }
          >
            <span className="font-mono text-primary opacity-70 w-4 text-center">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Role switcher */}
      {roles.length > 1 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="caption mb-2">Режим</div>
          <div className="grid grid-cols-2 gap-2">
            {roles
              .filter((r) => r !== "admin") // admin живёт в отдельной панели
              .map((r) => (
                <button
                  key={r}
                  onClick={() => handleSwitchRole(r)}
                  disabled={switching}
                  className={clsx(
                    "btn btn-sm flex items-center justify-center gap-2",
                    r === selectedRole && "border-border-bright bg-elevated",
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: roleColors[r],
                      boxShadow: r === selectedRole ? `0 0 8px ${roleColors[r]}` : "none",
                    }}
                  />
                  <span className="text-[12px] capitalize">{r}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* User card */}
      <div className="px-4 py-4 border-t border-border flex items-center gap-3">
        <Avatar
          name={user?.display_name ?? ""}
          url={user?.avatar_url}
          role={selectedRole}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate">{user?.display_name}</div>
          <div className="text-[11px] text-text-3 truncate capitalize">{selectedRole}</div>
        </div>
        <button
          onClick={handleLogout}
          title="Выйти"
          className="text-text-3 hover:text-danger transition-colors p-2"
        >
          ⎋
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

export function Avatar({ name, url, role, size = 36, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  const grad =
    role === "buddy"
      ? "linear-gradient(135deg, #ff3d9a, #c026d3)"
      : role === "admin"
        ? "linear-gradient(135deg, #ffdb3d, #ff9100)"
        : "linear-gradient(135deg, #d4ff3d, #7be38c)";

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={clsx("rounded-[8px] object-cover border border-border", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={clsx(
        "rounded-[8px] grid place-items-center font-mono font-bold text-[12px] border border-border",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: grad,
        color: "#000",
      }}
    >
      {initials || "?"}
    </div>
  );
}

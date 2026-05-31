import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { selectRole } from "@/api/auth";
import { useAuth } from "@/stores/auth";
import type { Role } from "@/api/types";
import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/Spinner";
import clsx from "clsx";

const ROLE_META: Record<Role, { title: string; description: string; gradient: string; emoji: string }> = {
  student: {
    title: "Student",
    description: "Учиться по roadmap, копить бонусы и достижения",
    gradient: "linear-gradient(135deg, #d4ff3d, #7be38c)",
    emoji: "▸",
  },
  buddy: {
    title: "Buddy",
    description: "Сопровождать учеников, подтверждать блоки",
    gradient: "linear-gradient(135deg, #ff3d9a, #c026d3)",
    emoji: "◐",
  },
  admin: {
    title: "Admin",
    description: "Управление платформой (открывается в отдельной панели)",
    gradient: "linear-gradient(135deg, #ffdb3d, #ff9100)",
    emoji: "✪",
  },
};

export function RolePickerPage() {
  const { roles, set } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (role: Role) => {
    if (submitting) return;
    if (role === "admin") {
      setError(
        "Admin-панель открывается на отдельном домене (frontend-admin). Для Buddy/Student продолжите здесь.",
      );
      return;
    }
    setSubmitting(role);
    try {
      await selectRole(role);
      set({ selectedRole: role });
      navigate(role === "buddy" ? "/buddy/students" : "/student/dashboard", { replace: true });
    } catch {
      setError("Не удалось выбрать роль");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6 py-10">
      <div className="w-full max-w-[920px]">
        <div className="flex flex-col items-center gap-4 mb-10">
          <Logo size={56} />
          <div className="caption">Выбор роли</div>
          <h1 className="text-[36px] font-bold -tracking-[0.02em] text-center">
            С какой роли начнём?
          </h1>
          <p className="text-text-2 text-center max-w-xl">
            Вы можете переключаться между ролями в любой момент через боковую панель.
          </p>
        </div>

        <div className={clsx("grid gap-5", roles.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
          {roles.map((r) => {
            const meta = ROLE_META[r];
            return (
              <button
                key={r}
                onClick={() => pick(r)}
                disabled={submitting !== null}
                className="card text-left p-6 hover:border-border-bright transition-all relative overflow-hidden group"
                style={{ minHeight: 260 }}
              >
                <div
                  className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 30% 0%, color-mix(in oklab, ${
                      r === "buddy" ? "var(--secondary)" : r === "admin" ? "var(--warning)" : "var(--primary)"
                    } 18%, transparent), transparent 60%)`,
                  }}
                />
                <div className="relative flex flex-col h-full">
                  <div
                    className="w-14 h-14 rounded-[12px] grid place-items-center mb-5 text-[28px]"
                    style={{
                      background: meta.gradient,
                      color: "#000",
                      boxShadow: `0 12px 30px -10px ${
                        r === "buddy" ? "rgba(255,61,154,0.55)" : "rgba(212,255,61,0.55)"
                      }`,
                    }}
                  >
                    {meta.emoji}
                  </div>
                  <h3 className="text-[22px] font-bold tracking-tight">{meta.title}</h3>
                  <p className="text-text-2 mt-2 text-[14px] leading-snug flex-1">
                    {meta.description}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-primary text-[13px] font-mono">
                    {submitting === r ? <Spinner size={14} /> : "Войти →"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 text-[13px] px-4 py-3 rounded-md border border-warning/40 bg-warning/10 text-warning text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

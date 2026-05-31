import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { getApiErrorCode } from "@/api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged-in as admin, redirect to dashboard
  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((me) => {
        if (!active) return;
        if (me.selected_role === "admin") {
          setSession(me.user, me.roles, "admin");
          setHydrated(true);
          navigate("/admin/dashboard", { replace: true });
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      active = false;
    };
  }, [navigate, setSession, setHydrated]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(login, password);
      if (!res.roles.includes("admin")) {
        setError("У этого пользователя нет роли Admin.");
        setLoading(false);
        return;
      }
      await authApi.selectRole("admin");
      const meRes = await authApi.me();
      setSession(meRes.user, meRes.roles, "admin");
      setHydrated(true);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      const code = getApiErrorCode(err);
      setError(
        code === "invalid_credentials"
          ? "Неверный логин или пароль"
          : code === "role_not_available"
          ? "У пользователя нет роли Admin"
          : "Ошибка входа. Попробуй ещё раз."
      );
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(700px 500px at 8% 6%, rgba(169,132,47,0.08), transparent 65%),
            radial-gradient(700px 500px at 92% 96%, rgba(175,88,64,0.06), transparent 65%)
          `,
        }}
      />
      <div className="relative z-10 min-h-screen grid lg:grid-cols-[420px_1fr]">
        {/* LEFT: form */}
        <div
          className="p-10 flex flex-col gap-5 bg-surface relative"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-[42px] h-[42px] rounded-[10px] grid place-items-center relative"
              style={{
                background: "linear-gradient(140deg, rgba(169,132,47,0.14), var(--bg))",
                border: "1px solid var(--border)",
                boxShadow:
                  "inset 0 0 0 1px rgba(169,132,47,0.22), 0 0 22px -8px var(--warning)",
              }}
            >
              <span
                className="font-mono font-bold"
                style={{ color: "var(--warning)", fontSize: "18px", letterSpacing: "-0.02em" }}
              >
                Go
              </span>
            </div>
            <div className="flex flex-col leading-none">
              <b className="font-bold text-[15px] tracking-tight">Go Mentor</b>
              <small
                className="mt-1.5 font-semibold uppercase tracking-[0.18em]"
                style={{ fontSize: "10px", color: "var(--warning)" }}
              >
                ADMIN · CONSOLE
              </small>
            </div>
          </div>

          {/* HERO */}
          <div className="py-5 flex flex-col gap-2">
            <div
              className="flex items-center gap-2.5 font-mono uppercase tracking-[0.2em]"
              style={{ fontSize: "10px", color: "var(--text-3)" }}
            >
              <span className="flex-shrink-0 w-[18px] h-px bg-text-3" />
              <span>ADMIN MODE · WARNING ACCENT</span>
              <span className="flex-shrink-0 w-[18px] h-px bg-text-3" />
            </div>
            <div
              className="font-extrabold text-text leading-none"
              style={{ fontSize: "56px", letterSpacing: "-0.05em" }}
            >
              ADMIN<span style={{ color: "var(--text-3)", fontWeight: 500 }}>/</span>
            </div>
            <div
              className="font-extrabold leading-none"
              style={{
                fontSize: "56px",
                letterSpacing: "-0.05em",
                color: "var(--warning)",
                textShadow:
                  "0 0 26px rgba(169,132,47,0.55), 0 0 4px rgba(169,132,47,0.6)",
                marginLeft: "12px",
              }}
            >
              CONSOLE
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span
                className="font-mono uppercase tracking-[0.16em] px-2.5 py-1.5 rounded-full"
                style={{
                  fontSize: "10px",
                  color: "var(--warning)",
                  border: "1px solid rgba(169,132,47,0.4)",
                  background: "var(--bg)",
                  boxShadow: "0 0 14px rgba(169,132,47,0.2)",
                }}
              >
                ELEVATED PRIVILEGES
              </span>
              <span
                className="font-mono uppercase tracking-[0.16em] px-2.5 py-1.5 rounded-full"
                style={{
                  fontSize: "10px",
                  color: "var(--text-2)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                LOGIN + PASSWORD
              </span>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={onSubmit} className="flex flex-col gap-2.5 mt-auto">
            <div
              className="flex items-center gap-2 font-mono uppercase tracking-[0.18em]"
              style={{ fontSize: "10px", color: "var(--warning)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--warning)", boxShadow: "0 0 8px var(--warning)" }}
              />
              <span>AUTH · ADMIN</span>
            </div>
            <h2 className="m-0 text-[24px] font-bold tracking-tight">Вход в Admin</h2>
            <p className="mt-1 mb-4 text-[13px] leading-[1.55]" style={{ color: "var(--text-2)" }}>
              Доступ закрыт. Только пользователи с ролью Admin.
            </p>

            <div className="flex flex-col">
              <div
                className="font-mono uppercase tracking-[0.14em] flex items-center gap-2 mb-2"
                style={{ fontSize: "10px", color: "var(--text-2)" }}
              >
                <span>Логин</span>
                <span style={{ color: "var(--warning)" }}>*</span>
              </div>
              <div className="input-base" style={{ height: "46px" }}>
                <span className="text-text-3">@</span>
                <input
                  className="flex-1 bg-transparent border-0 outline-none text-text text-[13.5px]"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col">
              <div
                className="font-mono uppercase tracking-[0.14em] flex items-center gap-2 mb-2"
                style={{ fontSize: "10px", color: "var(--text-2)" }}
              >
                <span>Пароль</span>
                <span style={{ color: "var(--warning)" }}>*</span>
              </div>
              <div className="input-base" style={{ height: "46px" }}>
                <span className="text-text-3">⚿</span>
                <input
                  className="flex-1 bg-transparent border-0 outline-none text-text text-[13.5px]"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

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

            <button
              type="submit"
              disabled={loading}
              className="btn-base btn-warn mt-2"
              style={{ height: "46px", fontSize: "14px" }}
            >
              <span>{loading ? "Вход..." : "Войти в Admin"}</span>
              {!loading && (
                <span className="font-mono font-bold" aria-hidden>
                  →
                </span>
              )}
            </button>

            <div
              className="font-mono uppercase tracking-[0.14em] text-center mt-2"
              style={{ fontSize: "10px", color: "var(--text-3)" }}
            >
              SESSION TTL · 24h
            </div>
          </form>
        </div>

        {/* RIGHT: hero pane */}
        <div className="hidden lg:flex flex-col p-10 justify-center gap-6">
          <div
            className="font-mono uppercase tracking-[0.18em] flex items-center gap-2.5"
            style={{ fontSize: "11px", color: "var(--warning)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--warning)", boxShadow: "0 0 8px var(--warning)" }}
            />
            <span>ADMIN · DASHBOARD AWAITS</span>
          </div>
          <h1
            className="m-0 font-bold leading-tight"
            style={{ fontSize: "44px", letterSpacing: "-0.02em" }}
          >
            Управляй{" "}
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(90deg, var(--warning), var(--danger))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              платформой
            </em>
            <br />
            наставничества.
          </h1>
          <p className="m-0 text-[15px] leading-[1.65] max-w-[60ch]" style={{ color: "var(--text-2)" }}>
            Создавай пользователей, управляй roadmap, обрабатывай 1×1, выдавай и кастомизируй
            достижения. Всё в одной консоли.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-4 max-w-[480px]">
            {[
              ["247", "пользователей"],
              ["5", "блоков roadmap"],
              ["14", "достижений"],
              ["8", "заявок 1×1"],
              ["198", "студентов"],
              ["32", "buddy"],
            ].map(([v, l]) => (
              <div
                key={l}
                className="card-base p-3 flex flex-col gap-1"
                style={{ background: "var(--surface)" }}
              >
                <span
                  className="font-mono font-bold text-text"
                  style={{ fontSize: "20px", letterSpacing: "-0.02em" }}
                >
                  {v}
                </span>
                <span
                  className="font-mono uppercase tracking-[0.12em]"
                  style={{ fontSize: "9.5px", color: "var(--text-3)" }}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

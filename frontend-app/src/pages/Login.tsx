import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, me } from "@/api/auth";
import { useAuth } from "@/stores/auth";
import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/Spinner";
import { extractError } from "@/api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const { set } = useAuth();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(loginName.trim(), password);
      const meRes = await me();
      set({
        user: meRes.user,
        roles: meRes.roles,
        selectedRole: (meRes.selected_role || null) as any,
        loaded: true,
      });
      // auto-redirect by role
      if (res.roles.length === 1) {
        const only = res.roles[0];
        if (only === "buddy") navigate("/buddy/students", { replace: true });
        else if (only === "admin") {
          // admin живёт в отдельной панели; для DX перекинем на /pick-role
          navigate("/pick-role", { replace: true });
        } else navigate("/student/dashboard", { replace: true });
      } else {
        navigate("/pick-role", { replace: true });
      }
    } catch (err) {
      const e = extractError(err);
      setError(
        e.code === "invalid_credentials"
          ? "Неверный логин или пароль"
          : "Не удалось войти. Проверьте сервер.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div
        className="card relative overflow-hidden w-full max-w-[440px] p-10"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 5%, var(--surface)), var(--surface))",
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(closest-side, rgba(212,255,61,0.18), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,61,154,0.16), transparent 70%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-4 mb-8">
          <Logo size={56} />
          <div className="text-center">
            <div className="caption mb-2">Go Mentor</div>
            <h1 className="text-[28px] font-bold -tracking-[0.02em] leading-tight">
              Платформа менторства
            </h1>
            <p className="text-text-2 text-[13px] mt-2 leading-snug">
              Войдите с выданными администратором логином и паролем
            </p>
          </div>
        </div>

        <form onSubmit={handle} className="relative space-y-3.5">
          <div>
            <label className="caption mb-1.5 block">Логин</label>
            <input
              className="input"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              autoFocus
              required
              placeholder="student.alice"
            />
          </div>
          <div>
            <label className="caption mb-1.5 block">Пароль</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="text-[13px] px-3 py-2 rounded-md border border-danger/40 bg-danger/10 text-danger">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary w-full !h-12 font-semibold !text-[15px]"
            disabled={loading}
          >
            {loading ? <Spinner size={18} /> : "Войти"}
          </button>
          <p className="caption text-center mt-4 text-text-3">
            Забыли пароль? Обратитесь к администратору.
          </p>
        </form>
      </div>
    </div>
  );
}

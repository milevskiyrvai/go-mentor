import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, me } from "@/api/auth";
import { useAuth } from "@/stores/auth";
import { extractError } from "@/api/client";
import { Spinner } from "@/components/Spinner";
import type { Role } from "@/api/types";

/**
 * Login + выбор роли.
 * Верстка повторяет design-output/screens/login.html (auth-stage → .auth
 * двухколоночная карта: бренд-панель слева, форма справа).
 *
 * Поток (рабочий API — переиспользуем как есть):
 *   login(login, pass) → me() → сохраняем в auth-стор →
 *     1 роль  → сразу в раздел роли
 *     >1 роли → /pick-role (RolePicker владеет шагом «Выбор роли»)
 *
 * ВАЖНО (ТЗ §5.5): здесь нет никаких бонусов/баланса/истории ученика —
 * это публичный экран входа, никаких приватных данных не показываем.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { set } = useAuth();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeForRole = (role: Role) =>
    role === "buddy"
      ? "/buddy/students"
      : role === "admin"
        ? "/pick-role" // admin живёт в отдельной панели — отправляем к picker'у
        : "/student/dashboard";

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await login(loginName.trim(), password);
      const meRes = await me();
      set({
        user: meRes.user,
        roles: meRes.roles,
        selectedRole: (meRes.selected_role || null) as Role | null,
        loaded: true,
      });
      // Авто-переход по роли: одна роль → сразу в раздел, иначе → выбор роли.
      if (res.roles.length === 1) {
        navigate(routeForRole(res.roles[0]), { replace: true });
      } else {
        navigate("/pick-role", { replace: true });
      }
    } catch (err) {
      const e = extractError(err);
      setError(
        e.code === "invalid_credentials"
          ? "Неверный логин или пароль"
          : "Не удалось войти. Проверьте соединение с сервером.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-stage">
      <div className="auth">
        {/* ===== Бренд-панель ===== */}
        <div className="auth-brand">
          <div className="mark">G</div>
          <div className="bn">Go Mentor</div>
          <div className="bt">
            Маршрут обучения Go, наставник рядом и видимый прогресс — от первого
            дня до оффера.
          </div>
          <div className="bf">Платформа менторства</div>
        </div>

        {/* ===== Форма входа ===== */}
        <div className="auth-form">
          <h2>Вход</h2>
          <div className="h-sub">Войдите по логину и паролю</div>

          {error && (
            <div className="form-err" role="alert">
              <svg
                className="i"
                style={{ width: 16, height: 16 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handle} noValidate>
            <div className="field">
              <label htmlFor="f-login">Логин</label>
              <input
                id="f-login"
                className={`input${error ? " err" : ""}`}
                type="text"
                autoComplete="username"
                autoFocus
                value={loginName}
                onChange={(e) => {
                  setLoginName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Введите логин"
              />
            </div>
            <div className="field">
              <label htmlFor="f-pass">Пароль</label>
              <input
                id="f-pass"
                className={`input${error ? " err" : ""}`}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Введите пароль"
              />
            </div>

            <button
              type="submit"
              className="btn secondary"
              style={{
                width: "100%",
                justifyContent: "center",
                height: 42,
                marginTop: 6,
              }}
              disabled={loading || !loginName.trim() || !password.trim()}
            >
              {loading ? <Spinner size={18} /> : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

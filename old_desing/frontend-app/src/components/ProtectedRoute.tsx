import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/stores/auth";
import { me } from "@/api/auth";
import { PageLoader } from "./Spinner";
import type { Role } from "@/api/types";

interface Props {
  children: ReactNode;
  requiredRole?: Role;
  allowWithoutRole?: boolean;
}

export function ProtectedRoute({ children, requiredRole, allowWithoutRole }: Props) {
  const { user, roles, selectedRole, loaded, set, reset } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (loaded) return;
    me()
      .then((res) => {
        set({
          user: res.user,
          roles: res.roles,
          selectedRole: (res.selected_role || null) as Role | null,
          loaded: true,
        });
      })
      .catch(() => reset());
  }, [loaded, set, reset]);

  if (!loaded) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (allowWithoutRole) return <>{children}</>;

  if (!selectedRole) return <Navigate to="/pick-role" replace />;

  if (requiredRole && selectedRole !== requiredRole) {
    // Если у пользователя есть нужная роль, но выбрана другая — отправим к picker'у
    if (roles.includes(requiredRole)) {
      return <Navigate to="/pick-role" replace />;
    }
    // Иначе — в его доступный раздел
    return (
      <Navigate
        to={selectedRole === "buddy" ? "/buddy/students" : "/student/dashboard"}
        replace
      />
    );
  }

  return <>{children}</>;
}

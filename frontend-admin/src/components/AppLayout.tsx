import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as authApi from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const navigate = useNavigate();
  const { user, setSession, setHydrated, isHydrated, selectedRole } = useAuthStore();

  const { data, isError, isSuccess } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
  });

  useEffect(() => {
    if (isSuccess && data) {
      setSession(data.user, data.roles, data.selected_role ?? null);
      setHydrated(true);
    }
    if (isError) {
      setHydrated(true);
      navigate("/login", { replace: true });
    }
  }, [isError, isSuccess, data, setSession, setHydrated, navigate]);

  useEffect(() => {
    // Once we know the role, if it's not admin → redirect to login
    if (isHydrated && user && selectedRole && selectedRole !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [isHydrated, user, selectedRole, navigate]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen grid place-items-center text-text-3 font-mono text-sm uppercase tracking-widest">
        <span className="inline-block w-5 h-5 rounded-full border-2 border-warning border-t-transparent spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="atmo" />
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 py-6 grid grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">
        <Sidebar />
        <main className="flex flex-col gap-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </>
  );
}

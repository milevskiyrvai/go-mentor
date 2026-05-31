import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { NotificationToaster } from "./NotificationToaster";
import { Crumbs, type CrumbSegment } from "./Crumbs";
import { useAuth } from "@/stores/auth";

/**
 * Лейаут с авто-крошками по текущему URL.
 * /student/dashboard → GO_MENTOR / STUDENT • МОЙ ПРОГРЕСС
 * /buddy/students/:id → GO_MENTOR / BUDDY / МОИ УЧЕНИКИ • <имя>
 */
function getCrumbs(pathname: string): { segments: CrumbSegment[]; live: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const role = parts[0]; // student | buddy
  const section = parts[1];

  const roleLabel = role === "buddy" ? "BUDDY" : "STUDENT";
  const homeTo = role === "buddy" ? "/buddy/students" : "/student/dashboard";

  const sectionMap: Record<string, { label: string; to: string }> = {
    dashboard: { label: "МОЙ ПРОГРЕСС", to: "/student/dashboard" },
    roadmap: { label: "ROADMAP", to: "/student/roadmap" },
    achievements: { label: "ДОСТИЖЕНИЯ", to: "/student/achievements" },
    bonuses: { label: "БОНУСЫ", to: "/student/bonuses" },
    interviews: { label: "СОБЕСЕДОВАНИЯ", to: `/${role}/interviews` },
    profile: { label: "ПРОФИЛЬ", to: `/${role}/profile` },
    calendar: { label: "КАЛЕНДАРЬ", to: `/${role}/calendar` },
    users: { label: "ПРОФИЛЬ", to: "" },
    students: { label: "МОИ УЧЕНИКИ", to: "/buddy/students" },
  };
  const cur = sectionMap[section];
  if (!cur) return null;

  // Drill-down: /buddy/students/:id или /student/users/:id
  if (parts.length >= 3) {
    return {
      segments: [
        { label: "GO_MENTOR", to: homeTo },
        { label: roleLabel, to: homeTo },
        { label: cur.label, to: cur.to || homeTo },
      ],
      live: section === "students" ? "КАРТОЧКА УЧЕНИКА" : "ПУБЛИЧНЫЙ ПРОФИЛЬ",
    };
  }
  return {
    segments: [
      { label: "GO_MENTOR", to: homeTo },
      { label: roleLabel, to: homeTo },
    ],
    live: cur.label,
  };
}

export function AppLayout() {
  const location = useLocation();
  const selectedRole = useAuth((s) => s.selectedRole);
  const crumbs = getCrumbs(location.pathname);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <div className="max-w-[1280px] mx-auto px-10 py-10 flex flex-col gap-6">
          {crumbs && selectedRole && (
            <Crumbs segments={crumbs.segments} liveSegment={crumbs.live} />
          )}
          <Outlet />
        </div>
      </main>
      <NotificationToaster />
    </div>
  );
}

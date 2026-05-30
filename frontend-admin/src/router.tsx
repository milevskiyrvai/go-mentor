import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { UsersPage } from "./pages/Users";
import { RoadmapPage } from "./pages/Roadmap";
import { AchievementsPage } from "./pages/Achievements";
import { OneOnOnePage } from "./pages/OneOnOne";
import { AnalyticsPage } from "./pages/Analytics";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/admin",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "roadmap", element: <RoadmapPage /> },
      { path: "achievements", element: <AchievementsPage /> },
      { path: "one-on-one", element: <OneOnOnePage /> },
      { path: "analytics", element: <AnalyticsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
]);

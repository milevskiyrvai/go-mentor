import { Navigate, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/Login";
import { RolePickerPage } from "@/pages/RolePicker";
import { StudentDashboard } from "@/pages/student/Dashboard";
import { StudentRoadmap } from "@/pages/student/Roadmap";
import { StudentAchievements } from "@/pages/student/Achievements";
import { StudentBonuses } from "@/pages/student/Bonuses";
import { StudentInterviews } from "@/pages/student/Interviews";
import { StudentProfile } from "@/pages/student/Profile";
import { PublicProfilePage } from "@/pages/student/PublicProfile";
import { StudentCalendar } from "@/pages/student/Calendar";
import { BuddyStudents } from "@/pages/buddy/Students";
import { BuddyStudentCard } from "@/pages/buddy/StudentCard";
import { BuddyCalendar } from "@/pages/buddy/Calendar";
import { BuddyMockInterviews } from "@/pages/buddy/MockInterviews";
import { BuddyProfile } from "@/pages/buddy/Profile";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/pick-role",
    element: (
      <ProtectedRoute allowWithoutRole>
        <RolePickerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/student",
    element: (
      <ProtectedRoute requiredRole="student">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/student/dashboard" replace /> },
      { path: "dashboard", element: <StudentDashboard /> },
      { path: "roadmap", element: <StudentRoadmap /> },
      { path: "achievements", element: <StudentAchievements /> },
      { path: "bonuses", element: <StudentBonuses /> },
      { path: "interviews", element: <StudentInterviews /> },
      { path: "profile", element: <StudentProfile /> },
      { path: "calendar", element: <StudentCalendar /> },
      { path: "users/:id", element: <PublicProfilePage /> },
    ],
  },
  {
    path: "/buddy",
    element: (
      <ProtectedRoute requiredRole="buddy">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/buddy/students" replace /> },
      { path: "students", element: <BuddyStudents /> },
      { path: "students/:id", element: <BuddyStudentCard /> },
      { path: "calendar", element: <BuddyCalendar /> },
      { path: "interviews", element: <BuddyMockInterviews /> },
      { path: "profile", element: <BuddyProfile /> },
      { path: "users/:id", element: <PublicProfilePage /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

# Go Mentor — Frontend (Student + Buddy)

React 18 + TypeScript + Vite + Tailwind SPA. Покрывает все Student/Buddy экраны: roadmap, прогресс, ачивки, бонусы, собеседования, финалки, профиль, календарь.

Admin живёт в отдельной панели `frontend-admin/` на другом домене.

## Запуск

### Через docker-compose (рекомендуемо)

```bash
docker compose --profile frontend up --build
```

Откроется на http://localhost:5173. Бэкенд должен быть запущен (профиль не нужен, сервис `backend` стартует автоматически).

### Локально

```bash
npm install
npm run dev
```

API запросы проксируются через Vite на `http://localhost:8080`.

## Demo-аккаунты (из seed бэкенда)

| Login    | Пароль        | Роли             |
| -------- | ------------- | ---------------- |
| admin    | `Admin123!`   | admin            |
| buddy    | `Buddy123!`   | buddy            |
| multi    | `Multi123!`   | student + buddy  |
| student1 | `Student123!` | student          |
| student2 | `Student123!` | student          |
| student3 | `Student123!` | student          |

## Стек

- React 18 + TypeScript + Vite
- Tailwind CSS 3 (palette из дизайн-системы Claude Design v2)
- React Router 6
- TanStack Query v5 (server state)
- Zustand (auth state)
- axios (`withCredentials: true` для cookie-auth)
- Framer Motion (toast ачивок, переходы)
- Inter + JetBrains Mono

## Структура

```
src/
├── api/              — модули API (auth, users, roadmap, progress, bonus, achievements, interviews, finals, calendar, activity)
├── components/       — общие UI (Sidebar, AchievementCard, RoadmapBlockCard, MaterialCard, ProgressBar, HexBadge, …)
├── pages/
│   ├── student/      — Dashboard, Roadmap, Achievements, Bonuses, Interviews, Profile, PublicProfile, Calendar
│   └── buddy/        — Students list, StudentCard (tabs: roadmap/interviews/finals/activity/calendar), Calendar, MockInterviews, Profile
├── stores/auth.ts    — Zustand: user, roles, selectedRole
├── styles/globals.css — CSS-переменные дизайн-системы
├── router.tsx
├── App.tsx
└── main.tsx
```

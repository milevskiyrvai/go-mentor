# Go Mentor — платформа менторства по Go

Хакатон-проект itrostik. Полная реализация ТЗ в `TZ/ТЗ к Хакатону (itrostik).pdf`.

## Стек

- **Backend:** Go 1.23, chi router, sqlx, PostgreSQL 16, JWT auth, golang-migrate
- **Frontend (Student/Buddy):** React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Frontend (Admin):** React 18 + TypeScript + Vite + Tailwind + shadcn/ui (отдельный SPA на admin-поддомене)
- **Инфраструктура:** Docker Compose

## Запуск локально

```bash
docker-compose up --build
```

После запуска доступны:

| Сервис             | URL                                  |
|--------------------|--------------------------------------|
| Frontend (app)     | http://localhost:5173                |
| Frontend (admin)   | http://localhost:5174                |
| Backend API        | http://localhost:8080/api/v1         |
| Health check       | http://localhost:8080/health         |
| PostgreSQL         | localhost:5432 (gomentor/gomentor_dev_pwd) |

## Demo-аккаунты

Seed-миграция `backend/migrations/000002_seed.up.sql` применяется автоматически при первом старте и создаёт демонстрационные аккаунты:

| Логин      | Пароль       | Роли             | Имя              | Примечание                                                  |
|------------|--------------|------------------|------------------|-------------------------------------------------------------|
| `admin`    | `Admin123!`  | admin            | Анна Админова    | Управление roadmap, ачивками, заявками 1×1                  |
| `buddy`    | `Buddy123!`  | buddy            | Иван Менторов    | Наставник всех студентов, `@ivan_mentor`                    |
| `multi`    | `Multi123!`  | student + buddy  | Михаил Кротов    | Основной demo-юзер, баланс 3 420 бонусов, скидка 9.2%       |
| `student1` | `Student123!`| student          | Дарья Смирнова   | Блок 4 ждёт подтверждения Buddy                             |
| `student2` | `Student123!`| student          | Андрей Носов     | Блок 2 in_progress (56%), 12 дней без активности            |
| `student3` | `Student123!`| student          | Екатерина Лебедева | Только начала путь                                        |

### Состояние Михаил Кротов (multi)

- Блоки 01 «Foundations», 02 «Interfaces & Errors» — approved
- Блок 03 «Concurrency» — in_progress, просмотрено 9 материалов
- 9 ачивок: «Первый шаг», «Разогрев», «Фокус», «Профиль оформлен», «Блок 1 закрыт», «Блок 2 закрыт», «Первый mock», «Первый real», «Серия real ×3»
- 2 mock-собеседования (с фидбэком от Buddy)
- 3 real-собеседования: Авито (reject), Тинькофф (pending), Ozon (offer)
- 1 заявка 1×1 в статусе pending
- 3 события в календаре: mock завтра, ревью блока 3 послезавтра, real-собес через 4 дня
- Баланс: 395 (ачивки) + 3 945 (manual_adjustment от Admin) − 920 (конвертация в скидку 9.20%) = **3 420 бонусов**

## Структура

```
.
├── backend/             — Go API
│   ├── cmd/server/      — entrypoint
│   ├── internal/        — внутренние пакеты
│   │   ├── config/      — загрузка env
│   │   ├── db/          — sqlx connection + migrate runner
│   │   └── router/      — chi router и middleware
│   └── migrations/      — SQL миграции
├── frontend-app/        — React SPA для Student/Buddy
├── frontend-admin/      — React SPA для Admin
├── docker-compose.yml
└── TZ/                  — техническое задание
```

## Миграции

При старте backend автоматически применяет миграции из `backend/migrations`.

## Лицензия

Хакатон-проект, лицензия не определена.

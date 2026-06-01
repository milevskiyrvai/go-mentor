# QA-контекст Go Mentor

## Боевые URL
- App (Student/Buddy): https://app.hakaton.consoleai.ru
- Admin: https://admin.hakaton.consoleai.ru
- API под /api/v1, JWT в cookie gomentor_session

## Demo-аккаунты (вход login+password)
| login | password | роль | куда |
|---|---|---|---|
| admin | Admin123! | admin | admin. |
| buddy | Buddy123! | buddy | app. |
| multi | Multi123! | student+buddy | app. (главный demo) |
| student1/2/3 | Student123! | student | app. |

## Playwright-сетап (готов, работает)
- Папка `c:/tmp/smoke` — установлен @playwright/test@1.60 + chromium.
- playwright.config.ts: headless, ignoreHTTPSErrors, workers:1, timeout 60s.
- Логин-флоу: goto / → input.first().fill(login) → input[type=password].fill(pass) → button «Войти» → wait. Если показался выбор роли — кликнуть нужную роль + «Продолжить».
- Трекинг ошибок: page.on('pageerror'), page.on('response') фильтр status>=400 на /api/ (method!=GET для записи).
- ВАЖНО: не матчить текст «ошибк/error» по всей странице — на легитимных экранах есть слова «ошибки», «Удалить» (даёт ложные срабатывания). Лучше ловить React Router error boundary (текст «Application Error»/«Unexpected») или конкретные toast-узлы ошибок.

## Известный класс багов (ГЛАВНОЕ)
Go-бэк сериализует ПУСТЫЕ слайсы как JSON `null`, не `[]`. Фронт падает на `null.length`/`null.map` → React Router рисует «Application Error» (выглядит как «создалось но ошибка», т.к. POST успешен, а detail-рендер крашит).
Уже прикрыто (?? []): roadmap materials (app+admin), progress blocks/viewed_material_ids, stats recent_one_on_one.
ПРОВЕРИТЬ ОСТАЛЬНЫЕ: interviews (items), achievements (items, my), calendar (items), finals (items), bonus transactions (items), one-on-one (items), activity, notifications, buddy students, admin users. Любой `.map`/`.length`/`.filter` по полю из API при пустых данных = потенциальный краш. Нормализовать в api-слое (data.X ?? []).

## Мусор для вычистки
Подзаголовки-инструкции из ТЗ, перенесённые из макетов в PageHeader/PageHead description: «Перетаскивай блоки и материалы… §6.6/§6.9/§20», «Управляйте…», «Конвертируйте…» и пр. В продукте быть НЕ должно — заменить на факт-статус или убрать. Проверить все pages/*.tsx обоих фронтов (греп: description=, «Перетаскивай», «§»).

## Деплой (делает оркестратор, не агент)
Локальный build → tar dist → docker cp в gomentor-frontend-app / gomentor-frontend-admin: /usr/share/nginx/html. Сервер 217.198.5.195.

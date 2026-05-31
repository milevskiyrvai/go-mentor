# Карта API и бэкенда Go Mentor (для сборки нового фронта)

> Бэк (Go) и API-слой фронта — РАБОЧИЕ и ПОЛНЫЕ. Новый UI ПЕРЕИСПОЛЬЗУЕТ их как есть.
> Все эндпоинты под `/api/v1`. JWT в HttpOnly cookie `gomentor_session`. axios client: baseURL=`/api/v1`, withCredentials=true.

## API-слой фронта (переиспользуем — НЕ переписывать)

### frontend-app/src/api/*
- **auth.ts**: `login(login,pass)`, `me()`, `selectRole(role)`, `logout()`
- **users.ts**: `updateSelf(dto)`, `getPublicProfile(id)`, `listMyStudents()`
- **roadmap.ts**: `listBlocks()`, `getBlock(id)`
- **progress.ts**: `myProgress()`, `studentProgress(id)`, `markViewed(matId)`, `unmarkViewed(matId)`, `approveBlock(blockId, studentId)`
- **bonus.ts**: `myBonuses()`, `myTransactions()`, `convertBonus(amount)`, `myOneOnOne()`, `createOneOnOne()`
- **achievements.ts**: `listAchievements()`, `myAchievements()`
- **interviews.ts**: `myInterviews(type?)`, `studentInterviews(id,type?)`, `interviewsCatalog(params)`, `addReal(dto)`, `createMock(dto)`, `completeMock(id,feedback)`, `updateInterview(id,dto)`, `deleteInterview(id)`
- **finals.ts**: `myFinals()`, `studentFinals(id)`, `scheduleFinal(studentId,type,time)`, `completeFinal(studentId,type,success)`
- **calendar.ts**: `listEvents(params)`, `createEvent(dto)`, `updateEvent(id,dto)`, `deleteEvent(id)`
- **activity.ts**: `listStudentActivity(studentId,limit)`, `listNotifications(onlyUnread)`, `markNotificationsRead(ids?)`

### frontend-admin/src/api/*
- **users.ts**: `listUsers(filter)`, `createUser(body)`, `getUser(id)`, `updateUser(id,body)`, `deleteUser(id)`, `resetPassword(id,pass)`, `assignBuddy(studentId,buddyId)`, `unassignBuddy(studentId)`
- **roadmap.ts**: `listBlocks(inclInactive)`, `getBlock(id,inclInactive)`, `createBlock(body)`, `updateBlock(id,body)`, `deleteBlock(id)`, `reorderBlocks(ids)`, `createMaterial(body)`, `updateMaterial(id,body)`, `deleteMaterial(id)`, `reorderMaterials(blockId,ids)`, `fetchPreview(url)`
- **achievements.ts**: `listAchievements(inclInactive)`, `createAchievement(body)`, `updateAchievement(id,body)`, `listAchievementUsers(id)`
- **oneOnOne.ts**: `listOneOnOne(status?)`, `approveOneOnOne(id)`, `rejectOneOnOne(id)`, `completeOneOnOne(id)`, `cancelOneOnOne(id)`
- **stats.ts**: `getAdminStats()`

## Ключевые типы (api/types.ts — переиспользуем)
- `Role = "student"|"buddy"|"admin"`
- `User {id, login, display_name, avatar_url?, about?, telegram_username?, is_profile_private, learning_started_at?}`
- `MeResponse {user, roles[], selected_role?}`
- `BuddyStudent {id, display_name, avatar_url?, telegram_username?, approved_blocks, waiting_blocks, total_blocks, overall_percent, last_activity_at?, ...}`
- `RoadmapBlock {id, title, description?, sort_order, is_active}`
- `RoadmapMaterial {id, block_id, title, description?, type(theory|questions|practice|homework), content_type(url|youtube|github|article|text|file), url?, content?, preview_*, source?, is_required, is_active, sort_order}`
- `BlockStatus = not_started|in_progress|waiting_buddy_confirmation|approved`
- `StudentProgressSummary {blocks[], viewed_material_ids[], overall_percent, approved_blocks, total_active_blocks, viewed_materials_count}`
- `BonusOverview {balance, discount_percent, discount_cap}` (cap=15)
- `BonusTransaction {id, type(achievement_reward|discount_conversion|one_on_one_spend|manual_adjustment|refund), amount, reason?, created_at}`
- `OneOnOneRequest {id, student_id, status(pending|approved|rejected|completed|cancelled), ...}`
- `Achievement {id, title, description?, reward_bonus, image_url?, condition_type, condition_params, is_active, sort_order}`
- `AchievementProgressItem {achievement, received, current, target}`
- `Interview {id, type(mock|real), student_id, buddy_id?, url?, company?, position?, grade?, stack?, date?, status, result?(offer|reject|pending|no_result), feedback?}`
- `FinalCheck {id, student_id, type(final_technical|final_roast), status(not_available|available|scheduled|completed|failed), scheduled_at?, completed_at?}`
- `CalendarEvent {id, title, student_id?, buddy_id?, type(mock_interview|real_interview|block_review|final_technical|final_roast|custom), start_datetime, end_datetime?, description?, reminder_enabled}`
- `AdminStats {users_total, students_count, buddies_count, admins_count, one_on_one_pending, achievements_awarded_total, active_blocks_count, avg_completion_percent, recent_one_on_one[]}`

## Auth flow (стор Zustand — переисп998уем)
- `stores/auth.ts`: `useAuth` → `{user, roles, selectedRole, loaded, set(), reset()}`
- После login → сохранить в стор; cookie с JWT шлётся автоматически (withCredentials)
- На перезагрузку → `/auth/me` восстанавливает state
- Endpoints возвращают `{items: [...]}` для списков; ошибки `{error: "code"}`

## Замечания по бэку (НЕ критично, для будущего — НЕ чинить без отдельной задачи)
- discount cap=15 захардкожен в bonus.go
- approveBlock требует student_id в body (хотя он в JWT)
- finals: GET /me/finals создаёт not_available строки (возможны дубли)
- нет пагинации total count; нет rate-limit на login

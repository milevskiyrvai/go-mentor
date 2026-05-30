-- Initial schema for Go Mentor platform.
-- Mirrors entities from ТЗ раздел 23.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 23.1 users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    about           TEXT,
    telegram_username TEXT UNIQUE,
    learning_started_at TIMESTAMPTZ,
    is_profile_private  BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.2 user_roles
CREATE TABLE user_roles (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('student','buddy','admin')),
    UNIQUE (user_id, role)
);

-- 23.3 student_buddy_assignments (один student → один buddy)
CREATE TABLE student_buddy_assignments (
    id          BIGSERIAL PRIMARY KEY,
    student_id  UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    buddy_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.4 roadmap_blocks
CREATE TABLE roadmap_blocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.5 roadmap_materials
CREATE TABLE roadmap_materials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id    UUID NOT NULL REFERENCES roadmap_blocks(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    type        TEXT NOT NULL CHECK (type IN ('theory','questions','practice','homework')),
    content_type TEXT NOT NULL CHECK (content_type IN ('url','youtube','github','article','text','file')),
    url         TEXT,
    content     TEXT,
    preview_title       TEXT,
    preview_description TEXT,
    preview_image       TEXT,
    source      TEXT,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INT NOT NULL DEFAULT 0,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.6 material_progress
CREATE TABLE material_progress (
    id          BIGSERIAL PRIMARY KEY,
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES roadmap_materials(id) ON DELETE CASCADE,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, material_id)
);

-- 23.7 block_progress
CREATE TABLE block_progress (
    id          BIGSERIAL PRIMARY KEY,
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    block_id    UUID NOT NULL REFERENCES roadmap_blocks(id) ON DELETE CASCADE,
    status      TEXT NOT NULL CHECK (status IN ('not_started','in_progress','waiting_buddy_confirmation','approved')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, block_id)
);

-- 23.8 final_checks
CREATE TABLE final_checks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buddy_id     UUID REFERENCES users(id),
    type         TEXT NOT NULL CHECK (type IN ('final_technical','final_roast')),
    status       TEXT NOT NULL CHECK (status IN ('not_available','available','scheduled','completed','failed')),
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, type)
);

-- 23.9 interviews (mock/real)
CREATE TABLE interviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL CHECK (type IN ('mock','real')),
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buddy_id    UUID REFERENCES users(id),
    url         TEXT,
    company     TEXT,
    position    TEXT,
    grade       TEXT,
    stack       TEXT,
    date        DATE,
    status      TEXT NOT NULL,
    result      TEXT,
    feedback    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.10 achievements
CREATE TABLE achievements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title          TEXT NOT NULL,
    description    TEXT,
    reward_bonus   INT NOT NULL DEFAULT 0,
    image_url      TEXT,
    condition_type TEXT NOT NULL,
    condition_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order     INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.11 user_achievements
CREATE TABLE user_achievements (
    id             BIGSERIAL PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, achievement_id)
);

-- 23.12 bonus_transactions
CREATE TABLE bonus_transactions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('achievement_reward','discount_conversion','one_on_one_spend','manual_adjustment','refund')),
    amount      INT NOT NULL,
    reason      TEXT,
    source_type TEXT,
    source_id   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bonus_transactions_user ON bonus_transactions(user_id, created_at DESC);

-- 23.13 discount_conversions
CREATE TABLE discount_conversions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_amount    INT NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.14 one_on_one_requests
CREATE TABLE one_on_one_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23.15 calendar_events
CREATE TABLE calendar_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    student_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    buddy_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('mock_interview','real_interview','block_review','final_technical','final_roast','custom')),
    start_datetime  TIMESTAMPTZ NOT NULL,
    end_datetime    TIMESTAMPTZ,
    description     TEXT,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_student ON calendar_events(student_id, start_datetime);
CREATE INDEX idx_calendar_events_buddy   ON calendar_events(buddy_id, start_datetime);

-- 23.16 activity_events
CREATE TABLE activity_events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id    UUID REFERENCES users(id),
    type        TEXT NOT NULL,
    source_type TEXT,
    source_id   TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_events_user ON activity_events(user_id, created_at DESC);

-- Уведомления (раздел 19): храним опционально, чтобы можно было показать инбокс.
CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

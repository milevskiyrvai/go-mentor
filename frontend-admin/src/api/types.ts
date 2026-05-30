// ===== Roles =====
export type Role = "student" | "buddy" | "admin";

// ===== Auth =====
export interface AuthUser {
  id: string;
  login: string;
  display_name: string;
  avatar_url?: string;
  about?: string;
  telegram_username?: string;
  is_profile_private: boolean;
}

export interface MeResponse {
  user: AuthUser;
  roles: Role[];
  selected_role?: Role;
}

export interface LoginResponse {
  user: AuthUser;
  roles: Role[];
  selected_role?: Role;
}

// ===== Users =====
export interface User {
  id: string;
  login: string;
  display_name: string;
  avatar_url?: string;
  about?: string;
  telegram_username?: string;
  learning_started_at?: string;
  is_profile_private: boolean;
  is_deleted: boolean;
  roles: Role[];
  created_at: string;
  updated_at: string;
}

export interface UserListItem extends User {
  buddy_id?: string;
  buddy_name?: string;
  students_count: number;
}

export interface CreateUserBody {
  login: string;
  password: string;
  display_name: string;
  telegram_username?: string | null;
  learning_started_at?: string | null;
  roles: Role[];
}

export interface UpdateUserBody {
  display_name?: string;
  telegram_username?: string | null;
  learning_started_at?: string | null;
  roles?: Role[];
}

// ===== Roadmap =====
export type MaterialKind = "theory" | "questions" | "practice" | "homework";
export type ContentType = "url" | "youtube" | "github" | "article" | "text" | "file";

export interface RoadmapBlock {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoadmapMaterial {
  id: string;
  block_id: string;
  title: string;
  description?: string;
  type: MaterialKind;
  content_type: ContentType;
  url?: string;
  content?: string;
  preview_title?: string;
  preview_description?: string;
  preview_image?: string;
  source?: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlockDetailResponse {
  block: RoadmapBlock;
  materials: RoadmapMaterial[];
}

// ===== Achievements =====
export interface Achievement {
  id: string;
  title: string;
  description?: string;
  reward_bonus: number;
  image_url?: string;
  condition_type: string;
  condition_params: Record<string, unknown> | unknown;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ===== 1×1 =====
export type OneOnOneStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

export interface OneOnOneRequest {
  id: string;
  student_id: string;
  status: OneOnOneStatus;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// ===== Preview =====
export interface PreviewMetadata {
  title?: string;
  description?: string;
  image?: string;
  source?: string;
}

// ===== Stats (custom backend extension) =====
export interface AdminStats {
  users_total: number;
  students_count: number;
  buddies_count: number;
  admins_count: number;
  deleted_count: number;
  one_on_one_pending: number;
  achievements_awarded_total: number;
  recent_one_on_one: OneOnOneRequest[];
}

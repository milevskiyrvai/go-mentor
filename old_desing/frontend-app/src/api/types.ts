export type Role = "student" | "buddy" | "admin";

export interface User {
  id: string;
  login: string;
  display_name: string;
  avatar_url?: string;
  about?: string;
  telegram_username?: string;
  is_profile_private: boolean;
  learning_started_at?: string;
}

export interface MeResponse {
  user: User;
  roles: Role[];
  selected_role?: Role | "";
}

export interface LoginResponse extends MeResponse {}

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  telegram_username?: string;
  is_profile_private: boolean;
  about?: string;
  roles?: Role[];
  learning_days?: number;
  learning_started_at?: string;
}

// ---------- Roadmap ----------

export type MaterialType = "theory" | "questions" | "practice" | "homework";
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
  type: MaterialType;
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

// ---------- Progress ----------

export type BlockStatus =
  | "not_started"
  | "in_progress"
  | "waiting_buddy_confirmation"
  | "approved";

export interface BlockProgressSummary {
  block_id: string;
  status: BlockStatus;
  total_required: number;
  viewed_required: number;
  total_all: number;
  viewed_all: number;
  progress_percent: number;
  approved_by?: string;
}

export interface StudentProgressSummary {
  blocks: BlockProgressSummary[];
  viewed_material_ids: string[];
  overall_percent: number;
  approved_blocks: number;
  total_active_blocks: number;
  viewed_materials_count: number;
}

// ---------- Bonus ----------

export interface BonusOverview {
  balance: number;
  discount_percent: number;
  discount_cap: number;
}

export type BonusOpType =
  | "achievement_reward"
  | "discount_conversion"
  | "one_on_one_spend"
  | "manual_adjustment"
  | "refund";

export interface BonusTransaction {
  id: number;
  user_id: string;
  type: BonusOpType;
  amount: number;
  reason?: string;
  source_type?: string;
  source_id?: string;
  created_at: string;
}

export type OneOnOneStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export interface OneOnOneRequest {
  id: string;
  student_id: string;
  status: OneOnOneStatus;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// ---------- Achievements ----------

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  reward_bonus: number;
  image_url?: string;
  condition_type: string;
  condition_params: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

export interface AchievementProgressItem {
  achievement: Achievement;
  received: boolean;
  current: number;
  target: number;
}

// ---------- Interviews ----------

export type InterviewType = "mock" | "real";
export type InterviewStatus =
  | "submitted"
  | "reviewed"
  | "completed"
  | "scheduled"
  | "cancelled";

export type InterviewResult = "offer" | "reject" | "pending" | "no_result";

export interface Interview {
  id: string;
  type: InterviewType;
  student_id: string;
  buddy_id?: string;
  url?: string;
  company?: string;
  position?: string;
  grade?: string;
  stack?: string;
  date?: string;
  status: string;
  result?: string;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

// ---------- Finals ----------

export type FinalCheckType = "final_technical" | "final_roast";
export type FinalCheckStatus =
  | "not_available"
  | "available"
  | "scheduled"
  | "completed"
  | "failed";

export interface FinalCheck {
  id: string;
  student_id: string;
  buddy_id?: string;
  type: FinalCheckType;
  status: FinalCheckStatus;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ---------- Calendar ----------

export type CalendarEventType =
  | "mock_interview"
  | "real_interview"
  | "block_review"
  | "final_technical"
  | "final_roast"
  | "custom";

export interface CalendarEvent {
  id: string;
  title: string;
  student_id?: string;
  buddy_id?: string;
  type: CalendarEventType;
  start_datetime: string;
  end_datetime?: string;
  description?: string;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- Activity / notifications ----------

export interface ActivityEvent {
  id: number;
  user_id: string;
  actor_id?: string;
  type: string;
  source_type?: string;
  source_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ---------- Buddy: students summary ----------

export interface BuddyStudent {
  id: string;
  login: string;
  display_name: string;
  avatar_url?: string;
  about?: string;
  telegram_username?: string;
  learning_started_at?: string;
  is_profile_private: boolean;
  approved_blocks: number;
  waiting_blocks: number;
  total_blocks: number;
  total_required: number;
  viewed_required: number;
  overall_percent: number;
  last_activity_at?: string;
}

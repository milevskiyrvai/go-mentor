package adminstats

import (
	"encoding/json"
	"net/http"

	"github.com/jmoiron/sqlx"
)

type Handler struct {
	db *sqlx.DB
}

func NewHandler(db *sqlx.DB) *Handler {
	return &Handler{db: db}
}

type RecentOneOnOne struct {
	ID        string `db:"id" json:"id"`
	StudentID string `db:"student_id" json:"student_id"`
	Status    string `db:"status" json:"status"`
	CreatedAt string `db:"created_at" json:"created_at"`
}

type StatsResponse struct {
	UsersTotal             int              `json:"users_total"`
	StudentsCount          int              `json:"students_count"`
	BuddiesCount           int              `json:"buddies_count"`
	AdminsCount            int              `json:"admins_count"`
	DeletedCount           int              `json:"deleted_count"`
	OneOnOnePending        int              `json:"one_on_one_pending"`
	AchievementsAwardedAll int              `json:"achievements_awarded_total"`
	ActiveBlocksCount      int              `json:"active_blocks_count"`     // §22: количество активных блоков
	AvgCompletionPercent   float64          `json:"avg_completion_percent"`  // §22: среднее прохождение блоков
	RecentOneOnOne         []RecentOneOnOne `json:"recent_one_on_one"`
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	resp := StatsResponse{
		RecentOneOnOne: []RecentOneOnOne{},
	}

	_ = h.db.GetContext(r.Context(), &resp.UsersTotal,
		`SELECT COUNT(*) FROM users WHERE is_deleted = false`)

	_ = h.db.GetContext(r.Context(), &resp.DeletedCount,
		`SELECT COUNT(*) FROM users WHERE is_deleted = true`)

	_ = h.db.GetContext(r.Context(), &resp.StudentsCount,
		`SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur
		 JOIN users u ON u.id = ur.user_id
		 WHERE ur.role = 'student' AND u.is_deleted = false`)

	_ = h.db.GetContext(r.Context(), &resp.BuddiesCount,
		`SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur
		 JOIN users u ON u.id = ur.user_id
		 WHERE ur.role = 'buddy' AND u.is_deleted = false`)

	_ = h.db.GetContext(r.Context(), &resp.AdminsCount,
		`SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur
		 JOIN users u ON u.id = ur.user_id
		 WHERE ur.role = 'admin' AND u.is_deleted = false`)

	_ = h.db.GetContext(r.Context(), &resp.OneOnOnePending,
		`SELECT COUNT(*) FROM one_on_one_requests WHERE status = 'pending'`)

	_ = h.db.GetContext(r.Context(), &resp.AchievementsAwardedAll,
		`SELECT COUNT(*) FROM user_achievements`)

	// §22: активные блоки в системе.
	_ = h.db.GetContext(r.Context(), &resp.ActiveBlocksCount,
		`SELECT COUNT(*) FROM roadmap_blocks WHERE is_active = TRUE AND deleted_at IS NULL`)

	// §22: среднее прохождение блоков (по approved / total среди студентов).
	// Считаем: (approved blocks для студента) / (total active blocks) * 100, средне по студентам.
	_ = h.db.GetContext(r.Context(), &resp.AvgCompletionPercent, `
		WITH total AS (
			SELECT COUNT(*)::float AS n FROM roadmap_blocks WHERE is_active = TRUE AND deleted_at IS NULL
		),
		per_student AS (
			SELECT u.id, COUNT(bp.id) FILTER (WHERE bp.status = 'approved') AS approved
			FROM users u
			JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
			LEFT JOIN block_progress bp ON bp.student_id = u.id
			WHERE u.is_deleted = false
			GROUP BY u.id
		)
		SELECT COALESCE(AVG(CASE WHEN (SELECT n FROM total) > 0
			THEN approved / (SELECT n FROM total) * 100 ELSE 0 END), 0)
		FROM per_student
	`)

	rows, err := h.db.QueryxContext(r.Context(),
		`SELECT id::text, student_id::text, status, created_at::text
		 FROM one_on_one_requests
		 ORDER BY created_at DESC
		 LIMIT 8`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it RecentOneOnOne
			if err := rows.StructScan(&it); err == nil {
				resp.RecentOneOnOne = append(resp.RecentOneOnOne, it)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

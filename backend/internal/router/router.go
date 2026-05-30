package router

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/achievements"
	"github.com/itrostik/gomentor/internal/activity"
	"github.com/itrostik/gomentor/internal/adminstats"
	"github.com/itrostik/gomentor/internal/auth"
	"github.com/itrostik/gomentor/internal/bonus"
	"github.com/itrostik/gomentor/internal/calendar"
	"github.com/itrostik/gomentor/internal/config"
	"github.com/itrostik/gomentor/internal/finals"
	"github.com/itrostik/gomentor/internal/interviews"
	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/itrostik/gomentor/internal/progress"
	"github.com/itrostik/gomentor/internal/roadmap"
	"github.com/itrostik/gomentor/internal/users"
	"github.com/jmoiron/sqlx"
)

func New(cfg *config.Config, db *sqlx.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Auth wiring
	jwtSvc := auth.NewJWT(cfg.JWTSecret)
	authRepo := auth.NewRepository(db)
	authSvc := auth.NewService(authRepo, jwtSvc)
	authHandler := auth.NewHandler(authSvc, cfg.AppEnv == "production")

	authMW := middleware.AuthRequired(auth.CookieName, func(token string) (uuid.UUID, string, error) {
		claims, err := jwtSvc.Parse(token)
		if err != nil {
			return uuid.Nil, "", err
		}
		return claims.UserID, claims.SelectedRole, nil
	})

	// Users wiring
	usersRepo := users.NewRepository(db)
	usersSvc := users.NewService(usersRepo)
	usersHandler := users.NewHandler(usersSvc)

	// Roadmap wiring
	roadmapRepo := roadmap.NewRepository(db)
	roadmapSvc := roadmap.NewService(roadmapRepo)
	roadmapHandler := roadmap.NewHandler(roadmapSvc)

	// Progress wiring
	progressRepo := progress.NewRepository(db)
	progressSvc := progress.NewService(progressRepo, nil)
	progressHandler := progress.NewHandler(progressSvc, roadmapSvc, usersSvc)

	// Bonus wiring
	bonusRepo := bonus.NewRepository(db)
	bonusSvc := bonus.NewService(bonusRepo)
	bonusHandler := bonus.NewHandler(bonusSvc)

	// Activity & notifications
	activitySvc := activity.NewService(db, usersSvc)
	activityHandler := activity.NewHandler(activitySvc, usersSvc)

	// Achievements wiring (используем activity как notifier).
	achRepo := achievements.NewRepository(db)
	achStats := achievements.NewDBStatsProvider(db)
	achEngine := achievements.NewEngine(achRepo, achStats, bonusSvc, activitySvc)
	achSvc := achievements.NewService(achRepo, achEngine)
	achHandler := achievements.NewHandler(achSvc, achStats)
	progressSvc.SetHook(achEngine)
	progressSvc.SetNotifier(activitySvc)
	// P0-1/P0-2/P1-4: триггеры и notifier во все сервисы, которые их публикуют.
	bonusSvc.SetTrigger(achEngine)
	bonusSvc.SetNotifier(activitySvc)
	usersSvc.SetTrigger(achEngine)

	// Interviews
	interviewsRepo := interviews.NewRepository(db)
	interviewsSvc := interviews.NewService(interviewsRepo, usersSvc, achEngine)
	interviewsSvc.SetNotifier(activitySvc)
	interviewsHandler := interviews.NewHandler(interviewsSvc, usersSvc)

	// Finals
	finalsSvc := finals.NewService(db, usersSvc, achEngine)
	finalsSvc.SetNotifier(activitySvc)
	finalsHandler := finals.NewHandler(finalsSvc, usersSvc)

	// Calendar
	calendarSvc := calendar.NewService(db, usersSvc)
	calendarSvc.SetNotifier(activitySvc)
	calendarHandler := calendar.NewHandler(calendarSvc)

	// Admin stats (dashboard overview)
	adminStatsHandler := adminstats.NewHandler(db)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
			writeJSON(w, http.StatusOK, map[string]string{"message": "pong"})
		})

		// Public
		r.Post("/auth/login", authHandler.Login)

		// Authed
		r.Group(func(r chi.Router) {
			r.Use(authMW)

			// Auth
			r.Get("/auth/me", authHandler.Me)
			r.Post("/auth/select-role", authHandler.SelectRole)
			r.Post("/auth/logout", authHandler.Logout)

			// Self profile
			r.Patch("/me/profile", usersHandler.UpdateSelf)

			// Public profile (любой авторизованный)
			r.Get("/users/{id}", usersHandler.GetPublicProfile)

			// Roadmap read (Student/Buddy/Admin)
			r.Get("/roadmap/blocks", roadmapHandler.ListBlocks)
			r.Get("/roadmap/blocks/{id}", roadmapHandler.GetBlock)

			// Progress
			r.Get("/me/progress", progressHandler.MyProgress)
			r.Post("/me/materials/{id}/view", progressHandler.MarkMaterialViewed)
			r.Delete("/me/materials/{id}/view", progressHandler.UnmarkMaterialViewed)
			r.Get("/users/{studentID}/progress", progressHandler.GetStudentProgress)
			r.Post("/roadmap/blocks/{id}/approve", progressHandler.ApproveBlock)

			// Bonus & 1x1 (self)
			r.Get("/me/bonuses", bonusHandler.MyOverview)
			r.Get("/me/bonuses/transactions", bonusHandler.MyTransactions)
			r.Post("/me/bonuses/convert", bonusHandler.Convert)
			r.Get("/me/one-on-one", bonusHandler.MyOneOnOneList)
			r.Post("/me/one-on-one", bonusHandler.CreateOneOnOne)

			// Achievements
			r.Get("/achievements", achHandler.List)
			r.Get("/me/achievements", achHandler.MyProgress)
			r.Get("/users/{id}/achievements", achHandler.UserAchievements)

			// Interviews
			r.Get("/me/interviews", interviewsHandler.MyList)
			r.Post("/me/interviews/real", interviewsHandler.AddReal)
			r.Get("/interviews/catalog", interviewsHandler.Catalog)
			r.Get("/users/{studentID}/interviews", interviewsHandler.StudentInterviews)
			r.Patch("/interviews/{id}", interviewsHandler.Update)
			r.Delete("/interviews/{id}", interviewsHandler.Delete)

			// Buddy actions on interviews
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(models.RoleBuddy, models.RoleAdmin))
				r.Post("/interviews/mock", interviewsHandler.BuddyCreateMock)
				r.Post("/interviews/{id}/complete", interviewsHandler.BuddyCompleteMock)
			})

			// Final checks
			r.Get("/me/finals", finalsHandler.MyList)
			r.Get("/users/{studentID}/finals", finalsHandler.StudentList)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(models.RoleBuddy, models.RoleAdmin))
				r.Post("/finals/schedule", finalsHandler.Schedule)
				r.Post("/finals/complete", finalsHandler.Complete)
			})

			// Calendar
			r.Get("/me/calendar", calendarHandler.MyEvents)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(models.RoleBuddy, models.RoleAdmin))
				r.Post("/calendar/events", calendarHandler.Create)
				r.Patch("/calendar/events/{id}", calendarHandler.Update)
				r.Delete("/calendar/events/{id}", calendarHandler.Delete)
			})

			// Buddy: my students
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(models.RoleBuddy, models.RoleAdmin))
				r.Get("/buddy/students", usersHandler.BuddyMyStudents)
			})

			// Activity & notifications
			r.Get("/users/{studentID}/activity", activityHandler.StudentActivity)
			r.Get("/me/notifications", activityHandler.MyNotifications)
			r.Post("/me/notifications/read", activityHandler.MarkRead)

			// Admin only
			r.Route("/admin", func(r chi.Router) {
				r.Use(middleware.RequireRole(models.RoleAdmin))

				r.Get("/stats", adminStatsHandler.Get)

				r.Route("/users", func(r chi.Router) {
					r.Get("/", usersHandler.AdminList)
					r.Post("/", usersHandler.AdminCreate)
					r.Get("/{id}", usersHandler.AdminGet)
					r.Patch("/{id}", usersHandler.AdminUpdate)
					r.Delete("/{id}", usersHandler.AdminDelete)
					r.Post("/{id}/restore", usersHandler.AdminRestore)
					r.Post("/{id}/reset-password", usersHandler.AdminResetPassword)
					r.Post("/{id}/assign-buddy", usersHandler.AdminAssignBuddy)
					r.Delete("/{id}/assign-buddy", usersHandler.AdminUnassignBuddy)
				})

				r.Route("/roadmap", func(r chi.Router) {
					r.Post("/blocks", roadmapHandler.AdminCreateBlock)
					r.Patch("/blocks/{id}", roadmapHandler.AdminUpdateBlock)
					r.Delete("/blocks/{id}", roadmapHandler.AdminDeleteBlock)
					r.Post("/blocks/reorder", roadmapHandler.AdminReorderBlocks)

					r.Post("/materials", roadmapHandler.AdminCreateMaterial)
					r.Patch("/materials/{id}", roadmapHandler.AdminUpdateMaterial)
					r.Delete("/materials/{id}", roadmapHandler.AdminDeleteMaterial)
					r.Post("/materials/reorder", roadmapHandler.AdminReorderMaterials)
					r.Post("/materials/fetch-preview", roadmapHandler.AdminFetchPreview)
				})

				r.Route("/one-on-one", func(r chi.Router) {
					r.Get("/", bonusHandler.AdminListOneOnOne)
					r.Post("/{id}/approve", bonusHandler.AdminApproveOneOnOne)
					r.Post("/{id}/reject", bonusHandler.AdminRejectOneOnOne)
					r.Post("/{id}/complete", bonusHandler.AdminCompleteOneOnOne)
					r.Post("/{id}/cancel", bonusHandler.AdminCancelOneOnOne)
				})

				r.Post("/bonuses/adjust", bonusHandler.AdminManualAdjust)

				r.Route("/achievements", func(r chi.Router) {
					r.Post("/", achHandler.AdminCreate)
					r.Patch("/{id}", achHandler.AdminUpdate)
					r.Get("/{id}/users", achHandler.AdminListUsers)
				})
			})
		})
	})

	return r
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

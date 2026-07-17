package gateway

import (
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/middleware"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func NewRouter(handler *Handler, jwt *jwtpkg.TokenManager, logger *zap.Logger, db *ent.Client) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(middleware.Logger(logger))
	r.Use(middleware.CORS())
	r.Use(middleware.RateLimiter())
	r.Use(gin.Recovery())

	r.GET("/health", handler.HealthCheck)
	r.GET("/", handler.Root)

	r.GET("/.well-known/openid-configuration", handler.OIDCConfig)
	r.GET("/.well-known/jwks.json", handler.JWKSHandler)

	r.GET("/oauth/authorize", middleware.JWTAuthOptional(jwt), handler.OAuthAuthorize)
	r.POST("/oauth/token", handler.OAuthToken)
	r.GET("/userinfo", handler.OAuthUserInfo)
	r.POST("/userinfo", handler.OAuthUserInfo)
	r.POST("/oauth/introspect", handler.OAuthIntrospect)
	r.POST("/oauth/revoke", handler.OAuthRevoke)

	auth := r.Group("/api/auth")
	{
	auth.POST("/register", handler.Register)
	auth.POST("/login", handler.Login)
	auth.POST("/logout", handler.Logout)
	auth.POST("/mfa/validate", handler.ValidateMFA)
	auth.POST("/oauth/login", handler.OAuthLogin)
	auth.POST("/oauth/register", handler.OAuthRegister)
	auth.POST("/verify-email", handler.VerifyEmail)
	auth.POST("/resend-verification", handler.ResendVerification)
	auth.POST("/forgot-password", handler.ForgotPassword)
	auth.POST("/reset-password", handler.ResetPassword)
	}

	protected := r.Group("/api")
	protected.Use(middleware.JWTAuth(jwt))
	{
		// User routes (accessible by USER and DEVELOPER)
		userRoutes := protected.Group("/user")
		userRoutes.Use(middleware.RequireRole(db, "USER", "DEVELOPER"))
		{
			// Profile
			userRoutes.GET("/profile", handler.GetProfile)
			userRoutes.PUT("/profile", handler.UpdateProfile)
			userRoutes.PUT("/password", handler.ChangePassword)

			// MFA
			userRoutes.POST("/mfa/enable", handler.EnableMFA)
			userRoutes.POST("/mfa/disable", handler.DisableMFA)
			userRoutes.POST("/mfa/backup-codes", handler.GenerateBackupCodes)
			userRoutes.GET("/mfa/backup-codes/status", handler.GetBackupCodesStatus)

			// Sessions
			userRoutes.GET("/sessions", handler.ListSessions)
			userRoutes.DELETE("/sessions/:id", handler.RevokeSession)

			// Devices
			userRoutes.GET("/devices", handler.ListDevices)
			userRoutes.DELETE("/devices/:id", handler.DeleteDevice)
			userRoutes.POST("/devices/logout-all", handler.LogoutAllDevices)

			// Emails
			userRoutes.GET("/emails", handler.ListEmails)
			userRoutes.POST("/emails", handler.AddEmail)
			userRoutes.PUT("/emails/:id/primary", handler.SetPrimaryEmail)
			userRoutes.DELETE("/emails/:id", handler.DeleteEmail)
			userRoutes.POST("/emails/:id/verify", handler.VerifyUserEmail)

			// Phones
			userRoutes.POST("/phone/bind", handler.BindPhone)
			userRoutes.POST("/phone/verify", handler.VerifyPhone)
			userRoutes.POST("/phone/unbind", handler.UnbindPhone)

			// Login Activity
			userRoutes.GET("/login-activity", handler.ListLoginActivity)

			// Personal Tokens
			userRoutes.POST("/tokens", handler.CreatePersonalToken)
			userRoutes.GET("/tokens", handler.ListPersonalTokens)
			userRoutes.DELETE("/tokens/:id", handler.DeletePersonalToken)

			// Authorized Apps
			userRoutes.GET("/authorized-apps", handler.ListAuthorizedApps)
			userRoutes.DELETE("/authorized-apps/:clientId", handler.RevokeAppAuth)
		}

		// OAuth Apps (developer only)
		appRoutes := protected.Group("/apps")
		appRoutes.Use(middleware.RequireRole(db, "DEVELOPER"))
		{
			appRoutes.POST("", handler.CreateOAuthApp)
			appRoutes.GET("", handler.ListOAuthApps)
			appRoutes.GET("/:id", handler.GetOAuthApp)
			appRoutes.PUT("/:id", handler.UpdateOAuthApp)
			appRoutes.DELETE("/:id", handler.DeleteOAuthApp)
			appRoutes.POST("/:id/rotate-secret", handler.RotateClientSecret)
		}

		// Webhooks (developer only)
		webhookRoutes := protected.Group("/webhooks")
		webhookRoutes.Use(middleware.RequireRole(db, "DEVELOPER"))
		{
			webhookRoutes.POST("", handler.CreateWebhook)
			webhookRoutes.GET("", handler.ListWebhooks)
			webhookRoutes.DELETE("/:id", handler.DeleteWebhook)
		}

		// Get current user info (any authenticated user)
		protected.GET("/me", handler.GetMe)
	}

	// Admin login (no auth required)
	r.POST("/api/admin/login", handler.AdminLogin)

	admin := r.Group("/api/admin")
	admin.Use(middleware.AdminJWTAuth(jwt))
	{
		// Dashboard
		admin.GET("/dashboard", handler.AdminDashboard)

		// Users
		admin.GET("/users", handler.AdminListUsers)
		admin.GET("/users/:id", handler.AdminGetUser)
		admin.POST("/users/:id/toggle-status", handler.AdminToggleUserStatus)
		admin.DELETE("/users/:id", handler.AdminDeleteUser)
		admin.POST("/users/:id/force-logout", handler.AdminForceLogout)
		admin.POST("/users/:id/reset-password", handler.AdminResetUserPassword)

		// OAuth Apps
		admin.GET("/apps", handler.AdminListApps)
		admin.POST("/apps/:id/approve", handler.AdminApproveApp)
		admin.POST("/apps/:id/reject", handler.AdminRejectApp)

		// Scopes
		admin.GET("/scopes", handler.AdminListScopes)
		admin.POST("/scopes", handler.AdminCreateScope)
		admin.DELETE("/scopes/:id", handler.AdminDeleteScope)

		// Tokens
		admin.GET("/tokens", handler.AdminListTokens)
		admin.POST("/tokens/:id/revoke", handler.AdminRevokeToken)

		// Sessions
		admin.GET("/sessions", handler.AdminListAllSessions)
		admin.DELETE("/sessions/:id", handler.AdminDeleteSession)

		// Audit Logs
		admin.GET("/audit-logs", handler.AdminAuditLogs)
		admin.GET("/audit-logs/search", handler.AdminSearchAuditLogs)

		// Organizations
		admin.GET("/organizations", handler.AdminListOrganizations)
		admin.POST("/organizations", handler.AdminCreateOrganization)
		admin.GET("/organizations/:id", handler.AdminGetOrganization)
		admin.PUT("/organizations/:id", handler.AdminUpdateOrganization)
		admin.DELETE("/organizations/:id", handler.AdminDeleteOrganization)
		admin.GET("/organizations/:id/members", handler.AdminListOrgMembers)
		admin.POST("/organizations/:id/members", handler.AdminAddOrgMember)
		admin.DELETE("/organizations/:id/members/:userId", handler.AdminRemoveOrgMember)

		// RBAC
		admin.GET("/roles", handler.AdminListRoles)
		admin.POST("/roles", handler.AdminCreateRole)
		admin.DELETE("/roles/:id", handler.AdminDeleteRole)
		admin.GET("/roles/:id/permissions", handler.AdminGetRolePermissions)
		admin.POST("/roles/:id/permissions", handler.AdminAssignPermissions)
		admin.GET("/permissions", handler.AdminListPermissions)
		admin.POST("/permissions", handler.AdminCreatePermission)
		admin.DELETE("/permissions/:id", handler.AdminDeletePermission)

		// Security
		admin.GET("/security/login-failures", handler.AdminListLoginFailures)
		admin.GET("/security/ip-rules", handler.AdminListIPRules)
		admin.POST("/security/ip-rules", handler.AdminCreateIPRule)
		admin.DELETE("/security/ip-rules/:id", handler.AdminDeleteIPRule)

		// System Settings
		admin.GET("/settings", handler.AdminGetSystemConfig)
		admin.PUT("/settings", handler.AdminSetSystemConfig)
		admin.DELETE("/settings/:key", handler.AdminDeleteSystemConfig)

		// Health
		admin.GET("/health", handler.AdminServiceHealth)
	}

	return r
}

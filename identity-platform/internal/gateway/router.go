package gateway

import (
	"github.com/identity-platform/internal/middleware"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func NewRouter(handler *Handler, jwt *jwtpkg.TokenManager, logger *zap.Logger) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(middleware.Logger(logger))
	r.Use(middleware.CORS())
	r.Use(middleware.RateLimiter())
	r.Use(gin.Recovery())

	r.GET("/health", handler.HealthCheck)

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
		auth.POST("/verify-email", handler.VerifyEmail)
		auth.POST("/resend-verification", handler.ResendVerification)
		auth.POST("/forgot-password", handler.ForgotPassword)
		auth.POST("/reset-password", handler.ResetPassword)
	}

	protected := r.Group("/api")
	protected.Use(middleware.JWTAuth(jwt))
	{
		protected.GET("/user/profile", handler.GetProfile)
		protected.POST("/user/mfa/enable", handler.EnableMFA)
		protected.POST("/user/mfa/disable", handler.DisableMFA)
		protected.GET("/user/sessions", handler.ListSessions)
		protected.DELETE("/user/sessions/:id", handler.RevokeSession)
		protected.POST("/apps", handler.CreateOAuthApp)
		protected.GET("/apps", handler.ListOAuthApps)
		protected.GET("/user/authorized-apps", handler.ListAuthorizedApps)
		protected.DELETE("/user/authorized-apps/:clientId", handler.RevokeAppAuth)
	}

	return r
}

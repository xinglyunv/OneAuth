package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/userrole"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	"go.uber.org/zap"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		logger.Info("request",
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", latency),
			zap.String("ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
		)
	}
}

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

func JWTAuth(jwt *jwtpkg.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			c.Abort()
			return
		}

		claims, err := jwt.VerifyToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("subject", claims.Subject)
		c.Set("scope", claims.Scope)
		c.Next()
	}
}

func AdminJWTAuth(jwt *jwtpkg.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			c.Abort()
			return
		}

		claims, err := jwt.VerifyToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		if claims.Scope != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "not an admin"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("subject", claims.Subject)
		c.Set("scope", claims.Scope)
		c.Next()
	}
}

func JWTAuthOptional(jwt *jwtpkg.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.Next()
			return
		}

		claims, err := jwt.VerifyToken(parts[1])
		if err != nil {
			c.Next()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("subject", claims.Subject)
		c.Next()
	}
}

func RequireRole(db *ent.Client, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		uid, err := uuid.Parse(raw.(string))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
			c.Abort()
			return
		}

		urs, err := db.UserRole.Query().
			Where(userrole.UserID(uid)).
			WithRole().
			All(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			c.Abort()
			return
		}

		roleNames := make(map[string]bool)
		for _, ur := range urs {
			roleNames[ur.Edges.Role.Name] = true
		}

		for _, allowed := range allowedRoles {
			if roleNames[allowed] {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		c.Abort()
	}
}

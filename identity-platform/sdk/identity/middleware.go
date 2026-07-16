package identity

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type UserInfo map[string]interface{}

func AuthMiddleware(jwksURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or invalid authorization header"})
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		verifier, err := NewTokenVerifier(jwksURL)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to initialize token verifier"})
			return
		}
		claims, err := verifier.Verify(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token: " + err.Error()})
			return
		}
		c.Set("user_id", claims["sub"])
		c.Set("token_claims", claims)
		c.Next()
	}
}

func RequireScope(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, exists := c.Get("token_claims")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "no token claims"})
			return
		}
		scopeClaim, ok := claims.(map[string]interface{})["scope"]
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "no scope claim"})
			return
		}
		scopes := strings.Fields(scopeClaim.(string))
		hasScope := false
		for _, s := range scopes {
			if s == scope {
				hasScope = true
				break
			}
		}
		if !hasScope {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient scope: " + scope})
			return
		}
		c.Next()
	}
}

func GetUserID(c *gin.Context) string {
	uid, _ := c.Get("user_id")
	if uid == nil {
		return ""
	}
	return uid.(string)
}

func GetClaims(c *gin.Context) map[string]interface{} {
	claims, _ := c.Get("token_claims")
	if claims == nil {
		return nil
	}
	return claims.(map[string]interface{})
}
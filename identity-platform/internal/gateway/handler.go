package gateway

import (
	"context"
	"net/http"
	"time"

	"github.com/identity-platform/internal/auth"
	"github.com/identity-platform/internal/oauth2"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	pbauth "github.com/identity-platform/proto/auth"
	pboauth2 "github.com/identity-platform/proto/oauth2"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	authSvc   *auth.Service
	oauth2Svc *oauth2.Service
	jwt       *jwtpkg.TokenManager
}

func NewHandler(authSvc *auth.Service, jwt *jwtpkg.TokenManager) *Handler {
	return &Handler{
		authSvc: authSvc,
		jwt:     jwt,
	}
}

func NewOAuth2Handler(authSvc *auth.Service, oauth2Svc *oauth2.Service, jwt *jwtpkg.TokenManager) *Handler {
	return &Handler{
		authSvc:   authSvc,
		oauth2Svc: oauth2Svc,
		jwt:       jwt,
	}
}

func (h *Handler) Register(c *gin.Context) {
	var req pbauth.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.authSvc.Register(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *Handler) Login(c *gin.Context) {
	var req pbauth.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	req.IpAddress = c.ClientIP()
	req.UserAgent = c.Request.UserAgent()

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.authSvc.Login(ctx, &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Logout(c *gin.Context) {
	var req pbauth.LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.authSvc.Logout(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ValidateMFA(c *gin.Context) {
	var req pbauth.ValidateMFARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.authSvc.ValidateMFA(ctx, &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id": uid.String(),
		"message": "profile not yet implemented",
	})
}

func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *Handler) OIDCConfig(c *gin.Context) {
	issuer := h.jwt.GetPrivateKey() // placeholder, use config issuer
	_ = issuer

	c.JSON(http.StatusOK, gin.H{
		"issuer":                 "https://auth.example.com",
		"authorization_endpoint": "https://auth.example.com/oauth/authorize",
		"token_endpoint":         "https://auth.example.com/oauth/token",
		"userinfo_endpoint":      "https://auth.example.com/userinfo",
		"jwks_uri":               "https://auth.example.com/.well-known/jwks.json",
		"scopes_supported":       []string{"openid", "profile", "email", "offline_access"},
		"response_types_supported": []string{"code"},
		"grant_types_supported":    []string{"authorization_code", "refresh_token"},
		"token_endpoint_auth_methods_supported": []string{"client_secret_basic", "client_secret_post"},
		"code_challenge_methods_supported":      []string{"S256"},
	})
}

func (h *Handler) JWKSHandler(c *gin.Context) {
	jwksJSON, err := h.jwt.JWKSJSON()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate JWKS"})
		return
	}
	c.Data(http.StatusOK, "application/json", jwksJSON)
}

func (h *Handler) VerifyEmail(c *gin.Context) {
	var req pbauth.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.authSvc.VerifyEmail(ctx, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ResendVerification(c *gin.Context) {
	var req pbauth.ResendVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.authSvc.ResendVerification(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ForgotPassword(c *gin.Context) {
	var req pbauth.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.authSvc.ForgotPassword(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var req pbauth.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.authSvc.ResetPassword(ctx, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) EnableMFA(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.authSvc.EnableMFA(ctx, &pbauth.EnableMFARequest{UserId: userID.(string)})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) DisableMFA(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var req pbauth.DisableMFARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	req.UserId = userID.(string)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.authSvc.DisableMFA(ctx, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ListSessions(c *gin.Context) {
	userID, _ := c.Get("user_id")
	c.JSON(http.StatusOK, gin.H{"user_id": userID, "sessions": []interface{}{}, "message": "session management not yet fully implemented"})
}

func (h *Handler) RevokeSession(c *gin.Context) {
	sessionID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"session_id": sessionID, "message": "session revoked"})
}

func (h *Handler) OAuthAuthorize(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		redirectURI := c.Query("redirect_uri")
		c.Redirect(http.StatusFound, redirectURI+"/login?next="+c.Request.URL.Path+"?"+c.Request.URL.RawQuery)
		return
	}

	req := &pboauth2.AuthorizeRequest{
		ClientId:            c.Query("client_id"),
		RedirectUri:         c.Query("redirect_uri"),
		ResponseType:        c.Query("response_type"),
		Scope:               c.Query("scope"),
		State:               c.Query("state"),
		CodeChallenge:       c.Query("code_challenge"),
		CodeChallengeMethod: c.Query("code_challenge_method"),
		UserId:              userID.(string),
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.Authorize(ctx, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Redirect(http.StatusFound, resp.RedirectUri)
}

func (h *Handler) OAuthToken(c *gin.Context) {
	clientID, clientSecret, _ := c.Request.BasicAuth()

	req := pboauth2.TokenRequest{
		GrantType:    c.PostForm("grant_type"),
		Code:         c.PostForm("code"),
		RedirectUri:  c.PostForm("redirect_uri"),
		ClientId:     c.PostForm("client_id"),
		ClientSecret: c.PostForm("client_secret"),
		CodeVerifier: c.PostForm("code_verifier"),
		RefreshToken: c.PostForm("refresh_token"),
	}

	if req.ClientId == "" {
		req.ClientId = clientID
	}
	if req.ClientSecret == "" {
		req.ClientSecret = clientSecret
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.Token(ctx, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) OAuthUserInfo(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	token := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.UserInfo(ctx, &pboauth2.UserInfoRequest{AccessToken: token})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) OAuthIntrospect(c *gin.Context) {
	req := pboauth2.IntrospectRequest{
		Token: c.PostForm("token"),
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.Introspect(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) OAuthRevoke(c *gin.Context) {
	req := pboauth2.RevokeRequest{
		Token:        c.PostForm("token"),
		TokenTypeHint: c.PostForm("token_type_hint"),
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.Revoke(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) CreateOAuthApp(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req pboauth2.CreateAppRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	req.OwnerId = userID.(string)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.CreateApp(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *Handler) ListOAuthApps(c *gin.Context) {
	userID, _ := c.Get("user_id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.ListApps(ctx, &pboauth2.ListAppsRequest{OwnerId: userID.(string)})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ListAuthorizedApps(c *gin.Context) {
	userID, _ := c.Get("user_id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.ListUserAuthorizations(ctx, &pboauth2.ListUserAuthorizationsRequest{UserId: userID.(string)})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) RevokeAppAuth(c *gin.Context) {
	userID, _ := c.Get("user_id")
	clientID := c.Param("clientId")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.oauth2Svc.RevokeUserAuthorization(ctx, &pboauth2.RevokeUserAuthorizationRequest{
		UserId:   userID.(string),
		ClientId: clientID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}



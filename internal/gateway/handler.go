package gateway

import (
	"context"
	"net/http"
	"strings"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/identity-platform/config"
	"github.com/identity-platform/internal/auth"
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/passwordcredential"
	"github.com/identity-platform/internal/ent/user"
	"github.com/identity-platform/internal/ent/userprofile"
	"github.com/identity-platform/internal/oauth2"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	"github.com/identity-platform/internal/pkg/crypto"
	pbauth "github.com/identity-platform/proto/auth"
	pboauth2 "github.com/identity-platform/proto/oauth2"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	authSvc        *auth.Service
	oauth2Svc      *oauth2.Service
	jwt            *jwtpkg.TokenManager
	authClient     *ent.Client
	adminCfg       config.AdminConfig
	backupCodes    *auth.BackupCodeManager
	deviceMgr      *auth.DeviceManager
	emailMgr       *auth.EmailManager
	phoneMgr       *auth.PhoneManager
	patSvc         *auth.PersonalTokenService
	secSvc         *auth.SecurityService
	cfgSvc         *auth.SystemConfigService
	orgSvc         *auth.OrganizationService
	rbacSvc        *auth.RBACService
	webhookSvc     *auth.WebhookService
	loginActivity  *auth.LoginActivityService
}

func NewHandler(authSvc *auth.Service, jwt *jwtpkg.TokenManager, client *ent.Client, adminCfg config.AdminConfig) *Handler {
	return &Handler{
		authSvc:       authSvc,
		jwt:           jwt,
		authClient:    client,
		adminCfg:      adminCfg,
		backupCodes:   auth.NewBackupCodeManager(client),
		deviceMgr:     auth.NewDeviceManager(client),
		emailMgr:      auth.NewEmailManager(client),
		phoneMgr:      auth.NewPhoneManager(client),
		patSvc:        auth.NewPersonalTokenService(client),
		secSvc:        auth.NewSecurityService(client),
		cfgSvc:        auth.NewSystemConfigService(client),
		orgSvc:        auth.NewOrganizationService(client),
		rbacSvc:       auth.NewRBACService(client),
		webhookSvc:    auth.NewWebhookService(client),
		loginActivity: auth.NewLoginActivityService(client),
	}
}

func NewOAuth2Handler(authSvc *auth.Service, oauth2Svc *oauth2.Service, jwt *jwtpkg.TokenManager, client *ent.Client, adminCfg config.AdminConfig) *Handler {
	return &Handler{
		authSvc:       authSvc,
		oauth2Svc:     oauth2Svc,
		jwt:           jwt,
		authClient:    client,
		adminCfg:      adminCfg,
		backupCodes:   auth.NewBackupCodeManager(client),
		deviceMgr:     auth.NewDeviceManager(client),
		emailMgr:      auth.NewEmailManager(client),
		phoneMgr:      auth.NewPhoneManager(client),
		patSvc:        auth.NewPersonalTokenService(client),
		secSvc:        auth.NewSecurityService(client),
		cfgSvc:        auth.NewSystemConfigService(client),
		orgSvc:        auth.NewOrganizationService(client),
		rbacSvc:       auth.NewRBACService(client),
		webhookSvc:    auth.NewWebhookService(client),
		loginActivity: auth.NewLoginActivityService(client),
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

func (h *Handler) OAuthLogin(c *gin.Context) {
	var req pbauth.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	u, err := h.authClient.User.Query().Where(user.EmailEQ(req.Email)).Only(ctx)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	roles, _ := h.authSvc.GetUserRoles(ctx, u.ID)
	for _, r := range roles {
		if r == "DEVELOPER" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Developer accounts cannot login through OAuth"})
			return
		}
		if r == "ADMIN" || r == "SUPER_ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Administrator accounts cannot login through OAuth"})
			return
		}
	}

	resp, err := h.authSvc.Login(ctx, &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) OAuthRegister(c *gin.Context) {
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

func (h *Handler) GetMe(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	uid, _ := uuid.Parse(userID.(string))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.authClient.User.Query().
		Where(sql.FieldEQ("id", uid)).
		WithProfile().
		First(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	profile := map[string]string{}
	if user.Edges.Profile != nil {
		profile["display_name"] = user.Edges.Profile.DisplayName
		profile["avatar_url"] = user.Edges.Profile.AvatarURL
		profile["locale"] = user.Edges.Profile.Locale
		profile["timezone"] = user.Edges.Profile.Timezone
	}

	roles, _ := h.authSvc.GetUserRoles(ctx, uid)
	primaryRole := "user"
	if len(roles) > 0 {
		primaryRole = roles[0]
	}

	appsResp, _ := h.oauth2Svc.ListApps(ctx, &pboauth2.ListAppsRequest{OwnerId: userID.(string)})
	appCount := 0
	if appsResp != nil {
		appCount = len(appsResp.Apps)
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":    user.ID.String(),
		"email":      user.Email,
		"username":   user.Username,
		"status":     string(user.Status),
		"role":       primaryRole,
		"roles":      roles,
		"app_count":  appCount,
		"created_at": user.CreatedAt.Format(time.RFC3339),
		"profile":    profile,
	})
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.authClient.User.Query().
		Where(user.IDEQ(uid)).
		WithProfile().
		Only(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	profile := gin.H{}
	if u.Edges.Profile != nil {
		profile = gin.H{
			"display_name": u.Edges.Profile.DisplayName,
			"avatar_url":   u.Edges.Profile.AvatarURL,
			"locale":       u.Edges.Profile.Locale,
			"timezone":     u.Edges.Profile.Timezone,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":        uid.String(),
		"email":          u.Email,
		"username":       u.Username,
		"email_verified": u.EmailVerified,
		"mfa_enabled":    u.MfaEnabled,
		"status":         string(u.Status),
		"profile":        profile,
		"created_at":     u.CreatedAt.Format(time.RFC3339),
	})
}

func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().UTC().Format(time.RFC3339)})
}

func (h *Handler) Root(c *gin.Context) {
	scheme := "https"
	if c.Request.TLS == nil {
		scheme = "http"
	}
	host := c.Request.Host

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OneAuth - 统一身份认证平台</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f7fa;color:#1a1a1a;line-height:1.6}
.hero{background:linear-gradient(135deg,#1677ff 0%,#0958d9 100%);color:#fff;padding:48px 24px;text-align:center}
.hero h1{font-size:36px;margin-bottom:8px;letter-spacing:-0.5px}
.hero p{font-size:16px;opacity:.85;max-width:600px;margin:0 auto}
.container{max-width:1100px;margin:0 auto;padding:32px 24px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:40px}
.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.08);transition:box-shadow .2s}
.card:hover{box-shadow:0 4px 12px rgba(0,0,0,.12)}
.card h3{font-size:16px;margin-bottom:12px;color:#1677ff}
.card p{font-size:14px;color:#666;margin-bottom:16px}
.card .badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:4px;margin-right:4px}
.badge-green{background:#e6f7e6;color:#389e0d}
.badge-blue{background:#e6f4ff;color:#1677ff}
.badge-orange{background:#fff7e6;color:#d46b08}
.badge-purple{background:#f9f0ff;color:#722ed1}
.section-title{font-size:20px;margin:32px 0 16px;color:#1a1a1a}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #f0f0f0;font-size:13px}
th{background:#fafafa;font-weight:600;color:#555}
code{background:#f0f0f0;padding:1px 5px;border-radius:3px;font-size:12px;color:#d63384}
pre{background:#1a1a2e;color:#e0e0e0;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.5}
pre .c{color:#6a9955}
.btn{display:inline-block;padding:8px 20px;border-radius:6px;font-size:14px;text-decoration:none;font-weight:500;transition:opacity .2s}
.btn:hover{opacity:.85}
.btn-primary{background:#1677ff;color:#fff}
.btn-outline{background:transparent;border:1px solid #fff;color:#fff}
.footer{text-align:center;padding:24px;color:#999;font-size:13px}
</style>
</head>
<body>
<div class="hero">
<h1>OneAuth</h1>
<p>统一身份认证平台 &middot; OAuth 2.1 + OpenID Connect &middot; 单点登录 &middot; 多因素认证</p>
<div style="margin-top:20px">
<a class="btn btn-outline" href="`+scheme+`://`+host+`/login" target="_blank">登录门户</a>
</div>
</div>
<div class="container">

<h2 class="section-title">前端控制台</h2>
<div class="cards">
<div class="card"><h3>登录门户</h3><p>用户登录、注册、OAuth 授权</p><div><span class="badge badge-blue">Next.js 15</span></div></div>
<div class="card"><h3>账户中心</h3><p>个人资料、MFA、会话管理、已授权应用</p><div><span class="badge badge-blue">Next.js 15</span></div></div>
<div class="card"><h3>开发者控制台</h3><p>OAuth 应用管理、SDK 文档</p><div><span class="badge badge-blue">Next.js 15</span></div></div>
<div class="card"><h3>管理控制台</h3><p>用户管理、应用审核、审计日志</p><div><span class="badge badge-blue">Next.js 15</span></div></div>
</div>

<h2 class="section-title">技术栈</h2>
<div class="cards">
<div class="card"><h3>Go 后端</h3><p>Gin + gRPC + Ent ORM + Argon2id + JWT RS256</p><div><span class="badge badge-green">Go 1.24</span><span class="badge badge-green">PostgreSQL 16</span><span class="badge badge-green">Redis 7</span></div></div>
<div class="card"><h3>Go SDK</h3><p>OAuth 2.1 客户端、Gin 中间件、JWKS 令牌验证</p><div><span class="badge badge-purple">Go</span></div></div>
<div class="card"><h3>前端</h3><p>Next.js 15 + TypeScript + TailwindCSS + shadcn/ui</p><div><span class="badge badge-orange">TypeScript</span><span class="badge badge-orange">TanStack Query</span><span class="badge badge-orange">Zustand</span></div></div>
</div>

<h2 class="section-title">API 端点</h2>
<table>
<tr><th>方法</th><th>路径</th><th>说明</th></tr>
<tr><td>GET</td><td><code>/health</code></td><td>健康检查</td></tr>
<tr><td>GET</td><td><code>/.well-known/openid-configuration</code></td><td>OIDC Discovery</td></tr>
<tr><td>GET</td><td><code>/.well-known/jwks.json</code></td><td>JWKS 公钥</td></tr>
<tr><td>POST</td><td><code>/api/auth/register</code></td><td>用户注册</td></tr>
<tr><td>POST</td><td><code>/api/auth/login</code></td><td>用户登录 <span style="color:#999">(含 MFA)</span></td></tr>
<tr><td>POST</td><td><code>/api/auth/logout</code></td><td>用户登出</td></tr>
<tr><td>POST</td><td><code>/api/auth/mfa/validate</code></td><td>MFA 验证</td></tr>
<tr><td>GET</td><td><code>/api/auth/verify-email</code></td><td>邮箱验证</td></tr>
<tr><td>POST</td><td><code>/api/auth/forgot-password</code></td><td>忘记密码</td></tr>
<tr><td>POST</td><td><code>/api/auth/reset-password</code></td><td>重置密码</td></tr>
<tr><td>GET</td><td><code>/oauth/authorize</code></td><td>OAuth 授权 <span style="color:#999">(PKCE)</span></td></tr>
<tr><td>POST</td><td><code>/oauth/token</code></td><td>Token 交换 / 刷新 / 撤销</td></tr>
<tr><td>GET/POST</td><td><code>/userinfo</code></td><td>用户信息 (OIDC)</td></tr>
<tr><td>POST</td><td><code>/oauth/introspect</code></td><td>Token introspection <span style="color:#999">(RFC 7662)</span></td></tr>
<tr><td>POST</td><td><code>/oauth/revoke</code></td><td>Token 撤销 <span style="color:#999">(RFC 7009)</span></td></tr>
</table>
<p style="margin-top:8px;font-size:13px;color:#999">标注"需认证"的端点需要在 Header 中携带 <code>Authorization: Bearer &lt;access_token&gt;</code></p>

<h2 class="section-title">快速测试</h2>
<pre># 注册
curl -X POST `+scheme+`://`+host+`/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","username":"test","password":"Pass1234!"}'

# 登录
curl -X POST `+scheme+`://`+host+`/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Pass1234!"}'

# OIDC Discovery
curl `+scheme+`://`+host+`/.well-known/openid-configuration</pre>

</div>
<div class="footer">OneAuth &middot; 统一身份认证平台 &middot; MIT License</div>
</body>
</html>`)
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
	uid, _ := uuid.Parse(userID.(string))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	sessions, err := h.authClient.Session.Query().
		Where(sql.FieldEQ("user_id", uid)).
		WithDevice().
		Order(ent.Desc("last_active_at")).
		All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type sessionItem struct {
		SessionID  string `json:"session_id"`
		DeviceName string `json:"device_name,omitempty"`
		Os         string `json:"os,omitempty"`
		Browser    string `json:"browser,omitempty"`
		IPAddress  string `json:"ip_address,omitempty"`
		IsCurrent  bool   `json:"is_current"`
		CreatedAt  string `json:"created_at"`
	}

	items := make([]sessionItem, 0, len(sessions))
	for i, s := range sessions {
		devName, os, browser := parseUserAgent(s.UserAgent)
		if s.Edges.Device != nil {
			if s.Edges.Device.Name != "" {
				devName = s.Edges.Device.Name
			}
			if s.Edges.Device.Platform != "" {
				os = s.Edges.Device.Platform
			}
			if s.Edges.Device.Browser != "" {
				browser = s.Edges.Device.Browser
			}
		}
		items = append(items, sessionItem{
			SessionID:  s.ID.String(),
			DeviceName: devName,
			Os:         os,
			Browser:    browser,
			IPAddress:  s.IPAddress,
			IsCurrent:  i == 0,
			CreatedAt:  s.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{"sessions": items})
}

func parseUserAgent(ua string) (deviceName, os, browser string) {
	if ua == "" {
		return "", "", ""
	}
	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "iphone"):
		deviceName = "iPhone"
		os = "iOS"
	case strings.Contains(lower, "ipad"):
		deviceName = "iPad"
		os = "iPadOS"
	case strings.Contains(lower, "android"):
		deviceName = "Android Device"
		os = "Android"
	case strings.Contains(lower, "macintosh") || strings.Contains(lower, "mac os"):
		deviceName = "Mac"
		os = "macOS"
	case strings.Contains(lower, "windows"):
		deviceName = "PC"
		os = "Windows"
	case strings.Contains(lower, "linux"):
		deviceName = "Linux"
		os = "Linux"
	case strings.Contains(lower, "curl"):
		deviceName = "CLI"
		os = ""
	default:
		deviceName = ""
		os = ""
	}
	switch {
	case strings.Contains(lower, "chrome") && !strings.Contains(lower, "edg"):
		browser = "Chrome"
	case strings.Contains(lower, "safari") && !strings.Contains(lower, "chrome"):
		browser = "Safari"
	case strings.Contains(lower, "firefox"):
		browser = "Firefox"
	case strings.Contains(lower, "edg"):
		browser = "Edge"
	case strings.Contains(lower, "curl"):
		browser = "curl"
	default:
		browser = ""
	}
	return
}

func (h *Handler) RevokeSession(c *gin.Context) {
	userID, _ := c.Get("user_id")
	sessionID := c.Param("id")
	sid, err := uuid.Parse(sessionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	n, err := h.authClient.Session.Update().
		Where(
			sql.FieldEQ("id", sid),
			sql.FieldEQ("user_id", userID.(string)),
		).
		SetStatus("revoked").
		Save(ctx)
	if err != nil || n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "session revoked"})
}

func (h *Handler) OAuthAuthorize(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.Redirect(http.StatusFound, "/oauth/login?next="+c.Request.URL.Path+"?"+c.Request.URL.RawQuery)
		return
	}

	uid, _ := uuid.Parse(userID.(string))
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	roles, err := h.authSvc.GetUserRoles(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify user role"})
		return
	}

	isDeveloper := false
	isAdmin := false
	for _, r := range roles {
		if r == "DEVELOPER" {
			isDeveloper = true
		}
		if r == "ADMIN" || r == "SUPER_ADMIN" {
			isAdmin = true
		}
	}

	if isDeveloper {
		c.JSON(http.StatusForbidden, gin.H{"error": "Developer accounts cannot login through OAuth"})
		return
	}
	if isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Administrator accounts cannot login through OAuth"})
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

	ctx2, cancel2 := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel2()

	resp, err := h.oauth2Svc.Authorize(ctx2, req)
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

func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var body struct {
		DisplayName string `json:"display_name"`
		AvatarURL   string `json:"avatar_url"`
		Locale      string `json:"locale"`
		Timezone    string `json:"timezone"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	uid, _ := uuid.Parse(userID.(string))
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	profileID, err := h.authClient.UserProfile.Query().
		Where(userprofile.HasUserWith(user.IDEQ(uid))).
		OnlyID(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile not found"})
		return
	}

	update := h.authClient.UserProfile.UpdateOneID(profileID)
	if body.DisplayName != "" {
		update.SetDisplayName(body.DisplayName)
	}
	if body.AvatarURL != "" {
		update.SetAvatarURL(body.AvatarURL)
	}
	if body.Locale != "" {
		update.SetLocale(body.Locale)
	}
	if body.Timezone != "" {
		update.SetTimezone(body.Timezone)
	}
	_, err = update.Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (h *Handler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var body struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if len(body.NewPassword) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
		return
	}

	uid, _ := uuid.Parse(userID.(string))
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	cred, err := h.authClient.PasswordCredential.Query().
		Where(passwordcredential.HasUserWith(user.IDEQ(uid))).
		First(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no password credential found"})
		return
	}

	valid, err := crypto.VerifyPassword(body.OldPassword, cred.PasswordHash)
	if err != nil || !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid current password"})
		return
	}

	passwordHash, err := crypto.HashPassword(body.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = h.authClient.PasswordCredential.UpdateOneID(cred.ID).
		SetPasswordHash(passwordHash).
		Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "password changed"})
}

func (h *Handler) DeleteOAuthApp(c *gin.Context) {
	userID, _ := c.Get("user_id")
	appID := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	uid, _ := uuid.Parse(appID)

	app, err := h.authClient.OAuthClient.Get(ctx, uid)
	if err != nil {
		if ent.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if app.CreatedBy.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized to delete this app"})
		return
	}

	err = h.authClient.OAuthClient.DeleteOneID(uid).Exec(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "app deleted"})
}



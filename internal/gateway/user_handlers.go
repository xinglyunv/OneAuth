package gateway

import (
	"context"
	"net/http"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	cryptopkg "github.com/identity-platform/internal/pkg/crypto"
)

func getUserID(c *gin.Context) (uuid.UUID, bool) {
	raw, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, false
	}
	uid, err := uuid.Parse(raw.(string))
	if err != nil {
		return uuid.Nil, false
	}
	return uid, true
}

// =========================== Email Management ===========================

func (h *Handler) ListEmails(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	emails, err := h.emailMgr.List(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"emails": emails})
}

func (h *Handler) AddEmail(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var body struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	entry, err := h.emailMgr.AddEmail(ctx, uid, body.Email)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"email": entry})
}

func (h *Handler) SetPrimaryEmail(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	eid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.emailMgr.SetPrimary(ctx, uid, eid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "primary email updated"})
}

func (h *Handler) DeleteEmail(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	eid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.emailMgr.Delete(ctx, uid, eid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "email deleted"})
}

func (h *Handler) VerifyUserEmail(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var body struct {
		EmailID string `json:"email_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.EmailID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email_id"})
		return
	}
	eid, _ := uuid.Parse(body.EmailID)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.emailMgr.Verify(ctx, uid, eid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "email verified"})
}

// =========================== Phone Management ===========================

func (h *Handler) BindPhone(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var body struct {
		Phone string `json:"phone"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid phone"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	entry, err := h.phoneMgr.Bind(ctx, uid, body.Phone)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"phone": entry})
}

func (h *Handler) VerifyPhone(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.phoneMgr.Verify(ctx, uid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "phone verified"})
}

func (h *Handler) UnbindPhone(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.phoneMgr.Unbind(ctx, uid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "phone unbound"})
}

// =========================== Device Management ===========================

func (h *Handler) ListDevices(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	devices, err := h.deviceMgr.List(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type deviceItem struct {
		ID         string `json:"id"`
		Name       string `json:"name,omitempty"`
		Platform   string `json:"platform,omitempty"`
		Browser    string `json:"browser,omitempty"`
		IPAddress  string `json:"ip_address,omitempty"`
		LastActive string `json:"last_active"`
		CreatedAt  string `json:"created_at"`
	}
	items := make([]deviceItem, 0, len(devices))
	for _, d := range devices {
		items = append(items, deviceItem{
			ID:         d.ID.String(),
			Name:       d.Name,
			Platform:   d.Platform,
			Browser:    d.Browser,
			IPAddress:  d.LastIP,
			LastActive: d.LastSeenAt.Format(time.RFC3339),
			CreatedAt:  d.CreatedAt.Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, gin.H{"devices": items})
}

func (h *Handler) DeleteDevice(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	did, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.deviceMgr.Delete(ctx, uid, did); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "device removed"})
}

func (h *Handler) LogoutAllDevices(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	n, err := h.deviceMgr.LogoutAll(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "all devices logged out", "sessions_revoked": n})
}

// =========================== Login Activity ===========================

func (h *Handler) ListLoginActivity(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "20"), 20)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	logs, total, err := h.loginActivity.List(ctx, uid, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

// =========================== Personal Access Tokens ===========================

func (h *Handler) CreatePersonalToken(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var body struct {
		Name        string `json:"name"`
		Scopes      string `json:"scopes"`
		ExpiresIn   string `json:"expires_in"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	token, raw, err := h.patSvc.Create(ctx, uid, body.Name, body.Scopes, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"token":       token,
		"raw_token":   raw,
	})
}

func (h *Handler) ListPersonalTokens(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	tokens, err := h.patSvc.List(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tokens": tokens})
}

func (h *Handler) DeletePersonalToken(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	tid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid token id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.patSvc.Delete(ctx, uid, tid); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "token deleted"})
}

// =========================== MFA Backup Codes ===========================

func (h *Handler) GenerateBackupCodes(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	codes, err := h.backupCodes.Generate(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"backup_codes": codes, "message": "保存好这些备用码，每个仅可使用一次"})
}

func (h *Handler) GetBackupCodesStatus(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	remaining, _ := h.backupCodes.CountRemaining(ctx, uid)
	c.JSON(http.StatusOK, gin.H{"remaining": remaining})
}

// =========================== Webhook ===========================

func (h *Handler) CreateWebhook(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var body struct {
		URL        string `json:"url"`
		Secret     string `json:"secret"`
		EventTypes string `json:"event_types"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	hook, err := h.webhookSvc.Create(ctx, &uid, body.URL, body.Secret, body.EventTypes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"webhook": hook})
}

func (h *Handler) ListWebhooks(c *gin.Context) {
	uid, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	hooks, err := h.webhookSvc.List(ctx, &uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"webhooks": hooks})
}

func (h *Handler) DeleteWebhook(c *gin.Context) {
	hid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.webhookSvc.Delete(ctx, hid); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "webhook deleted"})
}



// =========================== OAuth App Management (developer) ===========================

func (h *Handler) GetOAuthApp(c *gin.Context) {
	appID := c.Param("id")
	aid, err := uuid.Parse(appID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid app id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	app, err := h.authClient.OAuthClient.Query().
		Where(sql.FieldEQ("id", aid)).
		WithRedirectUris().
		Only(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
		return
	}
	uris := make([]string, 0)
	for _, ru := range app.Edges.RedirectUris {
		uris = append(uris, ru.RedirectURI)
	}
	c.JSON(http.StatusOK, gin.H{"app": gin.H{
		"id":            app.ID.String(),
		"client_id":     app.ClientID,
		"name":          app.Name,
		"description":   app.Description,
		"client_type":   app.ClientType,
		"status":        app.Status,
		"redirect_uris": uris,
		"created_at":    app.CreatedAt.Format(time.RFC3339),
	}})
}

func (h *Handler) UpdateOAuthApp(c *gin.Context) {
	userID, _ := c.Get("user_id")
	appID := c.Param("id")
	aid, err := uuid.Parse(appID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid app id"})
		return
	}
	var body struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		RedirectURIs []string `json:"redirect_uris"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	app, err := h.authClient.OAuthClient.Get(ctx, aid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
		return
	}
	if app.CreatedBy.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}
	update := h.authClient.OAuthClient.UpdateOneID(aid)
	if body.Name != "" {
		update = update.SetName(body.Name)
	}
	if body.Description != "" {
		update = update.SetDescription(body.Description)
	}
	if _, err := update.Save(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(body.RedirectURIs) > 0 {
		h.authClient.OAuthRedirectURI.Delete().Where(sql.FieldEQ("client_id", aid)).Exec(ctx)
		for _, ru := range body.RedirectURIs {
			h.authClient.OAuthRedirectURI.Create().
				SetClientID(aid).
				SetRedirectURI(ru).
				Exec(ctx)
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "app updated"})
}

func (h *Handler) RotateClientSecret(c *gin.Context) {
	userID, _ := c.Get("user_id")
	appID := c.Param("id")
	aid, err := uuid.Parse(appID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid app id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	app, err := h.authClient.OAuthClient.Get(ctx, aid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
		return
	}
	if app.CreatedBy.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	newSecret := uuid.New().String()
	hash, _ := cryptopkg.HashPassword(newSecret)
	h.authClient.OAuthClient.UpdateOneID(aid).SetClientSecretHash(hash).Save(ctx)
	c.JSON(http.StatusOK, gin.H{"client_secret": newSecret})
}

func parseInt(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return defaultVal
		}
		n = n*10 + int(c-'0')
	}
	if n <= 0 {
		return defaultVal
	}
	return n
}

package gateway

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/auditlog"
	"github.com/identity-platform/internal/ent/oauthclient"
	"github.com/identity-platform/internal/ent/user"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// =========================== Admin: User Management ===========================

func (h *Handler) AdminListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	search := c.Query("search")
	status := c.Query("status")

	if page < 1 { page = 1 }
	if size < 1 { size = 1 }
	if size > 100 { size = 100 }

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	q := h.authClient.User.Query().
		WithProfile().
		Order(ent.Desc(user.FieldCreatedAt))

	if search != "" {
		q = q.Where(user.Or(
			user.EmailContains(search),
			user.UsernameContains(search),
		))
	}
	if status != "" {
		q = q.Where(user.StatusEQ(user.Status(status)))
	}

	total, err := q.Count(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	users, err := q.Limit(size).Offset((page - 1) * size).All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type userItem struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		Username      string `json:"username,omitempty"`
		EmailVerified bool   `json:"email_verified"`
		MfaEnabled    bool   `json:"mfa_enabled"`
		Status        string `json:"status"`
		DisplayName   string `json:"display_name,omitempty"`
		CreatedAt     string `json:"created_at"`
	}

	items := make([]userItem, 0, len(users))
	for _, u := range users {
		dn := ""
		if u.Edges.Profile != nil && u.Edges.Profile.DisplayName != "" {
			dn = u.Edges.Profile.DisplayName
		}
		items = append(items, userItem{
			ID:            u.ID.String(),
			Email:         u.Email,
			Username:      u.Username,
			EmailVerified: u.EmailVerified,
			MfaEnabled:    u.MfaEnabled,
			Status:        string(u.Status),
			DisplayName:   dn,
			CreatedAt:     u.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": items,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

func (h *Handler) AdminGetUser(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.authClient.User.Query().
		Where(user.IDEQ(uid)).
		WithProfile().
		WithSessions().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	sessionCount := len(u.Edges.Sessions)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":             u.ID.String(),
			"email":          u.Email,
			"username":       u.Username,
			"email_verified": u.EmailVerified,
			"mfa_enabled":    u.MfaEnabled,
			"status":         string(u.Status),
			"profile":        profile,
			"session_count":  sessionCount,
			"created_at":     u.CreatedAt.Format(time.RFC3339),
		},
	})
}

func (h *Handler) AdminToggleUserStatus(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.authClient.User.Get(ctx, uid)
	if err != nil {
		if ent.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	newStatus := "active"
	if u.Status == "active" {
		newStatus = "disabled"
	}

	_, err = h.authClient.User.UpdateOneID(uid).SetStatus(user.Status(newStatus)).Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": newStatus})
}

// =========================== Admin: App Review ===========================

func (h *Handler) AdminListApps(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

	if page < 1 { page = 1 }
	if size < 1 { size = 1 }
	if size > 100 { size = 100 }

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	q := h.authClient.OAuthClient.Query().
		WithRedirectUris().
		Order(ent.Desc(oauthclient.FieldCreatedAt))

	total, _ := q.Count(ctx)
	apps, err := q.Limit(size).Offset((page - 1) * size).All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type appItem struct {
		ID          string   `json:"id"`
		ClientID    string   `json:"client_id"`
		Name        string   `json:"name"`
		Description string   `json:"description,omitempty"`
		ClientType  string   `json:"client_type"`
		Status      string   `json:"status"`
		RedirectURIs []string `json:"redirect_uris"`
		CreatedBy   string   `json:"created_by"`
		CreatedAt   string   `json:"created_at"`
	}

	items := make([]appItem, 0, len(apps))
	for _, a := range apps {
		uris := make([]string, 0)
		for _, ru := range a.Edges.RedirectUris {
			uris = append(uris, ru.RedirectURI)
		}
		items = append(items, appItem{
			ID:           a.ID.String(),
			ClientID:     a.ClientID,
			Name:         a.Name,
			Description:  a.Description,
			ClientType:   string(a.ClientType),
			Status:       string(a.Status),
			RedirectURIs: uris,
			CreatedBy:    a.CreatedBy.String(),
			CreatedAt:    a.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"apps":  items,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

func (h *Handler) AdminApproveApp(c *gin.Context) {
	appID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid app id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	_, err = h.authClient.OAuthClient.UpdateOneID(appID).
		SetStatus(oauthclient.StatusActive).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "app approved"})
}

func (h *Handler) AdminRejectApp(c *gin.Context) {
	appID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid app id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	_, err = h.authClient.OAuthClient.UpdateOneID(appID).
		SetStatus(oauthclient.StatusDisabled).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "app rejected"})
}

// =========================== Admin: Audit Logs ===========================

func (h *Handler) AdminAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "50"))

	if page < 1 { page = 1 }
	if size < 1 { size = 1 }
	if size > 200 { size = 200 }

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	q := h.authClient.AuditLog.Query().
		WithUser().
		Order(ent.Desc(auditlog.FieldCreatedAt))

	total, _ := q.Count(ctx)
	logs, err := q.Limit(size).Offset((page - 1) * size).All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type logItem struct {
		ID           string `json:"id"`
		UserEmail    string `json:"user_email,omitempty"`
		Action       string `json:"action"`
		ResourceType string `json:"resource_type,omitempty"`
		ResourceID   string `json:"resource_id,omitempty"`
		IPAddress    string `json:"ip_address,omitempty"`
		UserAgent    string `json:"user_agent,omitempty"`
		CreatedAt    string `json:"created_at"`
	}

	items := make([]logItem, 0, len(logs))
	for _, l := range logs {
		email := ""
		if l.Edges.User != nil {
			email = l.Edges.User.Email
		}
		items = append(items, logItem{
			ID:           l.ID.String(),
			UserEmail:    email,
			Action:       l.Action,
			ResourceType: l.ResourceType,
			ResourceID:   l.ResourceID,
			IPAddress:    l.IPAddress,
			UserAgent:    l.UserAgent,
			CreatedAt:    l.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  items,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

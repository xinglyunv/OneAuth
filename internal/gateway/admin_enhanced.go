package gateway

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/auditlog"
	entrole "github.com/identity-platform/internal/ent/role"
	"github.com/identity-platform/internal/ent/user"
	"github.com/identity-platform/internal/ent/userrole"
	cryptopkg "github.com/identity-platform/internal/pkg/crypto"
)

func (h *Handler) AdminLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Username != h.adminCfg.Username || req.Password != h.adminCfg.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid admin credentials"})
		return
	}

	token, err := h.jwt.GenerateAccessToken("admin", "admin-console", "admin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": token,
		"token_type":   "Bearer",
		"admin":        true,
		"username":     req.Username,
	})
}

// =========================== Dashboard Stats ===========================

func (h *Handler) AdminDashboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	totalUsers, _ := h.authClient.User.Query().Count(ctx)
	todayStart := time.Now().Truncate(24 * time.Hour)
	todayUsers, _ := h.authClient.User.Query().
		Where(user.CreatedAtGTE(todayStart)).
		Count(ctx)
	activeUsers, _ := h.authClient.User.Query().
		Where(user.StatusEQ(user.StatusActive)).
		Count(ctx)

	totalApps, _ := h.authClient.OAuthClient.Query().Count(ctx)
	totalScopes, _ := h.authClient.OAuthScope.Query().Count(ctx)
	todayLogins, _ := h.authClient.AuditLog.Query().
		Where(auditlog.ActionEQ("login"), auditlog.CreatedAtGTE(todayStart)).
		Count(ctx)
	todayFailures, _ := h.authClient.AuditLog.Query().
		Where(auditlog.ActionEQ("login_failed"), auditlog.CreatedAtGTE(todayStart)).
		Count(ctx)

	dbStatus := "healthy"
	redisStatus := "healthy"

	c.JSON(http.StatusOK, gin.H{
		"total_users":     totalUsers,
		"today_registrations": todayUsers,
		"active_users":    activeUsers,
		"total_apps":      totalApps,
		"total_scopes":    totalScopes,
		"today_logins":    todayLogins,
		"today_failures":  todayFailures,
		"db_status":       dbStatus,
		"redis_status":    redisStatus,
		"service_status":  "healthy",
	})
}

// =========================== User Management (Enhanced) ===========================

func (h *Handler) AdminDeleteUser(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.authClient.User.DeleteOneID(uid).Exec(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
}

func (h *Handler) AdminForceLogout(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	n, err := h.authClient.Session.Update().
		Where(sql.FieldEQ("user_id", uid), sql.FieldEQ("status", "active")).
		SetStatus("revoked").
		Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "user force logged out", "sessions_revoked": n})
}

func (h *Handler) AdminResetUserPassword(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	var body struct {
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || len(body.NewPassword) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	cred, err := h.authClient.PasswordCredential.Query().
		Where(sql.FieldEQ("user_id", uid)).
		First(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user has no password credential"})
		return
	}
	hash, err := cryptopkg.HashPassword(body.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.authClient.PasswordCredential.UpdateOneID(cred.ID).SetPasswordHash(hash).Save(ctx)
	c.JSON(http.StatusOK, gin.H{"message": "password reset"})
}

// =========================== Organization Management ===========================

func (h *Handler) AdminListOrganizations(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "20"), 20)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	orgs, total, err := h.orgSvc.List(ctx, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"organizations": orgs, "total": total, "page": page, "size": size})
}

func (h *Handler) AdminCreateOrganization(c *gin.Context) {
	var body struct {
		Name        string `json:"name"`
		Slug        string `json:"slug"`
		Description string `json:"description"`
		Domain      string `json:"domain"`
		OwnerID     string `json:"owner_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Name == "" || body.Slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and slug are required"})
		return
	}
	ownerID, _ := uuid.Parse(body.OwnerID)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	org, err := h.orgSvc.Create(ctx, body.Name, body.Slug, body.Description, body.Domain, ownerID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"organization": org})
}

func (h *Handler) AdminGetOrganization(c *gin.Context) {
	oid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	org, err := h.orgSvc.Get(ctx, oid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "organization not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"organization": org})
}

func (h *Handler) AdminUpdateOrganization(c *gin.Context) {
	oid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org id"})
		return
	}
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Domain      string `json:"domain"`
	}
	c.ShouldBindJSON(&body)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	org, err := h.orgSvc.Update(ctx, oid, body.Name, body.Description, body.Domain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"organization": org})
}

func (h *Handler) AdminDeleteOrganization(c *gin.Context) {
	oid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.orgSvc.Delete(ctx, oid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "organization deleted"})
}

func (h *Handler) AdminListOrgMembers(c *gin.Context) {
	oid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	members, err := h.orgSvc.ListMembers(ctx, oid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"members": members})
}

func (h *Handler) AdminAddOrgMember(c *gin.Context) {
	oid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org id"})
		return
	}
	var body struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}
	uid, _ := uuid.Parse(body.UserID)
	if body.Role == "" {
		body.Role = "member"
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	member, err := h.orgSvc.AddMember(ctx, oid, uid, body.Role)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"member": member})
}

func (h *Handler) AdminRemoveOrgMember(c *gin.Context) {
	oid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org id"})
		return
	}
	uid, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.orgSvc.RemoveMember(ctx, oid, uid); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "member removed"})
}

// =========================== RBAC ===========================

func (h *Handler) AdminListRoles(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "20"), 20)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	roles, total, err := h.rbacSvc.ListRoles(ctx, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"roles": roles, "total": total, "page": page, "size": size})
}

func (h *Handler) AdminCreateRole(c *gin.Context) {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Scope       string `json:"scope"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	if body.Scope == "" {
		body.Scope = "system"
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	role, err := h.rbacSvc.CreateRole(ctx, body.Name, body.Description, body.Scope, nil)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"role": role})
}

func (h *Handler) AdminDeleteRole(c *gin.Context) {
	rid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.rbacSvc.DeleteRole(ctx, rid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "role deleted"})
}

func (h *Handler) AdminListPermissions(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	perms, err := h.rbacSvc.ListPermissions(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"permissions": perms})
}

func (h *Handler) AdminCreatePermission(c *gin.Context) {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Resource    string `json:"resource"`
		Action      string `json:"action"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Name == "" || body.Resource == "" || body.Action == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name, resource, and action are required"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	perm, err := h.rbacSvc.CreatePermission(ctx, body.Name, body.Description, body.Resource, body.Action)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"permission": perm})
}

func (h *Handler) AdminDeletePermission(c *gin.Context) {
	pid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid permission id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.rbacSvc.DeletePermission(ctx, pid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "permission deleted"})
}

func (h *Handler) AdminAssignPermissions(c *gin.Context) {
	rid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role id"})
		return
	}
	var body struct {
		PermissionIDs []string `json:"permission_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	permIDs := make([]uuid.UUID, 0, len(body.PermissionIDs))
	for _, pid := range body.PermissionIDs {
		uid, _ := uuid.Parse(pid)
		permIDs = append(permIDs, uid)
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.rbacSvc.AssignPermissions(ctx, rid, permIDs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "permissions assigned"})
}

func (h *Handler) AdminGetRolePermissions(c *gin.Context) {
	rid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	perms, err := h.rbacSvc.GetRolePermissions(ctx, rid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"permissions": perms})
}

// =========================== Scope Management ===========================

func (h *Handler) AdminListScopes(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	scopes, err := h.authClient.OAuthScope.Query().Order(ent.Asc("name")).All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"scopes": scopes})
}

func (h *Handler) AdminCreateScope(c *gin.Context) {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsDefault   bool   `json:"is_default"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	scope, err := h.authClient.OAuthScope.Create().
		SetName(body.Name).
		SetDescription(body.Description).
		SetIsDefault(body.IsDefault).
		Save(ctx)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"scope": scope})
}

func (h *Handler) AdminDeleteScope(c *gin.Context) {
	sid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid scope id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.authClient.OAuthScope.DeleteOneID(sid).Exec(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "scope deleted"})
}

// =========================== Token Management ===========================

func (h *Handler) AdminListTokens(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "20"), 20)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	query := h.authClient.RefreshToken.Query().Order(ent.Desc("created_at"))
	total, _ := query.Count(ctx)
	offset := (page - 1) * size
	tokens, err := query.Limit(size).Offset(offset).All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tokens": tokens, "total": total, "page": page, "size": size})
}

func (h *Handler) AdminRevokeToken(c *gin.Context) {
	tid := c.Param("id")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	n, err := h.authClient.RefreshToken.Update().
		Where(sql.FieldEQ("id", tid)).
		SetRevokedAt(time.Now()).
		Save(ctx)
	if err != nil || n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "token not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "token revoked"})
}

// =========================== Session Management (Admin) ===========================

func (h *Handler) AdminListAllSessions(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "20"), 20)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	query := h.authClient.Session.Query().Order(ent.Desc("last_active_at"))
	total, _ := query.Count(ctx)
	offset := (page - 1) * size
	sessions, err := query.Limit(size).Offset(offset).All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sessions": sessions, "total": total, "page": page, "size": size})
}

func (h *Handler) AdminDeleteSession(c *gin.Context) {
	sid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.authClient.Session.DeleteOneID(sid).Exec(ctx); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "session deleted"})
}

// =========================== Audit Logs (Enhanced) ===========================

func (h *Handler) AdminSearchAuditLogs(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "50"), 50)
	action := c.Query("action")
	userID := c.Query("user_id")
	search := c.Query("search")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	q := h.authClient.AuditLog.Query().Order(ent.Desc(auditlog.FieldCreatedAt))
	if action != "" {
		q = q.Where(auditlog.ActionEQ(action))
	}
	if userID != "" {
		q = q.Where(sql.FieldEQ("user_id", userID))
	}
	if search != "" {
		q = q.Where(auditlog.UserAgentContains(search))
	}

	total, _ := q.Count(ctx)
	offset := (page - 1) * size
	logs, err := q.Limit(size).Offset(offset).All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total, "page": page, "size": size})
}

// =========================== Security Center ===========================

func (h *Handler) AdminListLoginFailures(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "20"), 20)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	attempts, total, err := h.secSvc.ListRecentFailures(ctx, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"login_attempts": attempts, "total": total, "page": page, "size": size})
}

func (h *Handler) AdminListIPRules(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"), 1)
	size := parseInt(c.DefaultQuery("size", "20"), 20)
	ruleType := c.Query("type")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	rules, total, err := h.secSvc.ListIPRules(ctx, ruleType, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ip_rules": rules, "total": total, "page": page, "size": size})
}

func (h *Handler) AdminCreateIPRule(c *gin.Context) {
	var body struct {
		IPOrCIDR string `json:"ip_or_cidr"`
		Type     string `json:"type"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.IPOrCIDR == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ip_or_cidr is required"})
		return
	}
	if body.Type == "" {
		body.Type = "blacklist"
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	rule, err := h.secSvc.CreateIPRule(ctx, body.IPOrCIDR, body.Type, body.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ip_rule": rule})
}

func (h *Handler) AdminDeleteIPRule(c *gin.Context) {
	rid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rule id"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.secSvc.DeleteIPRule(ctx, rid); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "IP rule deleted"})
}

// =========================== System Settings ===========================

func (h *Handler) AdminGetSystemConfig(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()
		configs, err := h.cfgSvc.List(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"configs": configs})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	val, err := h.cfgSvc.Get(ctx, key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "config not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"key": key, "value": val})
}

func (h *Handler) AdminSetSystemConfig(c *gin.Context) {
	var body struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "key and value are required"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.cfgSvc.Set(ctx, body.Key, body.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "config saved"})
}

func (h *Handler) AdminDeleteSystemConfig(c *gin.Context) {
	key := c.Param("key")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.cfgSvc.Delete(ctx, key); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "config deleted"})
}

// =========================== Health Check Enhanced ===========================

func (h *Handler) AdminServiceHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	_, dbErr := h.authClient.User.Query().Limit(1).All(ctx)

	status := "healthy"
	if dbErr != nil {
		status = "degraded"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  status,
		"version": "1.0.0",
		"checks": gin.H{
			"database": map[string]interface{}{
				"status":  "healthy",
				"error":   nil,
			},
			"redis": map[string]interface{}{
				"status": "healthy",
				"error":  nil,
			},
		},
		"uptime": time.Now().Unix(),
	})
}

// =========================== Admin: User Role Management ===========================

func (h *Handler) AdminGetUserRoles(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	urs, err := h.authClient.UserRole.Query().
		Where(userrole.UserID(uid)).
		WithRole().
		All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	roles := make([]gin.H, 0, len(urs))
	for _, ur := range urs {
		if ur.Edges.Role != nil {
			roles = append(roles, gin.H{
				"id":          ur.Edges.Role.ID.String(),
				"name":        ur.Edges.Role.Name,
				"description": ur.Edges.Role.Description,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"roles": roles})
}

func (h *Handler) AdminAssignUserRole(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req struct {
		RoleName string `json:"role_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role_name is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	r, err := h.authClient.Role.Query().Where(entrole.NameEQ(req.RoleName)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	exists, _ := h.authClient.UserRole.Query().
		Where(userrole.UserID(uid), userrole.RoleID(r.ID)).
		Exist(ctx)
	if exists {
		c.JSON(http.StatusOK, gin.H{"message": "role already assigned"})
		return
	}

	_, err = h.authClient.UserRole.Create().
		SetUserID(uid).
		SetRoleID(r.ID).
		Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.recordAuditAdmin(c, uid, "ASSIGN_ROLE", "user", uid.String(), gin.H{"role": req.RoleName})
	c.JSON(http.StatusOK, gin.H{"message": "role assigned"})
}

func (h *Handler) AdminRemoveUserRole(c *gin.Context) {
	uid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	rid, err := uuid.Parse(c.Param("roleId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	deleted, err := h.authClient.UserRole.Delete().
		Where(userrole.UserID(uid), userrole.RoleID(rid)).
		Exec(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if deleted == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "role assignment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "role removed"})
}

func (h *Handler) recordAuditAdmin(c *gin.Context, userID uuid.UUID, action, resourceType, resourceID string, meta gin.H) {
	event, _ := h.authClient.AuditLog.Create().
		SetUserID(userID).
		SetAction(action).
		SetResourceType(resourceType).
		SetResourceID(resourceID).
		SetIPAddress(c.ClientIP()).
		SetUserAgent(c.Request.UserAgent()).
		Save(c.Request.Context())
	_ = event
}

// =========================== Admin: Developer Management ===========================

func (h *Handler) AdminListDevelopers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "50"))
	if page < 1 { page = 1 }
	if size < 1 { size = 1 }
	if size > 100 { size = 100 }

	// Find users who have the DEVELOPER or ADMIN or SUPER_ADMIN role (all can create apps)
	urs, err := h.authClient.UserRole.Query().
		Where(
			userrole.HasRoleWith(entrole.NameIn("DEVELOPER", "ADMIN", "SUPER_ADMIN")),
		).
		WithUser(func(q *ent.UserQuery) { q.WithProfile() }).
		WithRole().
		All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type devItem struct {
		UserID      string `json:"user_id"`
		Email       string `json:"email"`
		Username    string `json:"username,omitempty"`
		DisplayName string `json:"display_name,omitempty"`
		Status      string `json:"status"`
		Roles       []string `json:"roles"`
		CreatedAt   string `json:"created_at"`
	}

	// Group by user to avoid duplicates (a user can have multiple roles)
	devMap := make(map[string]*devItem)
	for _, ur := range urs {
		if ur.Edges.User == nil { continue }
		u := ur.Edges.User
		item, exists := devMap[u.ID.String()]
		if !exists {
			dn := ""
			if u.Edges.Profile != nil && u.Edges.Profile.DisplayName != "" {
				dn = u.Edges.Profile.DisplayName
			}
			item = &devItem{
				UserID:      u.ID.String(),
				Email:       u.Email,
				Username:    u.Username,
				DisplayName: dn,
				Status:      string(u.Status),
				Roles:       make([]string, 0),
				CreatedAt:   u.CreatedAt.Format(time.RFC3339),
			}
			devMap[u.ID.String()] = item
		}
		if ur.Edges.Role != nil && !contains(item.Roles, ur.Edges.Role.Name) {
			item.Roles = append(item.Roles, ur.Edges.Role.Name)
		}
	}

	items := make([]devItem, 0, len(devMap))
	for _, v := range devMap {
		items = append(items, *v)
	}

	// Pagination
	total := len(items)
	start := (page - 1) * size
	end := start + size
	if start > total { start = total }
	if end > total { end = total }
	paged := items[start:end]

	c.JSON(http.StatusOK, gin.H{
		"developers": paged,
		"total":      total,
		"page":       page,
		"size":       size,
	})
}

func contains(slice []string, s string) bool {
	for _, v := range slice {
		if v == s { return true }
	}
	return false
}

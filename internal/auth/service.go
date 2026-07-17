package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/device"
	"github.com/identity-platform/internal/ent/passwordcredential"
	entrole "github.com/identity-platform/internal/ent/role"
	"github.com/identity-platform/internal/ent/session"
	"github.com/identity-platform/internal/ent/user"
	"github.com/identity-platform/internal/ent/userrole"
	"github.com/identity-platform/internal/pkg/crypto"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	pbauth "github.com/identity-platform/proto/auth"
	"go.uber.org/zap"
)

type Service struct {
	pbauth.UnimplementedAuthServiceServer
	client      *ent.Client
	jwt         *jwtpkg.TokenManager
	logger      *zap.Logger
	emailSender EmailSender
}

func NewService(client *ent.Client, jwt *jwtpkg.TokenManager, logger *zap.Logger) *Service {
	return &Service{
		client: client,
		jwt:    jwt,
		logger: logger,
	}
}

func (s *Service) Register(ctx context.Context, req *pbauth.RegisterRequest) (*pbauth.RegisterResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, errors.New("email and password are required")
	}

	if len(req.Password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	exists, err := s.client.User.Query().Where(user.EmailEQ(req.Email)).Exist(ctx)
	if err != nil {
		return nil, fmt.Errorf("check user existence: %w", err)
	}
	if exists {
		return &pbauth.RegisterResponse{
			Message: "registration successful",
		}, nil
	}

	passwordHash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	newUser, err := s.client.User.Create().
		SetEmail(req.Email).
		SetNillableUsername(nilStr(req.Username)).
		SetStatus("active").
		SetEmailVerified(true).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	_, err = s.client.PasswordCredential.Create().
		SetUserID(newUser.ID).
		SetPasswordHash(passwordHash).
		SetAlgorithm("argon2id").
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create password credential: %w", err)
	}

	_, err = s.client.UserProfile.Create().
		SetUserID(newUser.ID).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create user profile: %w", err)
	}

	if err := s.AssignUserRole(ctx, newUser.ID, "USER"); err != nil {
		s.logger.Warn("failed to assign USER role", zap.Error(err))
	}

	_, err = s.client.AuditLog.Create().
		SetUserID(newUser.ID).
		SetAction("REGISTER").
		SetResourceType("user").
		SetResourceID(newUser.ID.String()).
		SetMetadata(map[string]interface{}{
			"email": req.Email,
		}).
		Save(ctx)
	if err != nil {
		s.logger.Warn("failed to write audit log", zap.Error(err))
	}

	return &pbauth.RegisterResponse{
		UserId:  newUser.ID.String(),
		Message: "registration successful",
	}, nil
}

func (s *Service) Login(ctx context.Context, req *pbauth.LoginRequest) (*pbauth.LoginResponse, error) {
	u, err := s.client.User.Query().Where(user.EmailEQ(req.Email)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			s.recordLoginAttempt(ctx, req.Email, uuid.Nil, req.IpAddress, false, "invalid_credentials")
			return nil, errors.New("invalid credentials")
		}
		return nil, fmt.Errorf("query user: %w", err)
	}

	if u.Status == "disabled" {
		return nil, errors.New("account is disabled")
	}

	cred, err := s.client.PasswordCredential.Query().Where(passwordcredential.UserIDEQ(u.ID)).First(ctx)
	if err != nil {
		s.recordLoginAttempt(ctx, req.Email, u.ID, req.IpAddress, false, "no_password_credential")
		return nil, errors.New("invalid credentials")
	}

	valid, err := crypto.VerifyPassword(req.Password, cred.PasswordHash)
	if err != nil || !valid {
		s.recordLoginAttempt(ctx, req.Email, u.ID, req.IpAddress, false, "invalid_credentials")
		return nil, errors.New("invalid credentials")
	}

	if u.MfaEnabled {
		mfaSessionToken, err := generateRandomToken()
		if err != nil {
			return nil, fmt.Errorf("generate mfa token: %w", err)
		}

		s.recordLoginAttempt(ctx, req.Email, u.ID, req.IpAddress, true, "")

		return &pbauth.LoginResponse{
			MfaRequired:      true,
			MfaSessionToken:  mfaSessionToken,
		}, nil
	}

	sessionID := uuid.New()
	refreshToken, err := generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}
	refreshTokenHash := hashToken(refreshToken)

	roles, err := s.GetUserRoles(ctx, u.ID)
	if err != nil {
		s.logger.Warn("failed to get user roles", zap.Error(err))
	}
	primaryRole := "user"
	if len(roles) > 0 {
		primaryRole = roles[0]
	}

	deviceID, err := s.findOrCreateDevice(ctx, u.ID, req.DeviceFingerprint, req.DeviceName, req.UserAgent, req.IpAddress)
	if err != nil {
		s.logger.Warn("failed to manage device", zap.Error(err))
	}

	_, err = s.client.Session.Create().
		SetID(sessionID).
		SetUserID(u.ID).
		SetTokenHash(refreshTokenHash).
		SetRole(primaryRole).
		SetLoginType(session.LoginTypeNormal).
		SetNillableDeviceID(deviceID).
		SetIPAddress(req.IpAddress).
		SetUserAgent(req.UserAgent).
		SetStatus(session.StatusActive).
		SetExpiresAt(time.Now().Add(30 * 24 * time.Hour)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	accessToken, err := s.jwt.GenerateAccessToken(u.ID.String(), "", "openid profile email")
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	s.recordLoginAttempt(ctx, req.Email, u.ID, req.IpAddress, true, "")
	s.recordAuditLog(ctx, u.ID, "LOGIN_SUCCESS", "session", sessionID.String(), req.IpAddress, req.UserAgent, nil)

	return &pbauth.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		SessionId:    sessionID.String(),
	}, nil
}

func (s *Service) Logout(ctx context.Context, req *pbauth.LogoutRequest) (*pbauth.LogoutResponse, error) {
	sid, err := uuid.Parse(req.SessionId)
	if err != nil {
		return nil, errors.New("invalid session id")
	}

	sess, err := s.client.Session.Get(ctx, sid)
	if err != nil {
		if ent.IsNotFound(err) {
			return &pbauth.LogoutResponse{Message: "logged out"}, nil
		}
		return nil, fmt.Errorf("get session: %w", err)
	}

	_, err = s.client.Session.UpdateOne(sess).
		SetStatus(session.StatusRevoked).
		SetRevokedAt(time.Now()).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("revoke session: %w", err)
	}

	s.recordAuditLog(ctx, sess.UserID, "LOGOUT", "session", req.SessionId, "", "", nil)

	return &pbauth.LogoutResponse{Message: "logged out"}, nil
}

func (s *Service) AssignUserRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	r, err := s.client.Role.Query().Where(entrole.NameEQ(roleName)).Only(ctx)
	if err != nil {
		return fmt.Errorf("find role %s: %w", roleName, err)
	}
	exists, err := s.client.UserRole.Query().
		Where(userrole.UserID(userID), userrole.RoleID(r.ID)).
		Exist(ctx)
	if err != nil {
		return fmt.Errorf("check user role: %w", err)
	}
	if exists {
		return nil
	}
	_, err = s.client.UserRole.Create().
		SetUserID(userID).
		SetRoleID(r.ID).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("assign role: %w", err)
	}
	return nil
}

func (s *Service) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	urs, err := s.client.UserRole.Query().
		Where(userrole.UserID(userID)).
		WithRole().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("query user roles: %w", err)
	}
	roles := make([]string, 0, len(urs))
	for _, ur := range urs {
		roles = append(roles, ur.Edges.Role.Name)
	}
	return roles, nil
}

func (s *Service) HasRole(ctx context.Context, userID uuid.UUID, roleName string) (bool, error) {
	r, err := s.client.Role.Query().Where(entrole.NameEQ(roleName)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("find role: %w", err)
	}
	exists, err := s.client.UserRole.Query().
		Where(userrole.UserID(userID), userrole.RoleID(r.ID)).
		Exist(ctx)
	if err != nil {
		return false, fmt.Errorf("check role: %w", err)
	}
	return exists, nil
}

func (s *Service) findOrCreateDevice(ctx context.Context, userID uuid.UUID, fingerprint, name, userAgent, ip string) (*uuid.UUID, error) {
	if fingerprint == "" {
		return nil, nil
	}

	dev, err := s.client.Device.Query().
		Where(device.UserIDEQ(userID), device.FingerprintEQ(fingerprint)).
		Only(ctx)
	if err == nil {
		_, uerr := s.client.Device.UpdateOne(dev).
			SetLastIP(ip).
			SetLastSeenAt(time.Now()).
			SetName(name).
			Save(ctx)
		return &dev.ID, uerr
	}

	if !ent.IsNotFound(err) {
		return nil, err
	}

	dev, err = s.client.Device.Create().
		SetUserID(userID).
		SetFingerprint(fingerprint).
		SetName(name).
		SetPlatform(detectOS(userAgent)).
		SetBrowser(detectBrowser(userAgent)).
		SetLastIP(ip).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	return &dev.ID, nil
}

func (s *Service) recordLoginAttempt(ctx context.Context, email string, userID uuid.UUID, ip string, success bool, reason string) {
	create := s.client.LoginAttempt.Create().
		SetEmail(email).
		SetIPAddress(ip).
		SetSuccess(success)

	if userID != uuid.Nil {
		create.SetUserID(userID)
	}
	if reason != "" {
		create.SetFailureReason(reason)
	}

	if _, err := create.Save(ctx); err != nil {
		s.logger.Warn("failed to record login attempt", zap.Error(err))
	}
}

func (s *Service) recordAuditLog(ctx context.Context, userID uuid.UUID, action, resourceType, resourceID, ip, userAgent string, metadata map[string]interface{}) {
	create := s.client.AuditLog.Create().
		SetUserID(userID).
		SetAction(action).
		SetResourceType(resourceType).
		SetResourceID(resourceID)

	if ip != "" {
		create.SetIPAddress(ip)
	}
	if userAgent != "" {
		create.SetUserAgent(userAgent)
	}
	if metadata != nil {
		create.SetMetadata(metadata)
	}

	if _, err := create.Save(ctx); err != nil {
		s.logger.Warn("failed to write audit log", zap.Error(err))
	}
}

func generateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func generateRandomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func detectOS(userAgent string) string {
	switch {
	case containsAny(userAgent, "Windows"):
		return "Windows"
	case containsAny(userAgent, "Macintosh", "Mac OS"):
		return "macOS"
	case containsAny(userAgent, "Linux"):
		return "Linux"
	case containsAny(userAgent, "iPhone", "iPad"):
		return "iOS"
	case containsAny(userAgent, "Android"):
		return "Android"
	default:
		return "Unknown"
	}
}

func detectBrowser(userAgent string) string {
	switch {
	case containsAny(userAgent, "Chrome", "Chromium"):
		return "Chrome"
	case containsAny(userAgent, "Firefox"):
		return "Firefox"
	case containsAny(userAgent, "Safari") && !containsAny(userAgent, "Chrome"):
		return "Safari"
	case containsAny(userAgent, "Edge"):
		return "Edge"
	default:
		return "Unknown"
	}
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		for i := 0; i <= len(s)-len(sub); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
	}
	return false
}

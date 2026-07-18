package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/session"
	"github.com/identity-platform/internal/pkg/totp"
	pbauth "github.com/identity-platform/proto/auth"
	"go.uber.org/zap"
)

func (s *Service) EnableMFA(ctx context.Context, req *pbauth.EnableMFARequest) (*pbauth.EnableMFAResponse, error) {
	uid, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	u, err := s.client.User.Get(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	if u.MfaEnabled {
		return nil, errors.New("MFA already enabled")
	}

	secret := totp.GenerateSecret()

	_, err = s.client.User.UpdateOne(u).
		SetMfaEnabled(true).
		SetMfaSecret(secret).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("save mfa: %w", err)
	}

	qrURL := totp.GenerateQRCodeURL(secret, "IdentityPlatform", u.Email)

	s.recordAuditLog(ctx, u.ID, "MFA_ENABLED", "user", u.ID.String(), "", "", nil)

	return &pbauth.EnableMFAResponse{
		Secret:    secret,
		QrCodeUrl: qrURL,
	}, nil
}

func (s *Service) DisableMFA(ctx context.Context, req *pbauth.DisableMFARequest) (*pbauth.DisableMFAResponse, error) {
	uid, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	u, err := s.client.User.Get(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	if !u.MfaEnabled {
		return nil, errors.New("MFA not enabled")
	}

	if !totp.ValidateCode(u.MfaSecret, req.TotpCode) {
		return nil, errors.New("invalid TOTP code")
	}

	_, err = s.client.User.UpdateOne(u).
		SetMfaEnabled(false).
		ClearMfaSecret().
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("disable mfa: %w", err)
	}

	s.recordAuditLog(ctx, u.ID, "MFA_DISABLED", "user", u.ID.String(), "", "", nil)

	return &pbauth.DisableMFAResponse{Message: "MFA disabled"}, nil
}

func (s *Service) ValidateMFA(ctx context.Context, req *pbauth.ValidateMFARequest) (*pbauth.ValidateMFAResponse, error) {
	var u *ent.User
	var err error

	if s.redis != nil && req.MfaSessionToken != "" {
		key := "mfa_session:" + req.MfaSessionToken
		userIDStr, redisErr := s.redis.Get(ctx, key).Result()
		if redisErr != nil {
			return nil, errors.New("invalid or expired MFA session")
		}
		s.redis.Del(ctx, key)

		uid, parseErr := uuid.Parse(userIDStr)
		if parseErr != nil {
			return nil, errors.New("invalid MFA session data")
		}
		u, err = s.client.User.Get(ctx, uid)
		if err != nil {
			return nil, errors.New("user not found")
		}
	} else {
		return nil, errors.New("invalid MFA session")
	}

	if u.MfaSecret == "" {
		return nil, errors.New("MFA not configured for this user")
	}

	if !totp.ValidateCode(u.MfaSecret, req.TotpCode) {
		s.recordAuditLog(ctx, u.ID, "LOGIN_MFA_FAILED", "user", u.ID.String(), "", "", nil)
		return nil, errors.New("invalid TOTP code")
	}

	sessionID := uuid.New()
	refreshToken, err := generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}
	refreshTokenHash := hashToken(refreshToken)

	roles, err := s.GetUserRoles(ctx, u.ID)
	if err != nil {
		s.logger.Warn("failed to get user roles for MFA session", zap.Error(err))
	}
	primaryRole := "user"
	if len(roles) > 0 {
		primaryRole = roles[0]
	}

	_, err = s.client.Session.Create().
		SetID(sessionID).
		SetUserID(u.ID).
		SetTokenHash(refreshTokenHash).
		SetRole(primaryRole).
		SetLoginType(session.LoginTypeNormal).
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

	s.recordAuditLog(ctx, u.ID, "LOGIN_MFA_SUCCESS", "session", sessionID.String(), "", "", nil)

	return &pbauth.ValidateMFAResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		SessionId:    sessionID.String(),
	}, nil
}

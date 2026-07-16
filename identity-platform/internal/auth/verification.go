package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/emailverificationtoken"
	"github.com/identity-platform/internal/ent/passwordcredential"
	"github.com/identity-platform/internal/ent/passwordresettoken"
	"github.com/identity-platform/internal/ent/session"
	"github.com/identity-platform/internal/ent/user"
	"github.com/identity-platform/internal/pkg/crypto"
	pbauth "github.com/identity-platform/proto/auth"
	"go.uber.org/zap"
)

type EmailSender interface {
	SendVerificationEmail(to, token string) error
	SendPasswordResetEmail(to, token string) error
}

func (s *Service) VerifyEmail(ctx context.Context, req *pbauth.VerifyEmailRequest) (*pbauth.VerifyEmailResponse, error) {
	if req.Token == "" {
		return nil, errors.New("token is required")
	}

	vt, err := s.client.EmailVerificationToken.Query().
		Where(emailverificationtoken.TokenEQ(req.Token)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, errors.New("invalid or expired token")
		}
		return nil, fmt.Errorf("query token: %w", err)
	}

	if vt.Used || time.Now().After(vt.ExpiresAt) {
		return nil, errors.New("token already used or expired")
	}

	tx, err := s.client.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}

	_, err = tx.EmailVerificationToken.UpdateOne(vt).
		SetUsed(true).
		Save(ctx)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("mark token: %w", err)
	}

	_, err = tx.User.UpdateOneID(vt.UserID).
		SetEmailVerified(true).
		SetStatus(user.StatusActive).
		Save(ctx)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("verify user: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	s.recordAuditLog(ctx, vt.UserID, "EMAIL_VERIFIED", "user", vt.UserID.String(), "", "", nil)

	return &pbauth.VerifyEmailResponse{Message: "email verified successfully"}, nil
}

func (s *Service) ResendVerification(ctx context.Context, req *pbauth.ResendVerificationRequest) (*pbauth.ResendVerificationResponse, error) {
	if req.Email == "" {
		return nil, errors.New("email is required")
	}

	u, err := s.client.User.Query().Where(user.EmailEQ(req.Email)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return &pbauth.ResendVerificationResponse{Message: "if the email exists, a verification email has been sent"}, nil
		}
		return nil, fmt.Errorf("query user: %w", err)
	}

	if u.EmailVerified {
		return &pbauth.ResendVerificationResponse{Message: "email already verified"}, nil
	}

	token, err := generateRandomToken()
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	_, err = s.client.EmailVerificationToken.Create().
		SetUserID(u.ID).
		SetToken(token).
		SetExpiresAt(time.Now().Add(24 * time.Hour)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create token: %w", err)
	}

	if s.emailSender != nil {
		if err := s.emailSender.SendVerificationEmail(u.Email, token); err != nil {
			s.logger.Warn("failed to send verification email", zap.Error(err))
		}
	}

	return &pbauth.ResendVerificationResponse{Message: "verification email sent"}, nil
}

func (s *Service) ForgotPassword(ctx context.Context, req *pbauth.ForgotPasswordRequest) (*pbauth.ForgotPasswordResponse, error) {
	if req.Email == "" {
		return nil, errors.New("email is required")
	}

	u, err := s.client.User.Query().Where(user.EmailEQ(req.Email)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return &pbauth.ForgotPasswordResponse{Message: "if the email exists, a password reset link has been sent"}, nil
		}
		return nil, fmt.Errorf("query user: %w", err)
	}

	token, err := generateRandomToken()
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	_, err = s.client.PasswordResetToken.Create().
		SetUserID(u.ID).
		SetToken(token).
		SetExpiresAt(time.Now().Add(30 * time.Minute)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create token: %w", err)
	}

	if s.emailSender != nil {
		if err := s.emailSender.SendPasswordResetEmail(u.Email, token); err != nil {
			s.logger.Warn("failed to send password reset email", zap.Error(err))
		}
	}

	s.recordAuditLog(ctx, u.ID, "PASSWORD_RESET_REQUESTED", "user", u.ID.String(), "", "", nil)

	return &pbauth.ForgotPasswordResponse{Message: "if the email exists, a password reset link has been sent"}, nil
}

func (s *Service) ResetPassword(ctx context.Context, req *pbauth.ResetPasswordRequest) (*pbauth.ResetPasswordResponse, error) {
	if req.Token == "" || req.NewPassword == "" {
		return nil, errors.New("token and new password are required")
	}

	if len(req.NewPassword) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	rt, err := s.client.PasswordResetToken.Query().
		Where(passwordresettoken.TokenEQ(req.Token)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, errors.New("invalid or expired token")
		}
		return nil, fmt.Errorf("query token: %w", err)
	}

	if rt.Used || time.Now().After(rt.ExpiresAt) {
		return nil, errors.New("token already used or expired")
	}

	passwordHash, err := crypto.HashPassword(req.NewPassword)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	tx, err := s.client.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}

	_, err = tx.PasswordResetToken.UpdateOne(rt).
		SetUsed(true).
		Save(ctx)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("mark token: %w", err)
	}

	_, err = tx.PasswordCredential.Update().
		Where(passwordcredential.UserIDEQ(rt.UserID)).
		SetPasswordHash(passwordHash).
		SetLastChangedAt(time.Now()).
		Save(ctx)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("update password: %w", err)
	}

	_, err = tx.Session.Update().
		Where(session.UserIDEQ(rt.UserID), session.StatusEQ(session.StatusActive)).
		SetStatus(session.StatusRevoked).
		SetRevokedAt(time.Now()).
		Save(ctx)
	if err != nil {
		s.logger.Warn("failed to revoke sessions", zap.Error(err))
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	s.recordAuditLog(ctx, rt.UserID, "PASSWORD_RESET", "user", rt.UserID.String(), "", "", nil)

	return &pbauth.ResetPasswordResponse{Message: "password reset successfully"}, nil
}

func (s *Service) SetEmailSender(sender EmailSender) {
	s.emailSender = sender
}

func generateVerificationToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

package email

import (
	"fmt"
	"net/smtp"
	"strings"

	"github.com/identity-platform/config"
	"go.uber.org/zap"
)

type Sender struct {
	cfg    config.EmailConfig
	logger *zap.Logger
}

func NewSender(cfg config.EmailConfig, logger *zap.Logger) *Sender {
	return &Sender{cfg: cfg, logger: logger}
}

func (s *Sender) SendVerificationEmail(to, token string) error {
	subject := "Verify your email - Identity Platform"
	link := fmt.Sprintf("https://auth.example.com/verify-email?token=%s", token)
	body := fmt.Sprintf(`Welcome to Identity Platform!

Please verify your email address by clicking the link below:
%s

This link expires in 24 hours.

If you did not create this account, please ignore this email.`, link)

	return s.send(to, subject, body)
}

func (s *Sender) SendPasswordResetEmail(to, token string) error {
	subject := "Password Reset - Identity Platform"
	link := fmt.Sprintf("https://auth.example.com/reset-password?token=%s", token)
	body := fmt.Sprintf(`A password reset was requested for your account.

Click the link below to reset your password:
%s

This link expires in 30 minutes.

If you did not request this, please ignore this email.`, link)

	return s.send(to, subject, body)
}

func (s *Sender) send(to, subject, body string) error {
	if s.cfg.SMTPHost == "" || s.cfg.Username == "" {
		s.logger.Info("email sending skipped (SMTP not configured)",
			zap.String("to", to),
			zap.String("subject", subject))
		return nil
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		s.cfg.FromAddress, to, subject, body)

	addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
	auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.SMTPHost)

	return smtp.SendMail(addr, auth, s.cfg.FromAddress, []string{to}, []byte(msg))
}

func (s *Sender) SendSecurityAlert(to, subject, alert string) error {
	body := fmt.Sprintf(`Security Alert - Identity Platform

%s

If this was not you, please change your password immediately and review your account activity.`, alert)
	return s.send(to, subject, body)
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

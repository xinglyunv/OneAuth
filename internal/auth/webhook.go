package auth

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/webhook"
	"github.com/identity-platform/internal/ent/webhookevent"
)

type WebhookService struct {
	db *ent.Client
}

func NewWebhookService(db *ent.Client) *WebhookService {
	return &WebhookService{db: db}
}

func (s *WebhookService) Create(ctx context.Context, userID *uuid.UUID, url, secret, eventTypes string) (*ent.Webhook, error) {
	create := s.db.Webhook.Create().
		SetURL(url).
		SetSecret(secret).
		SetEventTypes(eventTypes)
	if userID != nil {
		create = create.SetUserID(*userID)
	}
	return create.Save(ctx)
}

func (s *WebhookService) List(ctx context.Context, userID *uuid.UUID) ([]*ent.Webhook, error) {
	q := s.db.Webhook.Query().Order(ent.Desc("created_at"))
	if userID != nil {
		q = q.Where(webhook.UserID(*userID))
	}
	return q.All(ctx)
}

func (s *WebhookService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.db.Webhook.DeleteOneID(id).Exec(ctx)
}

func (s *WebhookService) Update(ctx context.Context, id uuid.UUID, url, secret, eventTypes string, status string) (*ent.Webhook, error) {
	update := s.db.Webhook.UpdateOneID(id)
	if url != "" {
		update = update.SetURL(url)
	}
	if secret != "" {
		update = update.SetSecret(secret)
	}
	if eventTypes != "" {
		update = update.SetEventTypes(eventTypes)
	}
	if status != "" {
		update = update.SetStatus(webhook.Status(status))
	}
	return update.Save(ctx)
}

func (s *WebhookService) Dispatch(ctx context.Context, eventType string, payload map[string]interface{}) {
	hooks, err := s.db.Webhook.Query().
		Where(
			webhook.StatusEQ(webhook.StatusActive),
			webhook.EventTypesContains(eventType),
		).
		All(ctx)
	if err != nil {
		return
	}

	for _, h := range hooks {
		go s.sendWebhook(h, eventType, payload)
	}
}

func (s *WebhookService) sendWebhook(h *ent.Webhook, eventType string, payload map[string]interface{}) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	body := map[string]interface{}{
		"event":     eventType,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"payload":   payload,
	}

	data, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", h.URL, bytes.NewReader(data))
	if err != nil {
		return
	}

	if h.Secret != "" {
		mac := hmac.New(sha256.New, []byte(h.Secret))
		mac.Write(data)
		sig := "sha256=" + hex.EncodeToString(mac.Sum(nil))
		req.Header.Set("X-OneAuth-Signature", sig)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-OneAuth-Event", eventType)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		s.recordEvent(h.ID, eventType, body, "failed")
		return
	}
	defer resp.Body.Close()

	status := "delivered"
	if resp.StatusCode >= 400 {
		status = "failed"
	}
	s.recordEvent(h.ID, eventType, body, status)
}

func (s *WebhookService) recordEvent(webhookID uuid.UUID, eventType string, payload map[string]interface{}, status string) {
	s.db.WebhookEvent.Create().
		SetWebhookID(webhookID).
		SetEventType(eventType).
		SetPayload(payload).
		SetStatus(webhookevent.Status(status)).
		Exec(context.Background())
}

func (s *WebhookService) ListEvents(ctx context.Context, hookID uuid.UUID, page, size int) ([]*ent.WebhookEvent, int, error) {
	offset := (page - 1) * size
	total, _ := s.db.WebhookEvent.Query().
		Where(webhookevent.WebhookID(hookID)).
		Count(ctx)
	events, err := s.db.WebhookEvent.Query().
		Where(webhookevent.WebhookID(hookID)).
		Order(ent.Desc("created_at")).
		Limit(size).
		Offset(offset).
		All(ctx)
	return events, total, err
}

func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("密码长度至少8位")
	}
	if len(password) > 128 {
		return fmt.Errorf("密码长度不能超过128位")
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)
	specials := "!@#$%^&*()_+-=[]{}|;':\",./<>?`~"

	for _, c := range password {
		switch {
		case 'A' <= c && c <= 'Z':
			hasUpper = true
		case 'a' <= c && c <= 'z':
			hasLower = true
		case '0' <= c && c <= '9':
			hasNumber = true
		case strings.ContainsRune(specials, c):
			hasSpecial = true
		}
	}

	var missing []string
	if !hasUpper {
		missing = append(missing, "大写字母")
	}
	if !hasLower {
		missing = append(missing, "小写字母")
	}
	if !hasNumber {
		missing = append(missing, "数字")
	}
	if !hasSpecial {
		missing = append(missing, "特殊字符")
	}
	if len(missing) > 0 {
		return fmt.Errorf("密码需要包含: %s", strings.Join(missing, ", "))
	}

	return nil
}

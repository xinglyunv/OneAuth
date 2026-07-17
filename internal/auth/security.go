package auth

import (
	"context"
	"fmt"
	"net"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/iprule"
	"github.com/identity-platform/internal/ent/loginattempt"
)

type SecurityService struct {
	db *ent.Client
}

func NewSecurityService(db *ent.Client) *SecurityService {
	return &SecurityService{db: db}
}

func (s *SecurityService) IsIPBlocked(ctx context.Context, ip string) (bool, string, error) {
	rules, err := s.db.IPRule.Query().
		Where(iprule.IsActive(true)).
		All(ctx)
	if err != nil {
		return false, "", err
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false, "", fmt.Errorf("invalid IP")
	}

	for _, r := range rules {
		_, cidr, err := net.ParseCIDR(r.IPOrCidr)
		if err == nil {
			if cidr.Contains(parsedIP) {
				return r.Type == "blacklist", r.Reason, nil
			}
		}
		if r.IPOrCidr == ip {
			return r.Type == "blacklist", r.Reason, nil
		}
	}

	return false, "", nil
}

func (s *SecurityService) CheckBruteForce(ctx context.Context, email string, maxAttempts int, window time.Duration) (bool, error) {
	since := time.Now().Add(-window)
	count, err := s.db.LoginAttempt.Query().
		Where(
			loginattempt.Email(email),
			loginattempt.Success(false),
			loginattempt.CreatedAtGTE(since),
		).
		Count(ctx)
	if err != nil {
		return false, err
	}
	return count >= maxAttempts, nil
}

func (s *SecurityService) RecordLoginAttempt(ctx context.Context, email string, userID *uuid.UUID, ip string, success bool, reason string) error {
	create := s.db.LoginAttempt.Create().
		SetEmail(email).
		SetIPAddress(ip).
		SetSuccess(success)
	if userID != nil {
		create = create.SetUserID(*userID)
	}
	if reason != "" {
		create = create.SetFailureReason(reason)
	}
	return create.Exec(ctx)
}

func (s *SecurityService) GetRecentAttempts(ctx context.Context, email string, limit int) ([]*ent.LoginAttempt, error) {
	return s.db.LoginAttempt.Query().
		Where(loginattempt.Email(email)).
		Order(ent.Desc("created_at")).
		Limit(limit).
		All(ctx)
}

func (s *SecurityService) ListRecentFailures(ctx context.Context, page, size int) ([]*ent.LoginAttempt, int, error) {
	offset := (page - 1) * size
	total, err := s.db.LoginAttempt.Query().
		Where(loginattempt.Success(false)).
		Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	attempts, err := s.db.LoginAttempt.Query().
		Where(loginattempt.Success(false)).
		Order(ent.Desc("created_at")).
		Limit(size).
		Offset(offset).
		All(ctx)
	return attempts, total, err
}

func (s *SecurityService) CreateIPRule(ctx context.Context, ipOrCIDR, ruleType, reason string) (*ent.IPRule, error) {
	return s.db.IPRule.Create().
		SetIPOrCidr(ipOrCIDR).
		SetType(iprule.Type(ruleType)).
		SetReason(reason).
		Save(ctx)
}

func (s *SecurityService) ListIPRules(ctx context.Context, ruleType string, page, size int) ([]*ent.IPRule, int, error) {
	query := s.db.IPRule.Query().Order(ent.Desc("created_at"))
	countQuery := s.db.IPRule.Query()
	if ruleType != "" {
		query = query.Where(iprule.TypeEQ(iprule.Type(ruleType)))
		countQuery = countQuery.Where(iprule.TypeEQ(iprule.Type(ruleType)))
	}
	total, _ := countQuery.Count(ctx)
	offset := (page - 1) * size
	rules, err := query.Limit(size).Offset(offset).All(ctx)
	return rules, total, err
}

func (s *SecurityService) DeleteIPRule(ctx context.Context, id uuid.UUID) error {
	return s.db.IPRule.DeleteOneID(id).Exec(ctx)
}

type SystemConfigService struct {
	db *ent.Client
}

func NewSystemConfigService(db *ent.Client) *SystemConfigService {
	return &SystemConfigService{db: db}
}

func (s *SystemConfigService) Get(ctx context.Context, key string) (string, error) {
	cfg, err := s.db.SystemConfig.Query().
		Where(sql.FieldEQ("key", key)).
		Only(ctx)
	if err != nil {
		return "", err
	}
	return cfg.Value, nil
}

func (s *SystemConfigService) Set(ctx context.Context, key, value string) error {
	existing, _ := s.db.SystemConfig.Query().
		Where(sql.FieldEQ("key", key)).
		Count(ctx)
	if existing > 0 {
		_, err := s.db.SystemConfig.Update().
			Where(sql.FieldEQ("key", key)).
			SetValue(value).
			Save(ctx)
		return err
	}
	return s.db.SystemConfig.Create().
		SetKey(key).
		SetValue(value).
		Exec(ctx)
}

func (s *SystemConfigService) List(ctx context.Context) ([]*ent.SystemConfig, error) {
	return s.db.SystemConfig.Query().Order(ent.Asc("key")).All(ctx)
}

func (s *SystemConfigService) Delete(ctx context.Context, key string) error {
	_, err := s.db.SystemConfig.Delete().Where(sql.FieldEQ("key", key)).Exec(ctx)
	return err
}

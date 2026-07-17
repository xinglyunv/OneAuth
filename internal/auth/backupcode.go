package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"math/big"

	"entgo.io/ent/dialect/sql"
	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/backupcode"
)

type BackupCodeManager struct {
	db *ent.Client
}

func NewBackupCodeManager(db *ent.Client) *BackupCodeManager {
	return &BackupCodeManager{db: db}
}

func (m *BackupCodeManager) Generate(ctx context.Context, userID uuid.UUID) ([]string, error) {
	count := 10
	codes := make([]string, 0, count)
	creates := make([]*ent.BackupCodeCreate, 0, count)

	for i := 0; i < count; i++ {
		code, err := generateBackupCode()
		if err != nil {
			return nil, fmt.Errorf("generate backup code: %w", err)
		}
		hash := hashBackupCode(code)
		creates = append(creates, m.db.BackupCode.Create().
			SetUserID(userID).
			SetCodeHash(hash))
		codes = append(codes, code)
	}

	if _, err := m.db.BackupCode.Delete().Where(backupcode.UserID(userID)).Exec(ctx); err != nil {
		return nil, fmt.Errorf("clear old backup codes: %w", err)
	}

	if _, err := m.db.BackupCode.CreateBulk(creates...).Save(ctx); err != nil {
		return nil, fmt.Errorf("save backup codes: %w", err)
	}

	return codes, nil
}

func (m *BackupCodeManager) ValidateAndUse(ctx context.Context, userID uuid.UUID, code string) (bool, error) {
	hash := hashBackupCode(code)

	n, err := m.db.BackupCode.Update().
		Where(
			backupcode.UserID(userID),
			backupcode.CodeHash(hash),
			backupcode.Used(false),
		).
		SetUsed(true).
		Save(ctx)
	if err != nil {
		return false, fmt.Errorf("use backup code: %w", err)
	}
	return n > 0, nil
}

func (m *BackupCodeManager) CountRemaining(ctx context.Context, userID uuid.UUID) (int, error) {
	return m.db.BackupCode.Query().
		Where(
			backupcode.UserID(userID),
			backupcode.Used(false),
		).
		Count(ctx)
}

func generateBackupCode() (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 10)
	for i := range code {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		code[i] = charset[n.Int64()]
	}
	buf := make([]byte, 14)
	for i, c := range code {
		buf[i] = c
		if i == 3 || i == 7 {
			buf[i+1] = '-'
		}
	}
	return string(buf), nil
}

func hashBackupCode(code string) string {
	h := sha256.Sum256([]byte(code))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

type LoginActivityService struct {
	db *ent.Client
}

func NewLoginActivityService(db *ent.Client) *LoginActivityService {
	return &LoginActivityService{db: db}
}

func (s *LoginActivityService) List(ctx context.Context, userID uuid.UUID, page, size int) ([]*ent.AuditLog, int, error) {
	offset := (page - 1) * size
	total, err := s.db.AuditLog.Query().
		Where(sql.FieldEQ("user_id", userID)).
		Count(ctx)
	if err != nil {
		return nil, 0, err
	}

	logs, err := s.db.AuditLog.Query().
		Where(sql.FieldEQ("user_id", userID)).
		Order(ent.Desc("created_at")).
		Limit(size).
		Offset(offset).
		All(ctx)
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

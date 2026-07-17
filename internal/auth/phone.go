package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/userphone"
)

type PhoneManager struct {
	db *ent.Client
}

func NewPhoneManager(db *ent.Client) *PhoneManager {
	return &PhoneManager{db: db}
}

func (m *PhoneManager) Bind(ctx context.Context, userID uuid.UUID, phone string) (*ent.UserPhone, error) {
	existing, _ := m.db.UserPhone.Query().
		Where(userphone.Phone(phone)).
		Count(ctx)
	if existing > 0 {
		return nil, fmt.Errorf("手机号已被绑定")
	}

	existingOwn, _ := m.db.UserPhone.Query().
		Where(userphone.UserID(userID)).
		Count(ctx)
	if existingOwn > 0 {
		return nil, fmt.Errorf("已绑定手机号")
	}

	return m.db.UserPhone.Create().
		SetUserID(userID).
		SetPhone(phone).
		SetVerified(false).
		Save(ctx)
}

func (m *PhoneManager) Verify(ctx context.Context, userID uuid.UUID) error {
	n, err := m.db.UserPhone.Update().
		Where(userphone.UserID(userID)).
		SetVerified(true).
		Save(ctx)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("phone not found")
	}
	return nil
}

func (m *PhoneManager) Unbind(ctx context.Context, userID uuid.UUID) error {
	n, err := m.db.UserPhone.Delete().
		Where(userphone.UserID(userID)).
		Exec(ctx)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("phone not found")
	}
	return nil
}

func (m *PhoneManager) Get(ctx context.Context, userID uuid.UUID) (*ent.UserPhone, error) {
	return m.db.UserPhone.Query().
		Where(userphone.UserID(userID)).
		Only(ctx)
}

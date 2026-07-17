package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/useremail"
)

type EmailManager struct {
	db *ent.Client
}

func NewEmailManager(db *ent.Client) *EmailManager {
	return &EmailManager{db: db}
}

func (m *EmailManager) AddEmail(ctx context.Context, userID uuid.UUID, email string) (*ent.UserEmail, error) {
	existing, _ := m.db.UserEmail.Query().
		Where(useremail.Email(email)).
		Count(ctx)
	if existing > 0 {
		return nil, fmt.Errorf("电子邮件已被使用")
	}

	primaryCount, _ := m.db.UserEmail.Query().
		Where(useremail.UserID(userID), useremail.IsPrimary(true)).
		Count(ctx)
	isPrimary := primaryCount == 0

	return m.db.UserEmail.Create().
		SetUserID(userID).
		SetEmail(email).
		SetIsPrimary(isPrimary).
		SetVerified(false).
		Save(ctx)
}

func (m *EmailManager) SetPrimary(ctx context.Context, userID uuid.UUID, emailID uuid.UUID) error {
	tx, err := m.db.Tx(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.UserEmail.Update().
		Where(useremail.UserID(userID)).
		SetIsPrimary(false).
		Save(ctx)
	if err != nil {
		return err
	}

	n, err := tx.UserEmail.Update().
		Where(useremail.ID(emailID), useremail.UserID(userID)).
		SetIsPrimary(true).
		Save(ctx)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("email not found")
	}

	return tx.Commit()
}

func (m *EmailManager) Delete(ctx context.Context, userID uuid.UUID, emailID uuid.UUID) error {
	entry, err := m.db.UserEmail.Query().
		Where(useremail.ID(emailID), useremail.UserID(userID)).
		Only(ctx)
	if err != nil {
		return fmt.Errorf("email not found")
	}
	if entry.IsPrimary {
		return fmt.Errorf("无法删除主邮箱")
	}
	return m.db.UserEmail.DeleteOne(entry).Exec(ctx)
}

func (m *EmailManager) List(ctx context.Context, userID uuid.UUID) ([]*ent.UserEmail, error) {
	return m.db.UserEmail.Query().
		Where(useremail.UserID(userID)).
		Order(ent.Asc("created_at")).
		All(ctx)
}

func (m *EmailManager) Verify(ctx context.Context, userID uuid.UUID, emailID uuid.UUID) error {
	n, err := m.db.UserEmail.Update().
		Where(useremail.ID(emailID), useremail.UserID(userID)).
		SetVerified(true).
		Save(ctx)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("email not found")
	}
	return nil
}

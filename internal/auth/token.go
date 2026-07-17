package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/personaltoken"
)

type PersonalTokenService struct {
	db *ent.Client
}

func NewPersonalTokenService(db *ent.Client) *PersonalTokenService {
	return &PersonalTokenService{db: db}
}

func (s *PersonalTokenService) Create(ctx context.Context, userID uuid.UUID, name, scopes string, expiresIn *time.Duration) (*ent.PersonalToken, string, error) {
	token, err := generatePersonalToken()
	if err != nil {
		return nil, "", err
	}

	hash := hashPersonalToken(token)
	create := s.db.PersonalToken.Create().
		SetUserID(userID).
		SetName(name).
		SetTokenHash(hash).
		SetScopes(scopes)

	if expiresIn != nil {
		create = create.SetExpiresAt(time.Now().Add(*expiresIn))
	}

	saved, err := create.Save(ctx)
	if err != nil {
		return nil, "", err
	}

	return saved, token, nil
}

func (s *PersonalTokenService) List(ctx context.Context, userID uuid.UUID) ([]*ent.PersonalToken, error) {
	return s.db.PersonalToken.Query().
		Where(personaltoken.UserID(userID)).
		Order(ent.Desc("created_at")).
		All(ctx)
}

func (s *PersonalTokenService) Delete(ctx context.Context, userID, tokenID uuid.UUID) error {
	n, err := s.db.PersonalToken.Delete().
		Where(
			personaltoken.ID(tokenID),
			personaltoken.UserID(userID),
		).
		Exec(ctx)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("token not found")
	}
	return nil
}

func (s *PersonalTokenService) Validate(ctx context.Context, tokenStr string) (*ent.PersonalToken, error) {
	hash := hashPersonalToken(tokenStr)
	t, err := s.db.PersonalToken.Query().
		Where(personaltoken.TokenHash(hash)).
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("invalid token")
	}

	if t.ExpiresAt != nil && t.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("token expired")
	}

	s.db.PersonalToken.UpdateOne(t).
		SetLastUsedAt(time.Now()).
		Exec(ctx)

	return t, nil
}

const tokenChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func generatePersonalToken() (string, error) {
	b := make([]byte, 40)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(tokenChars))))
		if err != nil {
			return "", err
		}
		b[i] = tokenChars[n.Int64()]
	}
	return "oneauth_" + string(b), nil
}

func hashPersonalToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

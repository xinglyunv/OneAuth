package jwt

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenManager struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	issuer     string
	accessTTL  time.Duration
}

type AccessTokenClaims struct {
	jwt.RegisteredClaims
	Scope  string `json:"scope,omitempty"`
	UserID string `json:"user_id,omitempty"`
}

type IDTokenClaims struct {
	jwt.RegisteredClaims
	Email         string `json:"email,omitempty"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name,omitempty"`
	Picture       string `json:"picture,omitempty"`
}

func NewTokenManager(privateKey *rsa.PrivateKey, publicKey *rsa.PublicKey, issuer string, accessTTL time.Duration) *TokenManager {
	return &TokenManager{
		privateKey: privateKey,
		publicKey:  publicKey,
		issuer:     issuer,
		accessTTL:  accessTTL,
	}
}

func GenerateRSAKeyPair() (*rsa.PrivateKey, *rsa.PublicKey, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, fmt.Errorf("generate rsa key: %w", err)
	}
	return privateKey, &privateKey.PublicKey, nil
}

func (tm *TokenManager) GenerateAccessToken(userID, clientID, scope string) (string, error) {
	now := time.Now()
	claims := AccessTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tm.issuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{clientID},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.accessTTL)),
			ID:        uuid.New().String(),
		},
		Scope:  scope,
		UserID: userID,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = computeKeyID(tm.publicKey)

	return token.SignedString(tm.privateKey)
}

func (tm *TokenManager) GenerateIDToken(userID, clientID, email, name, picture string, emailVerified bool) (string, error) {
	now := time.Now()
	claims := IDTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tm.issuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{clientID},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.accessTTL)),
			ID:        uuid.New().String(),
		},
		Email:         email,
		EmailVerified: emailVerified,
		Name:          name,
		Picture:       picture,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = computeKeyID(tm.publicKey)

	return token.SignedString(tm.privateKey)
}

func (tm *TokenManager) VerifyToken(tokenString string) (*AccessTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AccessTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return tm.publicKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func (tm *TokenManager) GetPublicKey() *rsa.PublicKey {
	return tm.publicKey
}

func (tm *TokenManager) GetPrivateKey() *rsa.PrivateKey {
	return tm.privateKey
}

func computeKeyID(pub *rsa.PublicKey) string {
	der, _ := base64.StdEncoding.DecodeString(base64EncodePublicKey(pub))
	h := sha256.Sum256(der)
	return base64.RawURLEncoding.EncodeToString(h[:])
}

func base64EncodePublicKey(pub *rsa.PublicKey) string {
	n := pub.N.Bytes()
	e := bigEndian(pub.E)
	encoded := base64.StdEncoding.EncodeToString(append(n, e...))
	return encoded
}

func bigEndian(n int) []byte {
	if n < 256 {
		return []byte{byte(n)}
	}
	return []byte{byte(n >> 8), byte(n)}
}

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type JWK struct {
	KTY string `json:"kty"`
	Use string `json:"use"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (tm *TokenManager) JWKS() (*JWKS, error) {
	key := JWK{
		KTY: "RSA",
		Use: "sig",
		Kid: computeKeyID(tm.publicKey),
		Alg: "RS256",
		N:   base64.RawURLEncoding.EncodeToString(tm.publicKey.N.Bytes()),
		E:   base64.RawURLEncoding.EncodeToString(bigEndian(tm.publicKey.E)),
	}

	return &JWKS{
		Keys: []JWK{key},
	}, nil
}

func (tm *TokenManager) JWKSJSON() ([]byte, error) {
	jwks, err := tm.JWKS()
	if err != nil {
		return nil, err
	}
	return json.Marshal(jwks)
}

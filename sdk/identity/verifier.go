package identity

import (
	"context"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type JWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type TokenVerifier struct {
	jwksURL    string
	httpClient *http.Client
	keys       map[string]*rsa.PublicKey
	mu         sync.RWMutex
	fetchTime  time.Time
	ttl        time.Duration
}

func NewTokenVerifier(jwksURL string) (*TokenVerifier, error) {
	tv := &TokenVerifier{
		jwksURL:    jwksURL,
		httpClient: http.DefaultClient,
		keys:       make(map[string]*rsa.PublicKey),
		ttl:        5 * time.Minute,
	}
	if err := tv.fetchKeys(); err != nil {
		return nil, fmt.Errorf("initial JWKS fetch: %w", err)
	}
	return tv, nil
}

func (tv *TokenVerifier) Verify(ctx context.Context, tokenString string) (jwt.MapClaims, error) {
	kid, err := extractKID(tokenString)
	if err != nil {
		return nil, err
	}
	if err := tv.ensureKeysFresh(); err != nil {
		return nil, err
	}
	tv.mu.RLock()
	key, exists := tv.keys[kid]
	tv.mu.RUnlock()
	if !exists {
		if err := tv.fetchKeys(); err != nil {
			return nil, fmt.Errorf("fetch keys for kid=%s: %w", kid, err)
		}
		tv.mu.RLock()
		key, exists = tv.keys[kid]
		tv.mu.RUnlock()
		if !exists {
			return nil, fmt.Errorf("key not found: kid=%s", kid)
		}
	}
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithAudience(""),
	)
	token, err := parser.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		return key, nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims type")
	}
	if exp, ok := claims["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			return nil, fmt.Errorf("token expired")
		}
	}
	return claims, nil
}

func (tv *TokenVerifier) ensureKeysFresh() error {
	tv.mu.RLock()
	age := time.Since(tv.fetchTime)
	tv.mu.RUnlock()
	if age > tv.ttl {
		return tv.fetchKeys()
	}
	return nil
}

func (tv *TokenVerifier) fetchKeys() error {
	resp, err := tv.httpClient.Get(tv.jwksURL)
	if err != nil {
		return fmt.Errorf("fetch JWKS: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read JWKS: %w", err)
	}
	var jwks JWKS
	if err := json.Unmarshal(body, &jwks); err != nil {
		return fmt.Errorf("parse JWKS: %w", err)
	}
	keys := make(map[string]*rsa.PublicKey, len(jwks.Keys))
	for _, jwk := range jwks.Keys {
		if jwk.Kty != "RSA" {
			continue
		}
		nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
		if err != nil {
			continue
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
		if err != nil {
			continue
		}
		key := &rsa.PublicKey{
			N: new(big.Int).SetBytes(nBytes),
			E: int(new(big.Int).SetBytes(eBytes).Int64()),
		}
		keys[jwk.Kid] = key
	}
	tv.mu.Lock()
	tv.keys = keys
	tv.fetchTime = time.Now()
	tv.mu.Unlock()
	return nil
}

func extractKID(tokenString string) (string, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return "", fmt.Errorf("invalid JWT format")
	}
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("decode header: %w", err)
	}
	var header struct {
		Kid string `json:"kid"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return "", fmt.Errorf("parse header: %w", err)
	}
	if header.Kid == "" {
		// compute thumbprint as fallback
		kid := sha256.Sum256(headerBytes)
		return base64.RawURLEncoding.EncodeToString(kid[:]), nil
	}
	return header.Kid, nil
}
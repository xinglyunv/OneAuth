package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type TokenSet struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	IDToken      string `json:"id_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
	Expiry       time.Time
}

func (t *TokenSet) IsExpired() bool {
	return !t.Expiry.IsZero() && time.Now().After(t.Expiry)
}

type OIDCConfig struct {
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserInfoEndpoint      string `json:"userinfo_endpoint"`
	JWKSUri               string `json:"jwks_uri"`
	ScopesSupported       []string `json:"scopes_supported"`
}

type Client struct {
	issuerURL    string
	clientID     string
	clientSecret string
	redirectURI  string
	scopes       []string
	httpClient   *http.Client
	oidcConfig   *OIDCConfig
	mu           sync.RWMutex
	loadOnce     sync.Once
}

type ClientOption func(*Client)

func WithClientSecret(secret string) ClientOption {
	return func(c *Client) { c.clientSecret = secret }
}

func WithScopes(scopes ...string) ClientOption {
	return func(c *Client) { c.scopes = scopes }
}

func WithHTTPClient(hc *http.Client) ClientOption {
	return func(c *Client) { c.httpClient = hc }
}

func New(issuerURL, clientID, redirectURI string, opts ...ClientOption) *Client {
	c := &Client{
		issuerURL:   strings.TrimRight(issuerURL, "/"),
		clientID:    clientID,
		redirectURI: redirectURI,
		scopes:      []string{"openid", "profile", "email"},
		httpClient:  http.DefaultClient,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func (c *Client) loadOIDCConfig(ctx context.Context) error {
	var err error
	c.loadOnce.Do(func() {
		discURL := c.issuerURL + "/.well-known/openid-configuration"
		req, reqErr := http.NewRequestWithContext(ctx, http.MethodGet, discURL, nil)
		if reqErr != nil {
			err = fmt.Errorf("create discovery request: %w", reqErr)
			return
		}
		resp, doErr := c.httpClient.Do(req)
		if doErr != nil {
			err = fmt.Errorf("fetch OIDC config: %w", doErr)
			return
		}
		defer resp.Body.Close()
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			err = fmt.Errorf("read OIDC config: %w", readErr)
			return
		}
		var cfg OIDCConfig
		if jsonErr := json.Unmarshal(body, &cfg); jsonErr != nil {
			err = fmt.Errorf("parse OIDC config: %w", jsonErr)
			return
		}
		c.mu.Lock()
		c.oidcConfig = &cfg
		c.mu.Unlock()
	})
	return err
}

func (c *Client) getOIDCConfig(ctx context.Context) (*OIDCConfig, error) {
	c.mu.RLock()
	cfg := c.oidcConfig
	c.mu.RUnlock()
	if cfg != nil {
		return cfg, nil
	}
	if err := c.loadOIDCConfig(ctx); err != nil {
		return nil, err
	}
	c.mu.RLock()
	cfg = c.oidcConfig
	c.mu.RUnlock()
	return cfg, nil
}

func GeneratePKCE() (codeVerifier, codeChallenge string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generate random bytes: %w", err)
	}
	codeVerifier = base64.RawURLEncoding.EncodeToString(b)
	h := sha256.Sum256([]byte(codeVerifier))
	codeChallenge = base64.RawURLEncoding.EncodeToString(h[:])
	return
}

func (c *Client) AuthCodeURL(ctx context.Context, state, codeChallenge string) (string, error) {
	cfg, err := c.getOIDCConfig(ctx)
	if err != nil {
		return "", err
	}
	v := url.Values{
		"response_type":         {"code"},
		"client_id":             {c.clientID},
		"redirect_uri":          {c.redirectURI},
		"scope":                 {strings.Join(c.scopes, " ")},
		"state":                 {state},
		"code_challenge_method": {"S256"},
		"code_challenge":        {codeChallenge},
	}
	return cfg.AuthorizationEndpoint + "?" + v.Encode(), nil
}

func (c *Client) Exchange(ctx context.Context, code, codeVerifier string) (*TokenSet, error) {
	cfg, err := c.getOIDCConfig(ctx)
	if err != nil {
		return nil, err
	}
	v := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {c.redirectURI},
		"client_id":     {c.clientID},
		"code_verifier": {codeVerifier},
	}
	if c.clientSecret != "" {
		v.Set("client_secret", c.clientSecret)
	}
	return c.requestToken(ctx, cfg.TokenEndpoint, v)
}

func (c *Client) RefreshToken(ctx context.Context, refreshToken string) (*TokenSet, error) {
	cfg, err := c.getOIDCConfig(ctx)
	if err != nil {
		return nil, err
	}
	v := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {c.clientID},
	}
	if c.clientSecret != "" {
		v.Set("client_secret", c.clientSecret)
	}
	return c.requestToken(ctx, cfg.TokenEndpoint, v)
}

func (c *Client) RevokeToken(ctx context.Context, token string) error {
	v := url.Values{
		"token":     {token},
		"client_id": {c.clientID},
	}
	if c.clientSecret != "" {
		v.Set("client_secret", c.clientSecret)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.issuerURL+"/oauth/revoke", strings.NewReader(v.Encode()))
	if err != nil {
		return fmt.Errorf("create revoke request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("revoke token: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("revoke token failed: %s", string(body))
	}
	return nil
}

func (c *Client) UserInfo(ctx context.Context, accessToken string) (map[string]interface{}, error) {
	cfg, err := c.getOIDCConfig(ctx)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.UserInfoEndpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch userinfo: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("userinfo failed: %s", string(body))
	}
	var info map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("parse userinfo: %w", err)
	}
	return info, nil
}

func (c *Client) Introspect(ctx context.Context, token string) (map[string]interface{}, error) {
	v := url.Values{
		"token":     {token},
		"client_id": {c.clientID},
	}
	if c.clientSecret != "" {
		v.Set("client_secret", c.clientSecret)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.issuerURL+"/oauth/introspect", strings.NewReader(v.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create introspect request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("introspect token: %w", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("parse introspect: %w", err)
	}
	return result, nil
}

func (c *Client) requestToken(ctx context.Context, endpoint string, v url.Values) (*TokenSet, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(v.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token request failed (%d): %s", resp.StatusCode, string(body))
	}
	var ts TokenSet
	if err := json.Unmarshal(body, &ts); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}
	if ts.ExpiresIn > 0 {
		ts.Expiry = time.Now().Add(time.Duration(ts.ExpiresIn) * time.Second)
	}
	return &ts, nil
}
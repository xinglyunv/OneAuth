package oauth2

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/authorizationcode"
	"github.com/identity-platform/internal/ent/oauthclient"
	"github.com/identity-platform/internal/ent/oauthconsent"
	"github.com/identity-platform/internal/ent/refreshtoken"
	"github.com/identity-platform/internal/pkg/crypto"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	pboauth2 "github.com/identity-platform/proto/oauth2"
	"go.uber.org/zap"
)

type Service struct {
	pboauth2.UnimplementedOAuth2ServiceServer
	client *ent.Client
	jwt    *jwtpkg.TokenManager
	logger *zap.Logger
}

func NewService(client *ent.Client, jwt *jwtpkg.TokenManager, logger *zap.Logger) *Service {
	return &Service{client: client, jwt: jwt, logger: logger}
}

func (s *Service) CreateApp(ctx context.Context, req *pboauth2.CreateAppRequest) (*pboauth2.CreateAppResponse, error) {
	clientID, err := generateClientID()
	if err != nil {
		return nil, fmt.Errorf("generate client id: %w", err)
	}
	clientSecret, err := generateClientSecret()
	if err != nil {
		return nil, fmt.Errorf("generate client secret: %w", err)
	}
	secretHash := hashSecret(clientSecret)

	ownerID, err := uuid.Parse(req.OwnerId)
	if err != nil {
		return nil, errors.New("invalid owner id")
	}

	scopes := req.AllowedScopes
	if len(scopes) == 0 {
		scopes = []string{"openid", "profile", "email"}
	}

	_, err = s.client.OAuthClient.Create().
		SetClientID(clientID).
		SetName(req.Name).
		SetDescription(req.Description).
		SetClientType(oauthclient.ClientTypeConfidential).
		SetClientSecretHash(secretHash).
		SetCreatedBy(ownerID).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create app: %w", err)
	}

	for _, uri := range req.RedirectUris {
		s.client.OAuthRedirectURI.Create().
			SetClientID(ownerID).
			SetRedirectURI(uri).
			Save(ctx)
	}

	return &pboauth2.CreateAppResponse{
		ClientId:     clientID,
		ClientSecret: clientSecret,
	}, nil
}

func (s *Service) GetApp(ctx context.Context, req *pboauth2.GetAppRequest) (*pboauth2.GetAppResponse, error) {
	app, err := s.client.OAuthClient.Query().Where(oauthclient.ClientIDEQ(req.ClientId)).Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("get app: %w", err)
	}

	uris, _ := s.client.OAuthRedirectURI.Query().All(ctx)
	var redirectURIs []string
	for _, u := range uris {
		redirectURIs = append(redirectURIs, u.RedirectURI)
	}

	return &pboauth2.GetAppResponse{
		ClientId:     app.ClientID,
		Name:         app.Name,
		Description:  app.Description,
		RedirectUris: redirectURIs,
		Status:       string(app.Status),
		CreatedAt:    app.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *Service) ListApps(ctx context.Context, req *pboauth2.ListAppsRequest) (*pboauth2.ListAppsResponse, error) {
	query := s.client.OAuthClient.Query()
	if req.OwnerId != "" {
		ownerID, err := uuid.Parse(req.OwnerId)
		if err != nil {
			return nil, errors.New("invalid owner id")
		}
		query = query.Where(oauthclient.CreatedByEQ(ownerID))
	}

	apps, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list apps: %w", err)
	}

	var resp []*pboauth2.GetAppResponse
	for _, app := range apps {
		resp = append(resp, &pboauth2.GetAppResponse{
			ClientId:  app.ClientID,
			Name:      app.Name,
			Status:    string(app.Status),
			CreatedAt: app.CreatedAt.Format(time.RFC3339),
		})
	}

	return &pboauth2.ListAppsResponse{Apps: resp, Total: int32(len(resp))}, nil
}

func (s *Service) UpdateApp(ctx context.Context, req *pboauth2.UpdateAppRequest) (*pboauth2.UpdateAppResponse, error) {
	app, err := s.client.OAuthClient.Query().Where(oauthclient.ClientIDEQ(req.ClientId)).Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("get app: %w", err)
	}

	_, err = s.client.OAuthClient.UpdateOne(app).
		SetNillableName(nilStr(req.Name)).
		SetNillableDescription(nilStr(req.Description)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("update app: %w", err)
	}

	return &pboauth2.UpdateAppResponse{Message: "app updated"}, nil
}

func (s *Service) GenerateClientSecret(ctx context.Context, req *pboauth2.GenerateClientSecretRequest) (*pboauth2.GenerateClientSecretResponse, error) {
	app, err := s.client.OAuthClient.Query().Where(oauthclient.ClientIDEQ(req.ClientId)).Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("get app: %w", err)
	}

	clientSecret, err := generateClientSecret()
	if err != nil {
		return nil, fmt.Errorf("generate secret: %w", err)
	}
	secretHash := hashSecret(clientSecret)

	_, err = s.client.OAuthClient.UpdateOne(app).
		SetClientSecretHash(secretHash).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("update secret: %w", err)
	}

	return &pboauth2.GenerateClientSecretResponse{ClientSecret: clientSecret}, nil
}

func (s *Service) Authorize(ctx context.Context, req *pboauth2.AuthorizeRequest) (*pboauth2.AuthorizeResponse, error) {
	app, err := s.client.OAuthClient.Query().Where(oauthclient.ClientIDEQ(req.ClientId)).Only(ctx)
	if err != nil {
		return nil, errors.New("invalid client_id")
	}

	if string(app.Status) != "active" {
		return nil, errors.New("client is disabled")
	}

	uid, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	u, err := s.client.User.Get(ctx, uid)
	if err != nil {
		return nil, errors.New("user not found")
	}
	_ = u

	scopes := parseScopes(req.Scope)

	if req.CodeChallenge != "" && req.CodeChallengeMethod != "S256" {
		return nil, errors.New("only S256 code challenge method is supported")
	}

	code, err := generateAuthCode()
	if err != nil {
		return nil, fmt.Errorf("generate code: %w", err)
	}
	codeHash := hashToken(code)

	_, err = s.client.AuthorizationCode.Create().
		SetCodeHash(codeHash).
		SetClientID(app.ID).
		SetUserID(uid).
		SetRedirectURI(req.RedirectUri).
		SetScopes(scopes).
		SetNillableCodeChallenge(nilStr(req.CodeChallenge)).
		SetNillableCodeChallengeMethod(nilStr(req.CodeChallengeMethod)).
		SetExpiresAt(time.Now().Add(10 * time.Minute)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("save auth code: %w", err)
	}

	existing, _ := s.client.OAuthConsent.Query().
		Where(oauthconsent.UserIDEQ(uid), oauthconsent.ClientIDEQ(app.ID)).
		Only(ctx)
	if existing == nil {
		s.client.OAuthConsent.Create().
			SetUserID(uid).
			SetClientID(app.ID).
			SetScopes(scopes).
			Save(ctx)
	}

	redirectURI := fmt.Sprintf("%s?code=%s&state=%s", req.RedirectUri, code, req.State)

	return &pboauth2.AuthorizeResponse{
		Code:        code,
		RedirectUri: redirectURI,
		State:       req.State,
	}, nil
}

func (s *Service) Token(ctx context.Context, req *pboauth2.TokenRequest) (*pboauth2.TokenResponse, error) {
	switch req.GrantType {
	case "authorization_code":
		return s.handleAuthorizationCodeGrant(ctx, req)
	case "refresh_token":
		return s.handleRefreshTokenGrant(ctx, req)
	default:
		return nil, fmt.Errorf("unsupported grant_type: %s", req.GrantType)
	}
}

func (s *Service) handleAuthorizationCodeGrant(ctx context.Context, req *pboauth2.TokenRequest) (*pboauth2.TokenResponse, error) {
	codeHash := hashToken(req.Code)

	authCode, err := s.client.AuthorizationCode.Query().
		Where(authorizationcode.CodeHashEQ(codeHash)).
		Only(ctx)
	if err != nil {
		return nil, errors.New("invalid authorization code")
	}

	if authCode.UsedAt != nil || time.Now().After(authCode.ExpiresAt) {
		return nil, errors.New("authorization code expired or used")
	}

	if authCode.CodeChallenge != "" {
		if !crypto.VerifyCodeChallenge(req.CodeVerifier, authCode.CodeChallenge) {
			return nil, errors.New("invalid code verifier")
		}
	}

	app, err := s.client.OAuthClient.Get(ctx, authCode.ClientID)
	if err != nil {
		return nil, errors.New("invalid client")
	}

	if err := verifyClientSecret(app.ClientSecretHash, req.ClientSecret); err != nil {
		return nil, errors.New("invalid client credentials")
	}

	_, err = s.client.AuthorizationCode.UpdateOne(authCode).
		SetUsedAt(time.Now()).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("mark code used: %w", err)
	}

	u, err := s.client.User.Get(ctx, authCode.UserID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	scope := strings.Join(authCode.Scopes, " ")
	accessToken, err := s.jwt.GenerateAccessToken(u.ID.String(), app.ClientID, scope)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	idToken, err := s.jwt.GenerateIDToken(u.ID.String(), app.ClientID, u.Email, u.Username, "", u.EmailVerified)
	if err != nil {
		return nil, fmt.Errorf("generate id token: %w", err)
	}

	refreshToken, err := generateRefreshTokenStr()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}
	refreshHash := hashToken(refreshToken)
	familyID := uuid.New()

	_, err = s.client.RefreshToken.Create().
		SetTokenHash(refreshHash).
		SetFamilyID(familyID).
		SetUserID(u.ID).
		SetClientID(app.ID).
		SetScopes(authCode.Scopes).
		SetExpiresAt(time.Now().Add(30 * 24 * time.Hour)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("save refresh token: %w", err)
	}

	return &pboauth2.TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    900,
		RefreshToken: refreshToken,
		IdToken:      idToken,
		Scope:        scope,
	}, nil
}

func (s *Service) handleRefreshTokenGrant(ctx context.Context, req *pboauth2.TokenRequest) (*pboauth2.TokenResponse, error) {
	rtHash := hashToken(req.RefreshToken)

	rt, err := s.client.RefreshToken.Query().
		Where(refreshtoken.TokenHashEQ(rtHash)).
		Only(ctx)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	if rt.RevokedAt != nil {
		s.revokeTokenFamily(ctx, rt.FamilyID)
		return nil, errors.New("refresh token revoked - possible token theft detected")
	}

	if time.Now().After(rt.ExpiresAt) {
		s.revokeTokenFamily(ctx, rt.FamilyID)
		return nil, errors.New("refresh token expired")
	}

	_, err = s.client.RefreshToken.UpdateOne(rt).
		SetRevokedAt(time.Now()).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("revoke old refresh token: %w", err)
	}

	u, err := s.client.User.Get(ctx, rt.UserID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	scope := strings.Join(rt.Scopes, " ")
	accessToken, err := s.jwt.GenerateAccessToken(u.ID.String(), rt.ClientID.String(), scope)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	newRefreshToken, err := generateRefreshTokenStr()
	if err != nil {
		return nil, fmt.Errorf("generate new refresh token: %w", err)
	}
	newHash := hashToken(newRefreshToken)

	_, err = s.client.RefreshToken.Create().
		SetTokenHash(newHash).
		SetFamilyID(rt.FamilyID).
		SetUserID(u.ID).
		SetClientID(rt.ClientID).
		SetScopes(rt.Scopes).
		SetExpiresAt(time.Now().Add(30 * 24 * time.Hour)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("save new refresh token: %w", err)
	}

	return &pboauth2.TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    900,
		RefreshToken: newRefreshToken,
		Scope:        scope,
	}, nil
}

func (s *Service) UserInfo(ctx context.Context, req *pboauth2.UserInfoRequest) (*pboauth2.UserInfoResponse, error) {
	claims, err := s.jwt.VerifyToken(req.AccessToken)
	if err != nil {
		return nil, errors.New("invalid access token")
	}

	uid, err := uuid.Parse(claims.Subject)
	if err != nil {
		return nil, errors.New("invalid token subject")
	}

	u, err := s.client.User.Get(ctx, uid)
	if err != nil {
		return nil, errors.New("user not found")
	}

	return &pboauth2.UserInfoResponse{
		Sub:           u.ID.String(),
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
		Name:          u.Username,
	}, nil
}

func (s *Service) Introspect(ctx context.Context, req *pboauth2.IntrospectRequest) (*pboauth2.IntrospectResponse, error) {
	claims, err := s.jwt.VerifyToken(req.Token)
	if err != nil {
		return &pboauth2.IntrospectResponse{Active: false}, nil
	}

	return &pboauth2.IntrospectResponse{
		Active:    true,
		Scope:     claims.Scope,
		UserId:    claims.Subject,
		TokenType: "Bearer",
	}, nil
}

func (s *Service) Revoke(ctx context.Context, req *pboauth2.RevokeRequest) (*pboauth2.RevokeResponse, error) {
	tokenHash := hashToken(req.Token)

	rt, err := s.client.RefreshToken.Query().
		Where(refreshtoken.TokenHashEQ(tokenHash)).
		Only(ctx)
	if err != nil {
		return &pboauth2.RevokeResponse{Message: "token revoked or not found"}, nil
	}

	s.revokeTokenFamily(ctx, rt.FamilyID)
	return &pboauth2.RevokeResponse{Message: "token revoked"}, nil
}

func (s *Service) ListUserAuthorizations(ctx context.Context, req *pboauth2.ListUserAuthorizationsRequest) (*pboauth2.ListUserAuthorizationsResponse, error) {
	uid, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	consents, err := s.client.OAuthConsent.Query().
		Where(oauthconsent.UserIDEQ(uid), oauthconsent.StatusEQ(oauthconsent.StatusApproved)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("query consents: %w", err)
	}

	var auths []*pboauth2.UserAuthorization
	for _, c := range consents {
		app, _ := s.client.OAuthClient.Get(ctx, c.ClientID)
		appName := ""
		if app != nil {
			appName = app.Name
		}
		auths = append(auths, &pboauth2.UserAuthorization{
			ClientId:  c.ClientID.String(),
			AppName:   appName,
			Scopes:    c.Scopes,
			CreatedAt: c.CreatedAt.Format(time.RFC3339),
		})
	}

	return &pboauth2.ListUserAuthorizationsResponse{Authorizations: auths}, nil
}

func (s *Service) RevokeUserAuthorization(ctx context.Context, req *pboauth2.RevokeUserAuthorizationRequest) (*pboauth2.RevokeUserAuthorizationResponse, error) {
	uid, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.New("invalid user id")
	}
	cid, err := uuid.Parse(req.ClientId)
	if err != nil {
		return nil, errors.New("invalid client id")
	}

	_, err = s.client.OAuthConsent.Update().
		Where(oauthconsent.UserIDEQ(uid), oauthconsent.ClientIDEQ(cid)).
		SetStatus(oauthconsent.StatusRevoked).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("revoke consent: %w", err)
	}

	_, err = s.client.RefreshToken.Update().
		Where(refreshtoken.UserIDEQ(uid), refreshtoken.ClientIDEQ(cid), refreshtoken.RevokedAtIsNil()).
		SetRevokedAt(time.Now()).
		Save(ctx)
	if err != nil {
		s.logger.Warn("failed to revoke tokens", zap.Error(err))
	}

	return &pboauth2.RevokeUserAuthorizationResponse{Message: "authorization revoked"}, nil
}

func (s *Service) revokeTokenFamily(ctx context.Context, familyID uuid.UUID) {
	s.client.RefreshToken.Update().
		Where(refreshtoken.FamilyIDEQ(familyID), refreshtoken.RevokedAtIsNil()).
		SetRevokedAt(time.Now()).
		Save(ctx)
}

func generateClientID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("client_%s", base64.RawURLEncoding.EncodeToString(b)), nil
}

func generateClientSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func generateAuthCode() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func generateRefreshTokenStr() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashSecret(secret string) string {
	h := sha256.Sum256([]byte(secret))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

func verifyClientSecret(storedHash, provided string) error {
	if storedHash == "" {
		return nil
	}
	if provided == "" {
		return errors.New("missing secret")
	}
	providedHash := hashSecret(provided)
	if subtle.ConstantTimeCompare([]byte(storedHash), []byte(providedHash)) != 1 {
		return errors.New("secret mismatch")
	}
	return nil
}

func parseScopes(scope string) []string {
	if scope == "" {
		return []string{"openid"}
	}
	return strings.Fields(scope)
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

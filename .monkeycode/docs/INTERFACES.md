# 接口文档

OneAuth 提供三类接口：REST API（主接口）、gRPC API（内部 RPC）和 Go SDK（第三方集成）。

## 认证与鉴权

### JWT 令牌

API 使用 Bearer Token（JWT RS256）认证。

```http
Authorization: Bearer <access_token>
```

**Token 格式**:
- Access Token: 有效期 15 分钟，含 `user_id`, `subject`, `scope` 声明
- Refresh Token: 有效期 30 天，支持 Family-based Rotation
- Admin Token: `scope=admin` 声明（通过管理员独立认证获得）

### 角色鉴权

| 角色 | 可访问区域 | 说明 |
|------|-----------|------|
| USER | `/api/user/*` | 个人资料、MFA、设备、会话、邮箱、令牌 |
| DEVELOPER | `/api/user/*`, `/api/apps/*`, `/api/webhooks/*` | 以上全部 + OAuth 应用和 Webhook 管理 |
| ADMIN | `/api/admin/*` | 独立 `AdminJWTAuth` 中间件，scope = admin |
| SUPER_ADMIN | `/api/admin/*` | 全部管理员能力 |

---

## REST API

### 健康检查

```http
GET /health
```

**响应**: `200 OK`

---

### 认证接口

#### 用户注册

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**响应**: `200 OK`
```json
{
  "user_id": "uuid-string",
  "email": "user@example.com",
  "username": "johndoe",
  "status": "active",
  "message": "registration successful"
}
```

#### 用户登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "device_name": "Chrome on macOS",
  "device_fingerprint": "optional-fingerprint-hash"
}
```

**响应（无 MFA）**: `200 OK`
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "rft_xxx",
  "session_id": "uuid",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

**响应（需 MFA）**: `200 OK`
```json
{
  "mfa_required": true,
  "mfa_session_token": "mfa_temp_token"
}
```

#### MFA 验证（登录第二步）

```http
POST /api/auth/mfa/validate
Content-Type: application/json

{
  "mfa_session_token": "mfa_temp_token",
  "code": "123456"
}
```

**响应**: `200 OK`（同登录成功响应）

#### OAuth 第三方登录

```http
POST /api/auth/oauth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**限制**: DEVELOPER 和 ADMIN 角色拒绝登录（返回 403），仅 USER 角色可通过。
**响应**: 同标准登录响应。

#### OAuth 第三方注册

```http
POST /api/auth/oauth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**响应**: 同标准注册响应。仅分配 USER 角色。

#### 用户登出

```http
POST /api/auth/logout
Content-Type: application/json

{
  "session_id": "uuid"
}
```

**响应**: `200 OK`

#### 修改密码

```http
PUT /api/user/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "old_password": "old",
  "new_password": "new123!"
}
```

**响应**: `200 OK`

#### 邮箱验证

```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification_token"
}
```

#### 密码重置

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "password": "newSecurePass123!"
}
```

---

### 用户资源接口

以下接口需要 `Authorization: Bearer <token>`，角色要求: USER 或 DEVELOPER。

#### 获取当前用户信息

```http
GET /api/me
```

**响应**:
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "status": "active",
  "role": "USER",
  "roles": ["USER"],
  "app_count": 0,
  "created_at": "2026-07-17T00:00:00Z",
  "profile": {
    "display_name": "John",
    "avatar_url": "",
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai"
  }
}
```

#### 个人资料

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 获取个人资料 |
| PUT | `/api/user/profile` | 更新个人资料（display_name, avatar_url, locale, timezone） |

#### MFA 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/mfa/enable` | 启用 MFA，返回 TOTP secret 和 QR 码 URL |
| POST | `/api/user/mfa/disable` | 禁用 MFA（需验证 TOTP code） |
| POST | `/api/user/mfa/backup-codes` | 生成备用恢复码 |
| GET | `/api/user/mfa/backup-codes/status` | 查询剩余备用码数量 |

**启用 MFA 响应**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_url": "otpauth://totp/...",
  "backup_codes": ["XXXX-XXXX-XXXX", ...]
}
```

#### 会话管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/sessions` | 列出所有活跃会话 |
| DELETE | `/api/user/sessions/:id` | 撤销指定会话 |

**会话响应**:
```json
[
  {
    "session_id": "uuid",
    "device_name": "Chrome on macOS",
    "os": "macOS",
    "browser": "Chrome",
    "ip_address": "192.168.1.1",
    "is_current": true,
    "created_at": "2026-07-17T00:00:00Z"
  }
]
```

#### 设备管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/devices` | 列出所有受信任设备 |
| DELETE | `/api/user/devices/:id` | 删除设备并撤销关联会话 |
| POST | `/api/user/devices/logout-all` | 撤销所有设备的所有活跃会话 |

#### 邮箱管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/emails` | 列出所有邮箱 |
| POST | `/api/user/emails` | 添加新邮箱 |
| PUT | `/api/user/emails/:id/primary` | 设置主邮箱 |
| DELETE | `/api/user/emails/:id` | 删除邮箱（禁止删除主邮箱） |
| POST | `/api/user/emails/:id/verify` | 发送验证邮件 |

#### 手机号管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/phone/bind` | 绑定手机号 |
| POST | `/api/user/phone/verify` | 验证手机号 |
| POST | `/api/user/phone/unbind` | 解绑手机号 |

#### 个人访问令牌

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/tokens` | 创建个人令牌（`oneauth_` 前缀） |
| GET | `/api/user/tokens` | 列出所有令牌 |
| DELETE | `/api/user/tokens/:id` | 删除令牌 |

#### 授权应用

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/authorized-apps` | 列出已授权的 OAuth 应用 |
| DELETE | `/api/user/authorized-apps/:clientId` | 撤销应用授权 |

#### 登录活动

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/login-activity` | 分页查询登录历史（支持 page, size 参数） |

---

### OAuth 应用接口

以下接口需要 `Authorization: Bearer <token>`，角色要求: DEVELOPER。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/apps` | 创建 OAuth 应用 |
| GET | `/api/apps` | 列出我的应用 |
| GET | `/api/apps/:id` | 获取应用详情 |
| PUT | `/api/apps/:id` | 更新应用信息 |
| DELETE | `/api/apps/:id` | 删除应用 |
| POST | `/api/apps/:id/rotate-secret` | 轮换客户端密钥 |

**创建应用请求**:
```json
{
  "name": "My App",
  "description": "应用描述",
  "redirect_uris": ["https://example.com/callback"]
}
```

**创建应用响应**:
```json
{
  "client_id": "random-client-id",
  "client_secret": "random-secret-will-only-show-once",
  "name": "My App"
}
```

---

### Webhook 接口

以下接口需要 `Authorization: Bearer <token>`，角色要求: DEVELOPER。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/webhooks` | 创建 Webhook |
| GET | `/api/webhooks` | 列出 Webhook |
| DELETE | `/api/webhooks/:id` | 删除 Webhook |

注意: webhook 回调使用 HMAC SHA256 签名，通过 `X-OneAuth-Signature` 请求头发送。

---

### 管理员接口

管理员接口需要 `scope=admin` 的 JWT，通过 `/api/admin/login` 获得。

#### 管理员登录

```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**响应**: `200 OK`
```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "admin"
}
```

#### 管理仪表盘

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/dashboard` | 系统概览统计 |

#### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表（支持分页） |
| GET | `/api/admin/users/:id` | 用户详情 |
| POST | `/api/admin/users/:id/toggle-status` | 启用/禁用用户 |
| DELETE | `/api/admin/users/:id` | 删除用户 |
| POST | `/api/admin/users/:id/force-logout` | 强制用户登出所有设备 |
| POST | `/api/admin/users/:id/reset-password` | 管理员重置用户密码 |

#### OAuth 应用审核

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/apps` | 应用列表 |
| POST | `/api/admin/apps/:id/approve` | 审核通过应用 |
| POST | `/api/admin/apps/:id/reject` | 拒绝应用 |

#### 组织管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/organizations` | 组织列表 |
| POST | `/api/admin/organizations` | 创建组织 |
| GET | `/api/admin/organizations/:id` | 组织详情 |
| PUT | `/api/admin/organizations/:id` | 更新组织 |
| DELETE | `/api/admin/organizations/:id` | 删除组织 |
| GET | `/api/admin/organizations/:id/members` | 组织成员列表 |
| POST | `/api/admin/organizations/:id/members` | 添加成员 |
| DELETE | `/api/admin/organizations/:id/members/:userId` | 移除成员 |

#### RBAC 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/roles` | 角色列表 |
| POST | `/api/admin/roles` | 创建角色 |
| DELETE | `/api/admin/roles/:id` | 删除角色 |
| GET | `/api/admin/roles/:id/permissions` | 获取角色权限 |
| POST | `/api/admin/roles/:id/permissions` | 分配权限 |
| GET | `/api/admin/permissions` | 权限列表 |
| POST | `/api/admin/permissions` | 创建权限 |
| DELETE | `/api/admin/permissions/:id` | 删除权限 |

#### 审计日志

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/audit-logs` | 审计日志列表 |
| GET | `/api/admin/audit-logs/search` | 搜索审计日志 |

#### 安全策略

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/security/login-failures` | 登录失败记录 |
| GET | `/api/admin/security/ip-rules` | IP 黑白名单规则 |
| POST | `/api/admin/security/ip-rules` | 创建 IP 规则 |
| DELETE | `/api/admin/security/ip-rules/:id` | 删除 IP 规则 |

#### 系统配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/settings` | 获取系统配置 |
| PUT | `/api/admin/settings` | 更新系统配置 |
| DELETE | `/api/admin/settings/:key` | 删除配置项 |

#### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/tokens` | 列出所有活跃 Refersh Token |
| POST | `/api/admin/tokens/:id/revoke` | 撤销 Token |
| GET | `/api/admin/sessions` | 列出全部活跃会话 |
| DELETE | `/api/admin/sessions/:id` | 强制终止会话 |
| GET | `/api/admin/health` | 服务健康检查 |
| GET | `/api/admin/scopes` | Scope 列表 |
| POST | `/api/admin/scopes` | 创建 Scope |
| DELETE | `/api/admin/scopes/:id` | 删除 Scope |

---

## OAuth 2.1 接口

### OIDC 发现

```http
GET /.well-known/openid-configuration
```

**响应**: OpenID Connect Discovery 文档（issuer, jwks_uri, authorization_endpoint, token_endpoint, userinfo_endpoint 等）

### JWKS 公钥

```http
GET /.well-known/jwks.json
```

**响应**: JWKS 公钥集（用于第三方验证 ID Token 签名）

### OAuth 授权端点

```http
GET /oauth/authorize?response_type=code&client_id=<client_id>&redirect_uri=<uri>&scope=openid+profile&state=<state>&code_challenge=<challenge>&code_challenge_method=S256
```

**说明**: 浏览器重定向到该端点，用户确认授权后回跳至 `redirect_uri?code=<auth_code>&state=<state>`

### OAuth Token 端点

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=<auth_code>&redirect_uri=<uri>&client_id=<id>&client_secret=<secret>&code_verifier=<verifier>
```

**响应**:
```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "rft_xxx",
  "id_token": "eyJhbG...",
  "scope": "openid profile"
}
```

支持 `grant_type=refresh_token` 刷新令牌。

### UserInfo 端点

```http
GET /userinfo
Authorization: Bearer <access_token>

# 或
POST /userinfo
Authorization: Bearer <access_token>
```

**响应**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "preferred_username": "johndoe"
}
```

### Token  introspection

```http
POST /oauth/introspect
Content-Type: application/x-www-form-urlencoded

token=<access_token>
```

### Token 撤销

```http
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded

token=<refresh_token>&token_type_hint=refresh_token
```

---

## gRPC 接口

### AuthService

```protobuf
service AuthService {
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc Logout(LogoutRequest) returns (LogoutResponse);
  rpc VerifyEmail(VerifyEmailRequest) returns (VerifyEmailResponse);
  rpc ResendVerification(ResendVerificationRequest) returns (ResendVerificationResponse);
  rpc ForgotPassword(ForgotPasswordRequest) returns (ForgotPasswordResponse);
  rpc ResetPassword(ResetPasswordRequest) returns (ResetPasswordResponse);
  rpc EnableMFA(EnableMFARequest) returns (EnableMFAResponse);
  rpc DisableMFA(DisableMFARequest) returns (DisableMFAResponse);
  rpc ValidateMFA(ValidateMFARequest) returns (ValidateMFAResponse);
}
```

### OAuth2Service

```protobuf
service OAuth2Service {
  rpc CreateApp(CreateAppRequest) returns (CreateAppResponse);
  rpc GetApp(GetAppRequest) returns (GetAppResponse);
  rpc ListApps(ListAppsRequest) returns (ListAppsResponse);
  rpc UpdateApp(UpdateAppRequest) returns (UpdateAppResponse);
  rpc GenerateClientSecret(GenerateClientSecretRequest) returns (GenerateClientSecretResponse);
  rpc Authorize(AuthorizeRequest) returns (AuthorizeResponse);
  rpc Token(TokenRequest) returns (TokenResponse);
  rpc UserInfo(UserInfoRequest) returns (UserInfoResponse);
  rpc Introspect(IntrospectRequest) returns (IntrospectResponse);
  rpc Revoke(RevokeRequest) returns (RevokeResponse);
  rpc ListUserAuthorizations(ListUserAuthorizationsRequest) returns (ListUserAuthorizationsResponse);
  rpc RevokeUserAuthorization(RevokeUserAuthorizationRequest) returns (RevokeUserAuthorizationResponse);
}
```

---

## Go SDK

SDK 位于 `sdk/identity/`，是一个独立的 Go module（`github.com/identity-platform/sdk`）。

### 客户端初始化

```go
import "github.com/identity-platform/sdk/identity"

client, err := identity.NewClient(&identity.Config{
    ClientID:     "your-client-id",
    ClientSecret: "your-client-secret",
    RedirectURI:  "https://your-app.com/callback",
    IssuerURL:    "https://identity.example.com",
    Scopes:       []string{"openid", "profile", "email"},
})
```

### Gin 中间件

```go
import "github.com/identity-platform/sdk/identity"

r.Use(identity.AuthMiddleware(client, nil))
```

中间件自动验证 Bearer Token，并在上下文中设置 `user_id`, `email`, `roles`。

### Token 验证器

```go
import "github.com/identity-platform/sdk/identity"

verifier := identity.NewVerifier("https://identity.example.com/.well-known/jwks.json")
claims, err := verifier.VerifyToken(ctx, accessToken)
```

### 完整授权流程

```go
// 1. 构造授权 URL（重定向用户到 OneAuth）
url := client.AuthorizeURL()

// 2. 处理回调（交换授权码为 Token）
token, err := client.Exchange(ctx, authorizationCode, codeVerifier)

// 3. 获取用户信息
userInfo, err := client.UserInfo(ctx, token.AccessToken)

// 4. 刷新 Token
newToken, err := client.RefreshToken(ctx, token.RefreshToken)

// 5. Token 撤销
err = client.RevokeToken(ctx, token.RefreshToken)
```

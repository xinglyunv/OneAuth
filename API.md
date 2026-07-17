# OneAuth API 文档

**版本**: 1.0.0  
**基础 URL**: `http://localhost:9898`  
**协议**: REST (JSON)  
**认证方式**: JWT Bearer Token  

---

## 目录

1. [认证 API](#1-认证-api)
2. [用户 API](#2-用户-api)
3. [OAuth 2.1 / OIDC](#3-oauth-21--oidc)
4. [开发者 API](#4-开发者-api)
5. [Admin API](#5-admin-api)

---

## 1. 认证 API

### 1.1 用户注册

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "testuser",
  "password": "Pass1234!"
}
```

**Response (201):**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "username": "testuser",
  "status": "active"
}
```

### 1.2 用户登录

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Pass1234!",
  "device_name": "Web Browser",
  "device_fingerprint": "optional-fingerprint"
}
```

**Response (200):**
```json
{
  "access_token": "jwt-token",
  "refresh_token": "opaque-refresh-token",
  "session_id": "uuid",
  "expires_in": 900,
  "token_type": "Bearer",
  "mfa_required": false,
  "mfa_session_token": ""
}
```

若 `mfa_required=true`，需调用 MFA 验证。

### 1.3 MFA 验证

```
POST /api/auth/mfa/validate
```

**Request Body:**
```json
{
  "mfa_session_token": "session-token",
  "totp_code": "123456"
}
```

### 1.4 用户登出

```
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "session_id": "uuid"
}
```

### 1.5 忘记密码

```
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### 1.6 重置密码

```
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset-token",
  "new_password": "NewPass1234!"
}
```

### 1.7 邮箱验证

```
POST /api/auth/verify-email
```

**Request Body:**
```json
{
  "token": "verification-token"
}
```

### 1.8 重新发送验证

```
POST /api/auth/resend-verification
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

---

## 2. 用户 API

所有用户 API 需要 `Authorization: Bearer <token>` 头。

### 2.1 获取个人资料

```
GET /api/user/profile
```

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "username": "testuser",
  "email_verified": true,
  "mfa_enabled": false,
  "status": "active",
  "profile": {
    "display_name": "Test User",
    "avatar_url": "",
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai"
  },
  "created_at": "2026-07-16T10:00:00Z"
}
```

### 2.2 修改个人资料

```
PUT /api/user/profile
```

**Request Body:**
```json
{
  "display_name": "New Name",
  "avatar_url": "https://example.com/avatar.png",
  "locale": "en-US",
  "timezone": "America/New_York"
}
```

### 2.3 修改密码

```
PUT /api/user/password
```

**Request Body:**
```json
{
  "old_password": "OldPass1234!",
  "new_password": "NewPass1234!"
}
```

### 2.4 获取当前用户信息

```
GET /api/me
```

**Response:**
```json
{
  "id": "uuid",
  "email": "admin@example.com",
  "username": "admin"
}
```

---

### 2.5 MFA 管理

#### 开启 MFA

```
POST /api/user/mfa/enable
```

**Response:**
```json
{
  "secret": "BASE32SECRET",
  "qr_code_url": "otpauth://...",
  "qr_code_data_uri": "data:image/png;base64,..."
}
```

#### 关闭 MFA

```
POST /api/user/mfa/disable
```

**Request Body:**
```json
{
  "totp_code": "123456"
}
```

#### 生成备用码

```
POST /api/user/mfa/backup-codes
```

**Response:**
```json
{
  "backup_codes": ["ABCD-EFGH-IJKL", ...],
  "message": "保存好这些备用码，每个仅可使用一次"
}
```

#### 查询备用码状态

```
GET /api/user/mfa/backup-codes/status
```

**Response:**
```json
{
  "remaining": 8
}
```

---

### 2.6 会话管理

#### 列出会话

```
GET /api/user/sessions
```

#### 撤销会话

```
DELETE /api/user/sessions/:id
```

---

### 2.7 设备管理

#### 列出设备

```
GET /api/user/devices
```

**Response:**
```json
{
  "devices": [
    {
      "id": "uuid",
      "name": "Chrome on Linux",
      "platform": "Linux",
      "browser": "Chrome 120",
      "last_ip": "192.168.1.1",
      "last_seen_at": "2026-07-16T10:00:00Z",
      "created_at": "2026-07-16T10:00:00Z"
    }
  ]
}
```

#### 删除设备

```
DELETE /api/user/devices/:id
```

#### 退出所有设备

```
POST /api/user/devices/logout-all
```

---

### 2.8 邮箱管理

#### 列出邮箱

```
GET /api/user/emails
```

#### 添加邮箱

```
POST /api/user/emails
```

**Request Body:**
```json
{
  "email": "secondary@example.com"
}
```

#### 设为主邮箱

```
PUT /api/user/emails/:id/primary
```

#### 删除邮箱

```
DELETE /api/user/emails/:id
```

#### 验证邮箱

```
POST /api/user/emails/:id/verify
```

---

### 2.9 手机管理

#### 绑定手机

```
POST /api/user/phone/bind
```

**Request Body:**
```json
{
  "phone": "+8613800138000"
}
```

#### 验证手机

```
POST /api/user/phone/verify
```

#### 解绑手机

```
POST /api/user/phone/unbind
```

---

### 2.10 登录活动

```
GET /api/user/login-activity?page=1&size=20
```

**Response:**
```json
{
  "logs": [...],
  "total": 50,
  "page": 1,
  "size": 20
}
```

---

### 2.11 个人访问令牌

#### 创建令牌

```
POST /api/user/tokens
```

**Request Body:**
```json
{
  "name": "My CLI Token",
  "scopes": "read,write"
}
```

**Response:**
```json
{
  "token": { "id": "uuid", "name": "My CLI Token", ... },
  "raw_token": "oneauth_xxxxxxxxx..."
}
```

> **注意**: `raw_token` 只在创建时返回一次，请妥善保存。

#### 列出令牌

```
GET /api/user/tokens
```

#### 删除令牌

```
DELETE /api/user/tokens/:id
```

---

### 2.12 已授权 OAuth 应用

#### 列出已授权应用

```
GET /api/user/authorized-apps
```

#### 撤销授权

```
DELETE /api/user/authorized-apps/:clientId
```

---

## 3. OAuth 2.1 / OIDC

### 3.1 OIDC Discovery

```
GET /.well-known/openid-configuration
```

### 3.2 JWKS

```
GET /.well-known/jwks.json
```

### 3.3 Authorization Endpoint

```
GET /oauth/authorize?response_type=code&client_id=xxx&redirect_uri=xxx&scope=openid+profile&state=xxx&code_challenge=xxx&code_challenge_method=S256
```

### 3.4 Token Endpoint

```
POST /oauth/token
```

**支持的 Grant Types:**
- `authorization_code` - 授权码交换 (PKCE S256)
- `refresh_token` - 刷新令牌 (Rotation + Reuse Detection)

**授权码交换:**
```
client_id=xxx&client_secret=xxx&grant_type=authorization_code&code=xxx&redirect_uri=xxx&code_verifier=xxx
```

**刷新令牌:**
```
client_id=xxx&client_secret=xxx&grant_type=refresh_token&refresh_token=xxx
```

### 3.5 UserInfo Endpoint

```
GET /userinfo
```
或
```
POST /userinfo
```

**Headers:** `Authorization: Bearer <access_token>`

### 3.6 Token Introspection (RFC 7662)

```
POST /oauth/introspect
```

### 3.7 Token Revocation (RFC 7009)

```
POST /oauth/revoke
```

---

## 4. 开发者 API

### 4.1 OAuth 应用管理

#### 创建应用

```
POST /api/apps
```

**Request Body:**
```json
{
  "name": "My App",
  "description": "My OAuth Application",
  "redirect_uris": ["https://example.com/callback"]
}
```

**Response (201):**
```json
{
  "app": {...},
  "client_id": "generated-client-id",
  "client_secret": "generated-client-secret"
}
```

#### 列出应用

```
GET /api/apps
```

#### 获取应用详情

```
GET /api/apps/:id
```

#### 更新应用

```
PUT /api/apps/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "redirect_uris": ["https://example.com/new-callback"]
}
```

#### 删除应用

```
DELETE /api/apps/:id
```

#### 轮换 Client Secret

```
POST /api/apps/:id/rotate-secret
```

**Response:**
```json
{
  "client_secret": "new-generated-secret"
}
```

---

### 4.2 Webhook 管理

#### 创建 Webhook

```
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://example.com/webhook",
  "secret": "optional-signing-secret",
  "event_types": "user.created,oauth.authorized"
}
```

#### 列出 Webhooks

```
GET /api/webhooks
```

#### 删除 Webhook

```
DELETE /api/webhooks/:id
```

---

## 5. Admin API

所有 Admin API 需要 `Authorization: Bearer <token>` 头 (需要有效的 JWT Token)。

### 5.1 仪表盘

```
GET /api/admin/dashboard
```

**Response:**
```json
{
  "total_users": 100,
  "today_registrations": 5,
  "active_users": 80,
  "total_apps": 10,
  "total_scopes": 4,
  "today_logins": 25,
  "today_failures": 3,
  "db_status": "healthy",
  "redis_status": "healthy",
  "service_status": "healthy"
}
```

### 5.2 用户管理

#### 列出用户

```
GET /api/admin/users?page=1&size=20&search=&status=
```

**Response:**
```json
{
  "users": [...],
  "total": 100,
  "page": 1,
  "size": 20
}
```

#### 查看用户

```
GET /api/admin/users/:id
```

#### 切换用户状态

```
POST /api/admin/users/:id/toggle-status
```

#### 删除用户

```
DELETE /api/admin/users/:id
```

#### 强制用户退出

```
POST /api/admin/users/:id/force-logout
```

#### 重置用户密码

```
POST /api/admin/users/:id/reset-password
```

**Request Body:**
```json
{
  "new_password": "NewPass1234!"
}
```

### 5.3 OAuth 应用审核

#### 列出应用

```
GET /api/admin/apps?page=1&size=20
```

#### 通过应用

```
POST /api/admin/apps/:id/approve
```

#### 拒绝应用

```
POST /api/admin/apps/:id/reject
```

### 5.4 Scope 管理

#### 列出 Scopes

```
GET /api/admin/scopes
```

#### 创建 Scope

```
POST /api/admin/scopes
```

**Request Body:**
```json
{
  "name": "custom_scope",
  "description": "Custom scope description",
  "is_default": false
}
```

#### 删除 Scope

```
DELETE /api/admin/scopes/:id
```

### 5.5 Token 管理

#### 列出 Token

```
GET /api/admin/tokens?page=1&size=20
```

#### 撤销 Token

```
POST /api/admin/tokens/:id/revoke
```

### 5.6 Session 管理

#### 列出所有 Session

```
GET /api/admin/sessions?page=1&size=20
```

#### 删除 Session

```
DELETE /api/admin/sessions/:id
```

### 5.7 审计日志

#### 获取日志

```
GET /api/admin/audit-logs?page=1&size=50
```

#### 搜索日志

```
GET /api/admin/audit-logs/search?page=1&size=50&action=login&user_id=&search=
```

### 5.8 组织管理

#### 列出组织

```
GET /api/admin/organizations?page=1&size=20
```

#### 创建组织

```
POST /api/admin/organizations
```

**Request Body:**
```json
{
  "name": "My Org",
  "slug": "my-org",
  "description": "Organization description",
  "domain": "example.com",
  "owner_id": "uuid"
}
```

#### 获取组织

```
GET /api/admin/organizations/:id
```

#### 更新组织

```
PUT /api/admin/organizations/:id
```

#### 删除组织

```
DELETE /api/admin/organizations/:id
```

#### 列出成员

```
GET /api/admin/organizations/:id/members
```

#### 添加成员

```
POST /api/admin/organizations/:id/members
```

**Request Body:**
```json
{
  "user_id": "uuid",
  "role": "member"
}
```

#### 移除成员

```
DELETE /api/admin/organizations/:id/members/:userId
```

### 5.9 RBAC 权限管理

#### 列出角色

```
GET /api/admin/roles?page=1&size=20
```

#### 创建角色

```
POST /api/admin/roles
```

**Request Body:**
```json
{
  "name": "admin",
  "description": "Administrator role",
  "scope": "system"
}
```

#### 删除角色

```
DELETE /api/admin/roles/:id
```

#### 列出权限

```
GET /api/admin/permissions
```

#### 创建权限

```
POST /api/admin/permissions
```

**Request Body:**
```json
{
  "name": "user:read",
  "description": "Read users",
  "resource": "user",
  "action": "read"
}
```

#### 删除权限

```
DELETE /api/admin/permissions/:id
```

#### 获取角色权限

```
GET /api/admin/roles/:id/permissions
```

#### 分配权限

```
POST /api/admin/roles/:id/permissions
```

**Request Body:**
```json
{
  "permission_ids": ["uuid1", "uuid2"]
}
```

### 5.10 安全中心

#### 登录失败记录

```
GET /api/admin/security/login-failures?page=1&size=20
```

#### IP 规则列表

```
GET /api/admin/security/ip-rules?page=1&size=20&type=blacklist
```

#### 创建 IP 规则

```
POST /api/admin/security/ip-rules
```

**Request Body:**
```json
{
  "ip_or_cidr": "192.168.1.0/24",
  "type": "blacklist",
  "reason": "Suspicious activity"
}
```

#### 删除 IP 规则

```
DELETE /api/admin/security/ip-rules/:id
```

### 5.11 系统配置

#### 获取配置

```
GET /api/admin/settings?key=system.name
```

不传 `key` 返回所有配置。

#### 修改配置

```
PUT /api/admin/settings
```

**Request Body:**
```json
{
  "key": "system.name",
  "value": "OneAuth Platform"
}
```

#### 删除配置

```
DELETE /api/admin/settings/:key
```

### 5.12 服务健康

```
GET /api/admin/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "database": {"status": "healthy", "error": null},
    "redis": {"status": "healthy", "error": null}
  },
  "uptime": 1234567890
}
```

---

## 6. 数据模型

### 新增表结构

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `personal_tokens` | 个人访问令牌 | user_id, name, token_hash, scopes, expires_at |
| `backup_codes` | MFA 备用码 | user_id, code_hash, used |
| `user_emails` | 多邮箱管理 | user_id, email, is_primary, verified |
| `user_phones` | 手机号管理 | user_id, phone, verified |
| `organizations` | 企业组织 | name, slug, domain, owner_id |
| `organization_members` | 组织成员 | organization_id, user_id, role |
| `roles` | RBAC 角色 | name, scope, organization_id |
| `permissions` | RBAC 权限 | name, resource, action |
| `system_configs` | 系统配置 | key, value |
| `webhooks` | Webhook 配置 | url, secret, event_types, status |
| `webhook_events` | Webhook 事件日志 | webhook_id, event_type, payload, status |
| `ip_rules` | IP 黑白名单 | ip_or_cidr, type, reason, is_active |

### 已有表

`users`, `user_profiles`, `password_credentials`, `sessions`, `devices`, `audit_logs`, `oauth_clients`, `oauth_scopes`, `oauth_consents`, `oauth_redirect_uris`, `refresh_tokens`, `authorization_codes`, `signing_keys`, `login_attempts`, `email_verification_tokens`, `password_reset_tokens`

---

## 7. 认证与安全

### JWT Token

- **算法**: RS256 (RSA 2048-bit)
- **Access Token TTL**: 15 分钟
- **Refresh Token TTL**: 30 天 (支持 Rotation + Reuse Detection)
- **ID Token**: OIDC 标准 (包含 email, email_verified)

### 密码策略

- **算法**: Argon2id (m=64MB, t=3, p=2)
- **最小长度**: 8 位
- **复杂度要求**: 大写字母 + 小写字母 + 数字 + 特殊字符

### MFA

- **TOTP**: SHA1, 30s 步长, 6 位数, ±1 窗口
- **Backup Codes**: 10 个一次性备用码

### 安全特性

- PKCE S256 (授权码模式)
- Refresh Token Rotation + Reuse Detection (family 吊销)
- 暴力登录检测 (配置化)
- IP 黑白名单
- Argon2id 密码哈希
- 邮件验证

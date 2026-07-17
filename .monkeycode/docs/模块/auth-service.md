# Auth Service

认证服务是 OneAuth 的业务逻辑核心，负责用户身份认证的全生命周期管理，包括注册、登录、登出、MFA、密码管理、角色分配、设备管理、邮箱和手机绑定、Webhook 等。

## 结构

```
internal/auth/
├── service.go          # 核心认证服务（注册/登录/登出/角色管理）
├── mfa.go              # MFA 启用/禁用
├── backupcode.go       # MFA 备用恢复码管理
├── device.go           # 设备管理
├── email.go            # 邮箱管理
├── phone.go            # 手机号管理
├── security.go         # 安全策略（IP 黑白名单/暴力破解） + 系统配置
├── token.go            # 个人访问令牌
├── organization.go     # 组织管理
├── rbac.go             # RBAC 角色权限管理
├── webhook.go          # Webhook 管理
└── verification.go     # 邮箱验证/密码重置
```

## 关键文件

| 文件 | 目的 |
|------|------|
| `service.go` | 核心认证服务，包含 Service 结构体和 Register/Login/Logout/ValidateMFA/AssignUserRole/GetUserRoles 等方法 |
| `mfa.go` | TOTP 双因素认证的启用和禁用流程 |
| `backupcode.go` | 10 个备用恢复码的生成、验证和数量查询 |
| `security.go` | SecurityService（IP 黑白名单/暴力破解防护）和 SystemConfigService（系统配置 KV） |
| `rbac.go` | RBACService（角色 CRUD、权限 CRUD、角色-权限分配） |
| `webhook.go` | WebhookService（创建/删除/分发，HMAC SHA256 签名） |
| `verification.go` | 邮箱验证令牌和密码重置令牌的管理 |

## 依赖

**本模块依赖**:
- `internal/ent/` — 所有数据库操作
- `internal/pkg/crypto/` — Argon2id 密码哈希、PKCE
- `internal/pkg/jwt/` — JWT 令牌生成
- `internal/pkg/email/` — 邮件发送
- `internal/pkg/totp/` — TOTP 生成和验证

**依赖本模块的**:
- `internal/gateway/` — Handler 调用的业务逻辑
- `proto/auth/` — gRPC 服务注册

## 规范

### 服务结构体

所有服务遵循同样的构造函数模式：

```go
func NewXxxService(client *ent.Client) *XxxService {
    return &XxxService{client: client}
}
```

### 错误处理

```go
// 返回特定错误消息
return nil, errors.New("invalid credentials")

// 包装底层错误
return nil, fmt.Errorf("create user: %w", err)
```

### 审计日志

所有关键操作（注册、登录、MFA 变更等）通过以下模式记录审计日志：

```go
_, err = s.client.AuditLog.Create().
    SetUserID(userID).
    SetAction("REGISTER").
    SetResourceType("user").
    SetResourceID(userID.String()).
    SetMetadata(map[string]interface{}{"email": email}).
    Save(ctx)
```

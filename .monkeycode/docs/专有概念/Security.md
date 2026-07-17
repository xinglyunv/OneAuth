# 安全策略

OneAuth 提供多层安全防护机制，包括密码安全、登录防护、IP 访问控制和完整的审计追踪。

## 密码安全

### Argon2id 密码哈希

所有用户密码使用 Argon2id 算法进行哈希处理，这是目前最安全的密码哈希算法，具有抗 GPU/ASIC 暴力破解的特性。

```go
// 密码哈希（注册/改密码时）
hash, err := crypto.HashPassword(password)

// 密码验证（登录时）
valid, err := crypto.VerifyPassword(password, hash)
```

### 密码强度验证

```go
func ValidatePasswordStrength(password string) error
```

要求：
- 长度 8-128 字符
- 至少包含 1 个小写字母
- 至少包含 1 个大写字母
- 至少包含 1 个数字
- 至少包含 1 个特殊字符

## 暴力破解防护

`SecurityService` 提供暴力破解检测能力：

| 方法 | 说明 |
|------|------|
| `CheckBruteForce(email, maxAttempts, window)` | 检查某邮箱在时间窗口内的失败次数是否超限 |
| `RecordLoginAttempt(email, userID, ip, success, reason)` | 记录登录尝试 |
| `GetRecentAttempts(email, limit)` | 获取某邮箱最近的登录尝试记录 |
| `ListRecentFailures(page, size)` | 分页查看全部失败记录（管理员用） |

## IP 黑白名单

管理员可通过 `/api/admin/security/ip-rules` 管理 IP 黑白名单规则：

- **黑名单模式**: 命中规则的 IP 所有请求被拒绝
- **白名单模式**: 仅命中规则的 IP 允许访问（其余全部拒绝）
- 支持 CIDR 格式的 IP 范围匹配
- 规则可启用/禁用，支持添加原因说明

## JWT 安全

| 特性 | 说明 |
|------|------|
| 签名算法 | RS256（非对称，RSA 2048 位） |
| 密钥生成 | 服务启动时运行时生成 |
| JWKS 端点 | `/.well-known/jwks.json` 公开公钥 |
| Access Token 有效期 | 15 分钟 |
| Refresh Token 有效期 | 30 天 |
| Refresh Token 轮换 | 每次刷新生成新 Token，旧 Token 标记已使用 |
| Reuse 检测 | 检测 Refresh Token 重放攻击 |

## MFA 双因素认证

使用基于时间的一次性密码（TOTP），遵循 RFC 6238 标准：

| 特性 | 说明 |
|------|------|
| 算法 | TOTP (Time-based One-Time Password) |
| 密钥长度 | 16 字节随机 |
| 二维码 | 标准 `otpauth://` URI |
| 备用码 | 10 个 `XXXX-XXXX-XXXX` 格式，单次使用 |

## 审计日志

| 属性 | 说明 |
|------|------|
| 记录范围 | 注册、登录、MFA 操作、管理员操作等 |
| 包含信息 | 用户 ID、操作类型、资源类型和 ID、IP 地址、User-Agent、元数据 |
| 存储 | `audit_logs` 表，支持按用户/操作/时间范围查询 |
| 查看 | 用户可查看自己的登录活动，管理员可查看全部审计日志 |

## OAuth 相关安全

- **PKCE S256**: 授权码流程强制要求 PKCE，仅支持 S256 挑战方法
- **授权码单次使用**: 授权码使用后立即标记为已使用，重放攻击无效
- **授权码有效期**: 10 分钟过期
- **Client Secret 哈希**: 存储 SHA256 哈希，原文不可恢复
- **Consent 管理**: 用户可在已授权应用列表页撤销第三方应用授权

## Webhook 安全

Webhook 回调使用 HMAC SHA256 算法对请求体签名，通过 `X-OneAuth-Signature` 请求头发送，第三方服务可通过共享 secret 验证回调的真实性。

# 基础设施工具包（pkg）

基础设施工具包提供 OneAuth 底层安全能力的实现，包括密码哈希、JWT 令牌管理、TOTP 双因素认证、邮件发送和 PKCE 验证。

## 结构

```
internal/pkg/
├── crypto/
│   ├── password.go     # Argon2id 密码哈希和验证
│   └── pkce.go         # PKCE (S256) 验证
├── email/
│   └── sender.go       # SMTP 邮件发送
├── jwt/
│   └── jwt.go          # JWT TokenManager（RS256 签名/验证/JWKS）
└── totp/
    └── totp.go         # TOTP 密钥生成、验证和二维码 URL
```

## 关键文件

### Crypto / 密码学

**`password.go`**:
| 方法 | 说明 |
|------|------|
| `HashPassword(password)` | Argon2id 哈希，返回编码字符串 |
| `VerifyPassword(password, hash)` | 验证密码是否匹配哈希 |

使用 `golang.org/x/crypto/argon2`，自动生成随机 salt，输出格式为编码字符串（含算法参数）。

**`pkce.go`**:
| 方法 | 说明 |
|------|------|
| `VerifyCodeChallenge(verifier, challenge)` | 验证 PKCE code_verifier 是否匹配 S256 challenge |

### JWT TokenManager

**`jwt.go`**:
```go
type TokenManager struct {
    privateKey     *rsa.PrivateKey
    publicKey      *rsa.PublicKey
    issuer         string
    accessTokenTTL time.Duration
}
```

| 方法 | 说明 |
|------|------|
| `NewTokenManager(privateKey, publicKey, issuer, ttl)` | 创建 TokenManager |
| `GenerateRSAKeyPair()` | 生成 2048 位 RSA 密钥对 |
| `GenerateAccessToken(userID, clientID, scope)` | 签发 access token |
| `GenerateIDToken(userID, clientID, email, username, picture, emailVerified)` | 签发 OIDC ID token |
| `VerifyToken(token)` | 验证 JWT 签名并返回 claims |
| `JWKS()` | 返回 JWKS 公钥集 |

### TOTP

**`totp.go`**:
| 方法 | 说明 |
|------|------|
| `GenerateSecret()` | 生成 16 字节随机 TOTP 密钥 |
| `GenerateCode(secret, timestamp)` | 基于时间生成 TOTP 验证码 |
| `ValidateCode(secret, code)` | 验证 TOTP 码（支持时间窗口偏移） |
| `GenerateQRURL(secret, issuer, account)` | 生成 `otpauth://` 格式二维码 URL |

### 邮件发送

**`sender.go`**:
```go
type EmailSender interface {
    SendVerificationEmail(to, token string) error
    SendPasswordResetEmail(to, token string) error
}
```

当前 EmailSender 接口已定义，具体 SMTP 实现为桩函数，需配置 `config.yaml` 中的 SMTP 参数后生效。

## 外部依赖

| 包 | 用途 |
|----|------|
| `golang.org/x/crypto/argon2` | Argon2id 密码哈希 |
| `github.com/golang-jwt/jwt/v5` | JWT 签名和验证 |
| `github.com/pquerna/otp/totp` | TOTP 生成和验证 |
| `net/smtp`（标准库） | 邮件发送 |

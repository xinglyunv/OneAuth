# Go SDK

Go SDK 是一个独立的 Go module，为第三方 Go 服务提供与 OneAuth OAuth 2.1 认证流程的集成能力。它包含 OAuth 客户端、Gin 中间件和 JWKS Token 验证器。

## 结构

```
sdk/identity/
├── client.go          # OAuth 2.1 客户端（授权 URL/Token 交换/UserInfo/刷新/撤销）
├── middleware.go      # Gin 框架中间件（自动验证 Bearer Token）
├── verifier.go        # JWKS Token 验证器（基于公钥）
├── go.mod             # 独立 Go module: github.com/identity-platform/sdk
└── go.sum             # 依赖锁文件

sdk/examples/
└── gin-app/           # SDK 使用示例
```

## 客户端

```go
type Client struct {
    clientID     string
    clientSecret string
    redirectURI  string
    issuerURL    string
    scopes       []string
    httpClient   *http.Client
}
```

| 方法 | 说明 |
|------|------|
| `NewClient(config)` | 创建 OAuth 客户端 |
| `AuthorizeURL()` | 生成 PKCE 授权 URL（自动生成 code_verifier + code_challenge） |
| `Exchange(ctx, code, verifier)` | 授权码交换 Token |
| `UserInfo(ctx, accessToken)` | 获取用户 OIDC 声明 |
| `RefreshToken(ctx, refreshToken)` | 刷新 Access Token |
| `RevokeToken(ctx, refreshToken)` | 撤销 Refresh Token |

## Gin 中间件

```go
func AuthMiddleware(client *Client, opts *MiddlewareOptions) gin.HandlerFunc
```

- 自动从 `Authorization` 头提取 Bearer Token
- 调用 JWKS 验证器验证 Token 签名
- 设置 `user_id`, `email`, `roles` 到 Gin context

## Token 验证器

```go
type Verifier struct {
    jwksURL    string
    publicKey  *rsa.PublicKey
    httpClient *http.Client
}
```

| 方法 | 说明 |
|------|------|
| `NewVerifier(jwksURL)` | 创建验证器 |
| `VerifyToken(ctx, token)` | 验证 JWT Token，返回 Claims |

## 集成示例

```go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/identity-platform/sdk/identity"
)

func main() {
    client, _ := identity.NewClient(&identity.Config{
        ClientID:     "your-client-id",
        ClientSecret: "your-client-secret",
        RedirectURI:  "https://your-app.com/callback",
        IssuerURL:    "https://identity.example.com",
        Scopes:       []string{"openid", "profile", "email"},
    })

    r := gin.Default()
    r.Use(identity.AuthMiddleware(client, nil))

    r.GET("/protected", func(c *gin.Context) {
        userID := c.GetString("user_id")
        email := c.GetString("email")
        c.JSON(200, gin.H{"user_id": userID, "email": email})
    })

    r.Run(":8080")
}
```

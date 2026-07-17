# 网关层（Gateway）

网关层是 OneAuth 的 HTTP API 入口，基于 Gin 框架实现。它负责路由分发、请求参数解析、响应序列化以及调用各业务服务。同时，它也承载 gRPC 服务器的生命周期管理。

## 结构

```
internal/gateway/
├── router.go            # 路由定义（全部 API 路由注册和中间件挂载）
├── handler.go           # 认证相关 handler（注册/登录/MFA/OAuth/管理员登录）
├── user_handlers.go     # 用户资源 handler（资料/密码/会话/设备/邮箱/手机/令牌）
├── admin.go             # 管理员 handler（基础：Dashboard/用户/应用/审计）
├── admin_enhanced.go    # 管理员 handler（增强：组织/RBAC/Scope/Token/Session/IP规则/系统配置）
└── grpc.go              # gRPC 服务器封装
```

## 关键文件

| 文件 | 目的 |
|------|------|
| `router.go` | 定义了全局中间件链和全部约 100 条路由，按权限分组（公开/用户/开发者/管理员） |
| `handler.go` | Handler 结构体定义（16 个子服务），认证/OAuth 相关 handler |
| `user_handlers.go` | 用户个人资源 CRUD handler（约 30 个端点） |
| `admin.go` | 基础管理员 handler |
| `admin_enhanced.go` | 组织管理、RBAC、安全策略等高级管理员 handler |
| `grpc.go` | GRPCServer 封装，含 gRPC 拦截器 |

## Handler 结构体

```go
type Handler struct {
    authSvc       *auth.Service        // 认证服务
    oauth2Svc     *oauth2.Service      // OAuth 2.1 服务
    jwt           *jwtpkg.TokenManager // JWT 令牌管理
    authClient    *ent.Client          // Ent 数据库客户端
    adminCfg      config.AdminConfig   // 管理员静态配置
    backupCodes   *auth.BackupCodeManager
    deviceMgr     *auth.DeviceManager
    emailMgr      *auth.EmailManager
    phoneMgr      *auth.PhoneManager
    patSvc        *auth.PersonalTokenService
    secSvc        *auth.SecurityService
    cfgSvc        *auth.SystemConfigService
    orgSvc        *auth.OrganizationService
    rbacSvc       *auth.RBACService
    webhookSvc    *auth.WebhookService
    loginActivity *auth.LoginActivityService
}
```

两个构造函数：
- `NewHandler` — 不含 OAuth2 服务
- `NewOAuth2Handler` — 含 OAuth2 服务（`cmd/server/main.go` 使用此版本）

## 路由分组

```
公开（无认证）           → /api/auth/*, /oauth/*, /.well-known/*
用户/开发者（JWT+角色）   → /api/user/*（USER, DEVELOPER）
开发者专属（JWT+角色）    → /api/apps/*, /api/webhooks/*（DEVELOPER）
已认证（JWT）            → /api/me
管理员（AdminJWT）       → /api/admin/*
```

## 依赖

**本模块依赖**:
- `internal/auth/` — 全部认证业务逻辑
- `internal/oauth2/` — OAuth 2.1 服务
- `internal/middleware/` — 中间件
- `internal/pkg/jwt/` — JWT 令牌管理

**依赖本模块的**:
- `cmd/server/main.go` — 应用启动入口

## gRPC 服务器

```go
type GRPCServer struct {
    server *grpc.Server
    port   int
    logger *zap.Logger
}
```

- 端口: 9090
- 拦截器: Recovery（panic 恢复）+ Logging（调用日志）
- 注册服务: AuthService + OAuth2Service

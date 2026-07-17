# 中间件层（Middleware）

中间件层基于 Gin 框架提供 HTTP 请求的横切关注点处理，包括请求日志、跨域支持、JWT 认证、角色鉴权和速率限制。

## 结构

```
internal/middleware/
└── middleware.go       # 全部中间件定义
```

## 中间件列表

| 中间件 | 用途 | 应用于 |
|--------|------|--------|
| `Logger(logger)` | 记录 method/path/status/latency/IP/UA | 全局 |
| `CORS()` | 跨域支持，允许所有来源 | 全局 |
| `RateLimiter()` | 速率限制（当前为桩函数，未实现） | 全局 |
| `JWTAuth(jwt)` | 验证 Bearer JWT Token，设置 user_id/subject/scope | 受保护路由 |
| `AdminJWTAuth(jwt)` | 验证 Bearer JWT + 检查 scope=admin | 管理路由 |
| `JWTAuthOptional(jwt)` | 同 JWTAuth，但不拒绝未认证请求 | 授权端点 |
| `RequireRole(db, roles...)` | 查询 user_roles 表，比对角色列表 | 按角色分组路由 |

## 中间件链

```mermaid
flowchart LR
    Req["HTTP 请求"] --> Logger["Logger"]
    Logger --> CORS["CORS"]
    CORS --> RateLimiter["RateLimiter<br/>(桩)"]
    RateLimiter --> Recovery["gin.Recovery"]
    Recovery --> Route["路由分发"]

    Route -->|公开路由| Handler["Handler"]
    Route -->|受保护路由| JWTAuth["JWTAuth"]
    JWTAuth --> RequireRole["RequireRole"]
    RequireRole --> Handler
    Route -->|管理路由| AdminJWTAuth["AdminJWTAuth<br/>scope=admin"]
    AdminJWTAuth --> Handler
```

## 认证流程

### JWTAuth 中间件

```mermaid
flowchart TB
    Start["收到请求"] --> CheckHeader{"Authorization 头存在？"}
    CheckHeader -->|否| 401["401 未授权"]
    CheckHeader -->|是| Parse{"格式为 Bearer &lt;token&gt;？"}
    Parse -->|否| 401
    Parse -->|是| Verify["jwt.VerifyToken(token)"]
    Verify -->|失败| 401
    Verify -->|成功| SetContext["设置 user_id/subject/scope 到 context"]
    SetContext --> Next["c.Next()"]
```

### RequireRole 中间件

```mermaid
flowchart TB
    Start["收到请求"] --> GetUserID["从 context 读取 user_id"]
    GetUserID --> Query["查询 user_roles 联表"]
    Query --> GetRoles["获取用户角色名列表"]
    GetRoles --> Check{"角色存在于 allowedRoles 中？"}
    Check -->|是| Next["c.Next() 放行"]
    Check -->|否| 403["403 权限不足"]
```

### 角色路由映射

| 路由组 | 中间件 | 允许的角色 |
|--------|--------|-----------|
| `/api/user/*` | `JWTAuth → RequireRole(db, "USER", "DEVELOPER")` | USER, DEVELOPER |
| `/api/apps/*` | `JWTAuth → RequireRole(db, "DEVELOPER")` | DEVELOPER |
| `/api/webhooks/*` | `JWTAuth → RequireRole(db, "DEVELOPER")` | DEVELOPER |
| `/api/me` | `JWTAuth` | 任何已认证用户 |
| `/api/admin/*` | `AdminJWTAuth` | scope=admin |
| `/oauth/authorize` | `JWTAuthOptional` | 可选认证 |

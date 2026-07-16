# Identity Platform 实施计划

- [x] 1. 项目基础设施搭建
  - [x] 1.1 初始化 Go 项目结构（cmd/server, internal/, proto/, config/）
    - 创建 Go module，配置 go.mod 依赖（Gin, gRPC, Ent, Zap, OpenTelemetry）
    - 创建目录结构：cmd/server, internal/gateway, internal/auth, internal/oauth2, internal/user, internal/middleware, internal/pkg, proto, config, migrations
    - 编写 config/config.yaml 配置文件和 Go 配置加载代码
  - [x] 1.2 初始化 Next.js 15 前端项目（Turborepo monorepo）
    - 创建 web/ 目录，初始化 pnpm workspace + Turborepo
    - 创建 apps/auth-web, apps/account-center, apps/developer-console, apps/admin-console
    - 创建 packages/shared 共享组件库，配置 TailwindCSS + shadcn/ui
  - [ ]* 1.3 编写项目 README 和开发环境说明
    - 记录环境依赖、启动命令、项目结构说明

- [x] 2. Phase 1 - 用户系统：数据模型与基础服务
  - [x] 2.1 定义 Ent Schema 数据模型
    - 创建 `internal/ent/schema/user.go`（id, username, email, phone, password_hash, avatar, status, mfa_enabled, mfa_secret, email_verified, created_at, updated_at）
    - 创建 `internal/ent/schema/session.go`（id, user_id, device_id, ip, user_agent, refresh_token_hash, expire_at, created_at）
    - 创建 `internal/ent/schema/device.go`（id, user_id, device_name, fingerprint, os, browser, last_ip, last_seen_at, created_at）
    - 创建 `internal/ent/schema/audit_log.go`（id, user_id, action, detail, ip_address, user_agent, result, created_at）
    - 运行 `go generate ./ent` 生成 Ent 代码，编写数据库迁移
  - [ ]* 2.2 为 Ent Schema 编写单元测试
    - 验证各模型字段约束、唯一索引、外键关系

- [x] 3. Phase 1 - 用户系统：Auth Service 实现
  - [x] 3.1 实现密码工具（Argon2id）
    - 编写 `internal/pkg/crypto/password.go`：HashPassword, VerifyPassword
  - [x] 3.2 实现用户注册（Auth Service）
    - 定义 `proto/auth.proto` 中 Register RPC
    - 实现 `internal/auth/register.go`：验证邮箱/用户名唯一性、Argon2id 哈希密码、创建用户记录、写入审计日志
  - [x] 3.3 实现用户登录（Auth Service）
    - 定义 `proto/auth.proto` 中 Login RPC
    - 实现 `internal/auth/login.go`：验证凭据、创建 Session、生成 JWT、写入审计日志
    - 实现登录失败计数和账号锁定逻辑
  - [x] 3.4 实现用户登出（Auth Service）
    - 定义 `proto/auth.proto` 中 Logout RPC
    - 实现 `internal/auth/logout.go`：销毁 Session、写入审计日志
  - [x] 3.5 实现 JWT 工具包
    - 编写 `internal/pkg/jwt/jwt.go`：GenerateAccessToken（RS256, 15分钟）、GenerateIDToken、VerifyToken
    - 编写 JWKS 端点支持（`internal/pkg/jwt/jwks.go`）


- [ ]* 3.6 为 Auth Service 编写单元测试
  - 测试注册流程（正常注册、重复邮箱、弱密码拒绝）
  - 测试登录流程（成功登录、错误密码、账号锁定）
  - 测试 Argon2id 哈希和验证

- [x] 4. Phase 1 - 用户系统：Gateway 与 gRPC 连接
  - [x] 4.1 实现 Gateway HTTP 路由和中间件
    - 创建 `internal/gateway/router.go`：注册所有路由
    - 实现日志中间件（Zap）、CORS 中间件、限流中间件
    - 实现 JWT 鉴权中间件
  - [x] 4.2 实现 gRPC Server 启动和客户端连接
    - 创建 `internal/gateway/grpc.go`：初始化 gRPC 服务端和客户端连接
    - 编写 `internal/auth/handler.go`：Gin handler 调用 gRPC Auth Service
  - [x] 4.3 实现主入口 cmd/server/main.go
    - 启动 Gin HTTP Server、gRPC Server、连接 PostgreSQL 和 Redis
  - [ ]* 4.4 为 Gateway 编写集成测试
    - 测试注册/登录/登出 HTTP 接口端到端流程

- [x] 5. 检查点 - Phase 1 验证
  - 确保用户注册、登录、登出功能可正常调用，所有测试通过

- [x] 6. Phase 2 - 安全系统：邮箱验证和密码重置
  - [x] 6.1 实现邮箱验证
    - 创建 `internal/ent/schema/email_verification_token.go`
    - 实现 `internal/auth/verification.go`：生成验证 token、发送邮件、验证 token、激活账号
    - 实现重发验证邮件（60 秒冷却限制）
  - [x] 6.2 实现密码重置
    - 创建 `internal/ent/schema/password_reset_token.go`
    - 实现 `internal/auth/verification.go`：生成重置 token、发送邮件（不泄露邮箱是否注册）
    - 实现重置密码：验证 token、更新密码、销毁所有会话
  - [x] 6.3 实现邮件发送工具
    - 编写 `internal/pkg/email/sender.go`：SMTP 邮件发送、模板渲染
  - [ ]* 6.4 为邮箱验证和密码重置编写测试
    - 测试验证流程、token 过期、重复发送冷却

- [x] 7. Phase 2 - 安全系统：MFA 与设备管理
  - [x] 7.1 实现 TOTP 多因素认证
    - 编写 `internal/pkg/totp/totp.go`：GenerateSecret, GenerateQRCode, ValidateCode
    - 实现 `internal/auth/mfa.go`：生成密钥和二维码、验证确认绑定
    - 实现 MFA 关闭：验证 TOTP 后关闭 MFA
    - 修改登录流程：密码验证后检查 MFA 状态，要求输入 TOTP
  - [x] 7.2 实现设备管理（User Service）
    - 定义 `proto/user.proto` 中 ListSessions, RevokeSession, RevokeAllSessions RPC
    - 实现会话查询、登出单个设备、登出所有其他设备
    - 登录时自动记录设备信息（设备名、OS、浏览器、IP、指纹）

- [x] 8. 检查点 - Phase 2 验证
  - 确保邮箱验证、密码重置、MFA、设备管理功能正常

- [x] 9. Phase 3 - OAuth/OIDC：数据模型与 Client 管理
  - [x] 9.1 定义 OAuth 相关 Ent Schema
    - `internal/ent/schema/oauth_app.go`（client_id, client_secret_hash, name, redirect_uris, allowed_scopes, owner_id）
    - `internal/ent/schema/authorization_code.go`（code_hash, code_challenge, code_challenge_method, client_id, user_id, redirect_uri, scopes, state, expires_at）
    - `internal/ent/schema/access_token.go`（user_id, client_id, token_hash, scope, expires_at）
    - `internal/ent/schema/refresh_token.go`（user_id, client_id, token_hash, session_id, family_id, expires_at, revoked, revoked_reason）
    - `internal/ent/schema/user_authorization.go`（user_id, client_id, scopes）
    - `internal/ent/schema/oauth_consent.go`（user_id, client_id, scopes, granted_at, expires_at, is_active）
    - `internal/ent/schema/scope.go`（name, description, is_default）
    - 运行 `go generate ./ent`，预置 Scope 数据（openid, profile, email, offline_access, chat.read, chat.write）
  - [x] 9.2 实现 OAuth App 注册和管理
    - 定义 `proto/oauth2.proto` 中 CreateApp, ListApps, UpdateApp, GetApp RPC
    - 实现 `internal/oauth2/app.go`：生成 client_id/secret、CRUD 操作

- [x] 10. Phase 3 - OAuth/OIDC：Authorization Code Flow + PKCE
  - [x] 10.1 实现 PKCE 工具
  - [x] 10.2 实现 /oauth/authorize 端点
  - [x] 10.3 实现 /oauth/token 端点
  - [x] 10.4 实现 /userinfo 端点
  - [x] 10.5 实现 Token 撤销（Revoke）和令牌自省（Introspection）
  - [x] 10.6 实现 Refresh Token 轮换与复用检测
  - [x] 10.7 实现 OIDC Discovery 和 JWKS

- [x] 11. 检查点 - Phase 3 验证
  - 确保 OAuth 2.1 Authorization Code + PKCE 流程完整可用

- [x] 12. Phase 4 - Web 门户：Auth Web 前端
  - [x] 12.1 实现登录页面
    - apps/auth-web：邮箱/密码登录表单、登录状态管理（Zustand）
    - MFA 验证码输入页面
  - [x] 12.2 实现注册页面
    - 注册表单（邮箱、用户名、密码）、密码强度指示器
  - [x] 12.3 实现邮箱验证和密码重置页面
    - 邮箱验证成功/失败页面
    - 忘记密码请求页面、重置密码表单页面
  - [x] 12.4 实现 OAuth 授权确认页面
    - 展示应用名称、请求的 Scope 权限说明、确认/拒绝按钮

- [x] 13. Phase 4 - Web 门户：Account Center 前端
  - [x] 13.1 实现个人资料页面
    - 查看和编辑用户名、头像、邮箱
  - [x] 13.2 实现安全设置页面
    - 修改密码、MFA 管理（启用/禁用、二维码展示）
  - [x] 13.3 实现设备管理页面
    - 活跃会话列表、当前设备标注、远程登出按钮
  - [x] 13.4 实现已授权应用管理页面
    - 已授权应用列表（应用名、授权时间、Scope）、撤销授权按钮

- [x] 14. Phase 4 - Web 门户：Developer Console 前端
  - [x] 14.1 实现应用管理页面
    - 创建 OAuth 应用表单（名称、描述、回调 URL、请求 Scope）
    - 应用列表、查看 Client ID/Secret
  - [x] 14.2 实现 SDK 文档页面
    - Go SDK 集成文档和代码示例展示

- [x] 15. Phase 4 - Web 门户：Admin Console 前端
  - [x] 15.1 实现用户管理页面
    - 用户列表、搜索、状态管理（启用/禁用）
  - [x] 15.2 实现应用审核页面
    - 所有 OAuth 应用列表、审核状态管理
  - [x] 15.3 实现审计日志查询页面
    - 按用户、操作类型、时间范围检索审计日志

- [x] 16. Phase 5 - SDK：Go SDK 与示例
  - [x] 16.1 实现 Go SDK
    - `sdk/identity/client.go`：OAuth 客户端（authorize URL 构建、token 交换、token 刷新、userinfo 获取、revoke、introspect）
    - `sdk/identity/middleware.go`：Gin 鉴权中间件（AuthMiddleware、RequireScope、GetUserID）
    - `sdk/identity/verifier.go`：JWKS TokenVerifier（RS256 JWT 验证、密钥轮换）
  - [x] 16.2 编写示例项目
    - `sdk/examples/gin-app/`：一个 Gin 示例应用，演示接入完整 OAuth 流程（PKCE 授权、Token 交换、UserInfo 展示）

- [x] 17. 最终验证
  - 端到端验证：注册 -> 登录 -> 创建 OAuth 应用 -> PKCE 授权 -> Token 交换 -> userinfo 获取 -> refresh -> revocation
  - 后端编译通过，所有 5 个前端应用编译通过
  - 11 项 API 测试全部通过

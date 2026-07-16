# OneAuth

Unified identity platform with OAuth 2.1 / OpenID Connect, MFA, SSO.
统一身份认证平台，支持 OAuth 2.1 / OpenID Connect、多因素认证、单点登录。

---

## Features / 功能特性

- **User System / 用户系统**: Registration, login, password management (注册、登录、密码管理)
- **OAuth 2.1 + OIDC**: Authorization Code Flow with PKCE, ID Token, OIDC Discovery
- **MFA / 多因素认证**: TOTP two-factor authentication (基于 TOTP 的双因素认证)
- **Security / 安全**: Email verification, password reset, device management (邮箱验证、密码重置、设备管理)
- **Refresh Token Rotation**: Family-based rotation with replay detection (基于 family 的令牌轮换与重放检测)
- **Go SDK**: Client library, Gin middleware, JWKS token verifier
- **Web Consoles / 管理控制台**: Auth portal, account center, developer console, admin console (认证门户、账户中心、开发者控制台、管理控制台)

## Tech Stack / 技术栈

| Layer / 层级 | Technology / 技术选型 |
|-------------|----------------------|
| Backend / 后端 | Go 1.24+, Gin, gRPC, Ent ORM |
| Database / 数据库 | PostgreSQL 16, Redis 7 |
| Frontend / 前端 | Next.js 15, TypeScript, TailwindCSS, shadcn/ui |
| State / 状态管理 | TanStack Query, Zustand |
| Auth / 认证 | OAuth 2.1, OpenID Connect, PKCE, JWT RS256 |
| Password / 密码 | Argon2id |

## Architecture / 架构

```
Gateway (Gin) → gRPC → Auth Service    (认证服务)
                     → OAuth2 Service   (OAuth2 服务)
                     → User Service     (用户服务)
```

## Quick Start / 快速开始

```bash
# Generate Ent code / 生成 Ent 代码
go generate ./internal/ent/...

# Run server / 启动服务端
go run ./cmd/server

# Install frontend dependencies / 安装前端依赖
cd web && pnpm install

# Start frontend dev servers / 启动前端
pnpm dev
```

## Project Structure / 项目结构

```
cmd/server/        Server entry point / 服务端入口
config/            Configuration / 配置
internal/          Core services (auth, oauth2, user, gateway) / 核心服务
migrations/        Database migrations / 数据库迁移
proto/             Protobuf definitions / Protobuf 定义
sdk/               Go SDK / Go 开发工具包
web/               Frontend applications / 前端应用
dev/               Development docs and specs / 开发文档与规范
```

## Documentation / 文档

- SDK docs: `sdk/`
- API endpoints: accessible via web console after starting the server
- Development specs: `dev/.monkeycode/specs/`

## License / 开源协议

[MIT](LICENSE)

Copyright (c) 2026 xinglyun

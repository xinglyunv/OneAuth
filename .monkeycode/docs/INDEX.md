# OneAuth 统一身份认证平台

OneAuth 是一个企业级统一身份认证与授权管理（IAM）平台，支持 OAuth 2.1 + OIDC 协议标准，提供统一的用户认证、RBAC 角色权限管理、OAuth 应用管理、多因素认证（MFA）和设备管理能力。

该平台面向三类用户群体：普通终端用户（USER）、第三方应用开发者（DEVELOPER）和系统管理员（ADMIN），通过三个独立门户（用户控制台、开发者门户、管理控制台）提供差异化服务。

**快速链接**: [架构](./ARCHITECTURE.md) | [接口](./INTERFACES.md) | [开发者指南](./DEVELOPER_GUIDE.md)

---

## 核心文档

### [架构](./ARCHITECTURE.md)
系统设计概览、技术栈、项目结构、核心子系统和关键数据流程。从这里开始了解 OneAuth 如何运作。

### [接口](./INTERFACES.md)
REST API 接口完整参考，包括认证接口、用户资源接口、OAuth 2.1 端点、管理接口以及 gRPC 服务和 Go SDK。集成第三方应用或扩展平台的参考手册。

### [开发者指南](./DEVELOPER_GUIDE.md)
环境搭建、快速启动、开发工作流、编码规范和常见开发任务。贡献者和平台开发者必读。

---

## 模块

| 模块 | 描述 | README |
|------|------|--------|
| `internal/auth/` | 认证业务逻辑层，注册/登录/MFA/角色/RBAC/设备/邮箱/Webhook | [README](./模块/auth-service.md) |
| `internal/gateway/` | HTTP API 网关层（Gin），路由定义和请求处理器 | [README](./模块/gateway.md) |
| `internal/oauth2/` | OAuth 2.1 / OIDC 协议实现，授权码/Token/UserInfo/Introspect | [README](./模块/oauth2-service.md) |
| `internal/ent/schema/` | Ent ORM 数据模型定义，28 个实体模型 | [README](./模块/ent-schema.md) |
| `internal/middleware/` | Gin 中间件（日志/CORS/JWT 认证/角色鉴权） | [README](./模块/middleware.md) |
| `internal/pkg/` | 基础设施工具包（密码哈希/JWT/TOTP/邮件/PKCE） | [README](./模块/pkg.md) |
| `web/apps/auth-web/` | 主前端应用，Next.js 15 认证门户 | [README](./模块/auth-web.md) |
| `web/packages/shared/` | 前端共享包，API 客户端和 TypeScript 类型定义 | [README](./模块/shared-package.md) |
| `sdk/identity/` | Go SDK，第三方 Go 服务集成 OAuth 认证 | [README](./模块/go-sdk.md) |

---

## 核心概念

理解这些领域概念有助于更好地理解 OneAuth 的设计：

| 概念 | 描述 |
|------|------|
| [用户（User）](./专有概念/User.md) | 平台用户，包含密码凭据、个人资料、MFA 和角色体系 |
| [角色与 RBAC](./专有概念/RBAC.md) | 基于角色的访问控制，USER/DEVELOPER/ADMIN/SUPER_ADMIN 四级角色 |
| [OAuth 应用](./专有概念/OAuthClient.md) | 第三方 OAuth 2.1 客户端应用，支持授权码 + PKCE 流程 |
| [会话（Session）](./专有概念/Session.md) | 用户登录会话，包含设备信息、登录类型和活动状态 |
| [安全策略](./专有概念/Security.md) | IP 黑白名单、暴力破解防护、审计日志和登录活动监控 |

---

## 入门指南

### 平台新人？

1. **[架构](./ARCHITECTURE.md)** - 了解全局设计
2. **[核心概念](#核心概念)** - 掌握领域术语
3. **[开发者指南](./DEVELOPER_GUIDE.md)** - 搭建本地环境
4. **[接口](./INTERFACES.md)** - 探索 API 能力

### 需要集成第三方登录？

1. **[OAuth 2.1 接口](./INTERFACES.md#oauth-21-接口)** - 查看授权和 Token 端点
2. **[SDK 参考](./模块/go-sdk.md)** - 使用 Go SDK 集成
3. **[OAuth 应用概念](./专有概念/OAuthClient.md)** - 了解应用类型和密钥管理

### 平台二次开发？

1. **[开发者指南](./DEVELOPER_GUIDE.md)** - 搭建开发环境
2. **[网关模块](./模块/gateway.md)** - 添加新 API 端点
3. **[Auth 服务](./模块/auth-service.md)** - 扩展认证逻辑
4. **[Ent Schema](./模块/ent-schema.md)** - 添加新数据模型

---

## 快速参考

### 命令

```bash
# 后端
make run             # 启动后端服务器（HTTP :9898, gRPC :9090）
make ent             # 生成 Ent ORM 代码
make proto           # 编译 Protobuf
make build           # 构建后端二进制
make test            # 运行全部测试

# 前端
cd web && pnpm dev   # 启动全部前端应用
pnpm build           # 构建全部前端应用
pnpm lint            # 前端代码检查
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `cmd/server/main.go` | 后端入口点，负责初始化所有组件 |
| `config/config.yaml` | 后端运行时配置 |
| `internal/gateway/router.go` | 所有 API 路由定义 |
| `internal/gateway/handler.go` | HTTP 请求处理器 |
| `web/apps/auth-web/next.config.ts` | 前端 Next.js 配置 + API 代理 |

### 服务端口

| 服务 | 端口 | 协议 |
|------|------|------|
| HTTP API | 9898 | REST (Gin) |
| gRPC API | 9090 | gRPC (Protobuf) |
| 前端门户 | 3001 | Next.js (auth-web) |
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存（预留） |

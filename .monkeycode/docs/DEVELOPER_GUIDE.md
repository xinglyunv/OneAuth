# 开发者指南

## 项目目的

OneAuth 是一个企业级统一身份认证与授权管理平台，提供完整的 IAM 能力。它在身份认证领域扮演核心角色，统一管理用户身份、权限和应用授权。

**核心职责**:
- 提供标准 OAuth 2.1 + OIDC 认证和授权服务
- 管理用户、角色、权限和应用的全生命周期
- 提供 MFA、设备管理、安全策略等增强安全能力
- 为第三方 Go 服务提供 SDK 集成能力

**相关系统**:
- PostgreSQL 16 — 数据持久化
- Redis 7 — 缓存层（预留）
- Nginx — 反向代理（生产部署）

## 环境搭建

### 前置条件

- Go >= 1.24
- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16（本地开发用 Docker 或系统安装）
- Redis 7（可选，本地开发非必需）

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd identity-platform

# 安装后端依赖
go mod download

# 安装前端依赖
cd web && pnpm install && cd ..

# 配置数据库
cp config/config.yaml config/config.local.yaml
# 编辑 config.local.yaml 填入数据库连接信息
```

### 环境变量

| 变量 | 必需 | 描述 | 默认值 |
|------|------|------|--------|
| 无 | 否 | 所有配置通过 config.yaml 管理 | — |

所有配置通过 `config/config.yaml` 文件管理，支持通过 `-config` 运行参数指定其他配置文件路径。

### 数据库准备

```sql
CREATE DATABASE identity_platform;
CREATE USER identity WITH PASSWORD 'identity_dev';
GRANT ALL PRIVILEGES ON DATABASE identity_platform TO identity;
```

### 运行

```bash
# 启动后端（开发模式，HTTP :9898, gRPC :9090）
make run

# 启动全部前端应用
cd web && pnpm dev

# 仅启动认证门户（auth-web 端口 3001）
cd web/apps/auth-web && pnpm dev

# 生产构建
make build
cd web && pnpm build

# 运行测试
make test
```

## 开发工作流

### 启动时序

后端启动时自动执行以下操作：
1. 加载 `config/config.yaml` 配置
2. 连接 PostgreSQL 并执行 Ent AutoMigration（自动创建/更新表结构）
3. 播种 4 个基础角色（USER, DEVELOPER, ADMIN, SUPER_ADMIN）
4. 运行时生成 RSA 密钥对（JWT 签名用）
5. 启动 gRPC 服务器（端口 9090）
6. 启动 HTTP 服务器（端口 9898）

### 代码生成

```bash
# 修改 Ent Schema 后重新生成代码
make ent

# 修改 Proto 定义后重新生成
make proto
```

### 常见任务

#### 添加新 API 端点

**需修改的文件**:
1. `internal/gateway/router.go` — 注册路由和中间件
2. `internal/gateway/handler.go` 或 `user_handlers.go` — 添加 handler 方法
3. `internal/auth/service.go` 或对应服务文件 — 添加业务逻辑
4. 可选: `internal/ent/schema/` — 如需新实体

**步骤**:
1. 在暴露为 gRPC 的服务中添加新方法
2. 在 Handler 结构体中添加对应 HTTP handler（调用服务层）
3. 在 router.go 中注册路由和中间件保护
4. 在前端 `api.ts` 中添加对应调用方法
5. 在前端页面中添加 UI

#### 添加新 Ent 实体

```bash
# 1. 在 internal/ent/schema/ 创建新文件
# 2. 定义字段、边、索引
# 3. 重新生成代码
make ent
# 4. 在服务层中使用新实体
# 5. 重启后端（自动迁移会创建新表）
```

#### 添加新角色

```go
// 在 cmd/server/main.go 的 seedRoles 函数中添加
baseRoles = append(baseRoles, struct{...}{"NEW_ROLE", "描述"})
```

#### 修改数据库 Schema

Ent ORM 使用代码生成 + AutoMigration。修改 `internal/ent/schema/*.go` 文件后：
1. 运行 `make ent` 重新生成代码
2. 重启后端，AutoMigration 会自动应用变更

**⚠️ 生产环境**: 建议在部署前手动审查 AutoMigration 生成的 SQL，或使用 Ent 的 SQL 迁移文件模式。

#### 调试认证流程

后端使用 Zap 结构化日志，支持 debug/info/warn/error 级别。在 `config.yaml` 中设置：

```yaml
logging:
  level: debug
  format: console
```

### 代码质量工具

| 工具 | 命令 | 目的 |
|------|------|------|
| Go Test | `make test` | 单元测试 |
| golangci-lint | `make lint` | 代码检查 |
| Ent 代码生成 | `make ent` | 确保 ORM 代码与 Schema 同步 |
| Proto 生成 | `make proto` | 确保 gRPC 代码与定义同步 |

### 分支策略

- `main` — 生产就绪代码
- `feature/*` — 新功能（如 `260717-feat-oneauth-login-routing`）
- `fix/*` — Bug 修复

## 编码规范

### 文件组织

- 每个 Go 包一个职责，相关文件在同一目录
- 服务层按领域划分（auth, oauth2, gateway 等）
- 前端每个页面一个目录，page.tsx 为页面入口
- 共享类型放在 `web/packages/shared/src/types.ts`

### 命名

| 类型 | 约定 | 示例 |
|------|------|------|
| Go 文件 | snake_case | `user_handlers.go` |
| Go 接口/结构体 | PascalCase | `TokenManager`, `EmailSender` |
| Go 函数 | PascalCase(导出) / camelCase(私有) | `HashPassword`, `generateAuthCode` |
| Go 常量 | SCREAMING_SNAKE | `MaxPasswordLength` |
| TypeScript 文件 | camelCase | `api.ts`, `types.ts` |
| TypeScript 类型 | PascalCase | `LoginResponse`, `UserProfile` |
| CSS 类名 | cc-* / dd-* 前缀 | `cc-card`, `dd-sidebar` |
| API 路径 | kebab-case | `/api/user/login-activity` |

### 错误处理

```go
// OneAuth 后端: 特定错误类型 + 日志
if err != nil {
    return nil, fmt.Errorf("create user: %w", err)
}

// Handler 层: 统一 JSON 响应
if err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
```

### 日志

```go
// 包含上下文
logger.Info("user created", zap.String("user_id", userID), zap.String("email", email))

// 使用适当级别
logger.Debug("checking MFA status")   // 开发详情
logger.Info("registration successful") // 正常操作
logger.Warn("MFA disabled", ...)       // 可恢复问题
logger.Error("failed to send email", zap.Error(err)) // 需要关注的故障
```

### 中间件编写模式

```go
func MyMiddleware(param string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 前置处理
        c.Set("key", value)
        c.Next()
        // 后置处理
    }
}
```

### 测试

```bash
# 运行所有后端测试
make test

# 运行特定包测试
go test ./internal/auth/...
```

## 构建与发布

### 后端构建

```bash
# 编译为 Linux 二进制
make build
# 输出: bin/server

# 跨平台构建
GOOS=linux GOARCH=amd64 go build -o bin/server-linux ./cmd/server
```

### 前端构建

```bash
cd web
pnpm build
# 输出在各 app 的 .next/ 目录
```

### 部署

项目使用 systemd + Nginx 部署，详见 `deploy.md` 部署指南。

### 启动脚本

```bash
# 启动 Demo（后端二进制 + auth-web）
bash start-demo.sh
```

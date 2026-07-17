# 前端共享包（Shared Package）

共享包 `@identity/shared` 是前端 Monorepo 中所有应用共享的 API 客户端和 TypeScript 类型定义库。

## 结构

```
web/packages/shared/
├── package.json          # 包配置
├── tsconfig.json         # TypeScript 配置
└── src/
    ├── index.ts          # 公开导出
    ├── api.ts            # API 客户端（fetch 封装）
    ├── types.ts          # TypeScript 接口和类型定义
    └── utils.ts          # 工具函数
```

## 关键文件

| 文件 | 目的 |
|------|------|
| `api.ts` | 封装全部前端调用的 REST API 端点，基于 fetch + Bearer Token |
| `types.ts` | 定义所有 API 请求/响应类型 |
| `utils.ts` | 工具函数（当前为桩文件） |
| `index.ts` | 统一导出所有公开 API |

## API 客户端

### 初始化

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
```

`NEXT_PUBLIC_API_URL` 为空时，API 请求通过 Next.js rewrites 代理到后端。

### 请求包装

```typescript
function apiCall(url: string, options?: RequestInit): Promise<Response>
function authorizedCall(url: string, token: string, options?: RequestInit): Promise<Response>
```

## 类型定义

### 请求类型

```typescript
interface RegisterRequest { email: string; username?: string; password: string }
interface LoginRequest { email: string; password: string; device_name?: string; device_fingerprint?: string }
interface MFASetupResponse { secret: string; qr_code_url: string }
```

### 响应类型

```typescript
interface LoginResponse {
  access_token?: string; refresh_token?: string; session_id?: string
  expires_in?: number; token_type?: string
  mfa_required?: boolean; mfa_session_token?: string
}

interface UserProfile {
  user_id: string; username?: string; email: string; email_verified: boolean
  status: string; mfa_enabled: boolean; created_at: string; profile?: object
}

interface GetMeResponse {
  user_id: string; email: string; username: string; status: string
  role: string; roles: string[]; app_count: number; created_at: string; profile?: object
}

interface OAuthApp {
  client_id: string; name: string; description: string
  redirect_uris: string[]; status: string; created_at: string
}

interface Session {
  session_id: string; device_name: string; os: string; browser: string
  ip_address: string; is_current: boolean; created_at: string
}
```

## 导出方法

| 方法 | 说明 |
|------|------|
| `api.register()` | 用户注册 |
| `api.login()` | 用户登录 |
| `api.mfaValidate()` | MFA TOTP 验证 |
| `api.logout()` | 登出 |
| `api.verifyEmail()` | 验证邮箱 |
| `api.forgotPassword()` | 忘记密码 |
| `api.resetPassword()` | 重置密码 |
| `api.getMe()` | 获取当前用户信息 |
| `api.getProfile()` | 获取个人资料 |
| `api.updateProfile()` | 更新个人资料 |
| `api.enableMFA()` | 启用 MFA |
| `api.disableMFA()` | 禁用 MFA |
| `api.changePassword()` | 修改密码 |
| `api.listSessions()` | 列出会话 |
| `api.revokeSession()` | 撤销会话 |
| `api.listApps()` | 列出 OAuth 应用 |
| `api.createApp()` | 创建 OAuth 应用 |
| `api.listAuthorizedApps()` | 列出已授权应用 |
| `api.revokeAppAuth()` | 撤销应用授权 |

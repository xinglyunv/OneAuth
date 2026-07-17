# 认证门户（Auth Web）

认证门户是 OneAuth 的主要前端应用，基于 Next.js 15 App Router 构建。它为用户提供统一的登录入口、用户控制台、开发者门户、管理控制台和 OAuth 授权确认页。

## 结构

```
web/apps/auth-web/
├── next.config.ts          # Next.js 配置 + API 反向代理
├── package.json            # 依赖声明
├── tsconfig.json           # TypeScript 配置
├── src/
│   └── app/
│       ├── layout.tsx      # 根布局（HTML shell）
│       ├── page.tsx        # 首页（Landing Page）
│       ├── globals.css     # 双设计系统（CC + DD）
│       ├── login/          # 用户登录页（含 MFA 二次验证）
│       ├── register/       # 用户注册页
│       ├── user/           # 用户控制台（需 USER/DEVELOPER 角色）
│       │   ├── layout.tsx  # 受保护布局 + 侧边栏
│       │   ├── page.tsx    # 账户概览
│       │   ├── profile/    # 个人资料编辑
│       │   ├── emails/     # 邮箱管理
│       │   ├── mfa/        # MFA 管理
│       │   ├── devices/    # 设备管理
│       │   ├── sessions/   # 会话管理
│       │   ├── password/   # 修改密码
│       │   ├── activity/   # 登录活动
│       │   ├── tokens/     # 个人访问令牌
│       │   ├── apps/       # OAuth 应用管理
│       │   └── webhooks/   # Webhook 管理
│       ├── developer/      # 开发者门户（需 DEVELOPER 角色）
│       │   ├── layout.tsx  # 受保护布局
│       │   ├── page.tsx    # 开发者概览
│       │   ├── login/      # 开发者独立登录
│       │   ├── register/   # 开发者独立注册
│       │   ├── apps/       # OAuth 应用管理
│       │   ├── webhooks/   # Webhook 管理
│       │   └── settings/   # 开发者设置
│       ├── admin/          # 管理控制台（独立 Admin JWT 认证）
│       │   ├── layout.tsx  # 受保护布局
│       │   ├── page.tsx    # 管理仪表盘
│       │   ├── login/      # 管理员独立登录
│       │   ├── users/      # 用户管理
│       │   ├── apps/       # 应用审核
│       │   ├── organizations/ # 组织管理
│       │   ├── roles/      # 权限管理
│       │   ├── scopes/     # Scope 管理
│       │   ├── tokens/     # Token 管理
│       │   ├── sessions/   # Session 管理
│       │   ├── security/   # 安全中心
│       │   ├── settings/   # 系统设置
│       │   └── audit/      # 审计日志
│       └── oauth/          # OAuth 第三方授权
│           ├── page.tsx    # 授权确认页
│           ├── login/      # OAuth 第三方登录
│           └── register/   # OAuth 第三方注册
```

## 关键文件

| 文件 | 目的 |
|------|------|
| `layout.tsx` | 根布局，设置 `lang="zh-CN"` |
| `page.tsx` | 首页，展示用户门户和开发者中心入口卡片 |
| `login/page.tsx` | 两步登录流程（凭证 → MFA），含设备指纹采集 |
| `oauth/page.tsx` | OAuth 授权确认页，展示 Scope 列表和同意/拒绝按钮 |
| `globals.css` | 双设计系统完整 CSS 变量和组件样式（884 行） |

## 路由角色保护

| Layout | 保护机制 | 重定向目标 |
|--------|---------|-----------|
| `/user/layout.tsx` | 检查 localStorage token → GET /api/me → 验证 role=USER/DEVELOPER | `/login` |
| `/developer/layout.tsx` | 检查 localStorage token → GET /api/me → 验证 role=DEVELOPER | `/login` |
| `/admin/layout.tsx` | 检查 localStorage token → 读取 user_email | `/admin/login` |

## 双设计系统

### CC (Corporate Clean) — 用户端

- 主色 `#1e40af`（蓝色）
- 背景 `#f8fafc`（浅灰）
- 白色卡片，`box-shadow: 0 1px 2px`
- 圆角 `0.75rem`
- 组件前缀: `cc-*`

### DD (Directory Dashboard) — 管理端

- 品牌色 `#2D1967`（紫色）
- 画布 `#F5F7F9`
- 侧边栏白色，宽度 240px
- 字体: Barlow
- 组件前缀: `dd-*`

## 认证策略

前端基于 localStorage 存储 JWT，通过 `useEffect` + `useRouter` 实现前端路由守卫：

1. 用户访问受保护路由
2. 检查 `localStorage.getItem("access_token")`
3. 无 token → 重定向到登录页
4. 有 token → `GET /api/me` 验证有效性
5. 无效 → 清除 token 并重定向

## API 代理

`next.config.ts` 配置了后端 API 的反向代理：

| 来源 | 目标 |
|------|------|
| `/api/:path*` | `http://localhost:9898/api/:path*` |
| `/oauth/:path*` | `http://localhost:9898/oauth/:path*` |
| `/userinfo` | `http://localhost:9898/userinfo` |
| `/.well-known/:path*` | `http://localhost:9898/.well-known/:path*` |

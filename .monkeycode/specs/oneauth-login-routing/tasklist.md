# 登录路由与 OAuth 架构实施计划

## Phase 1: 数据模型与核心架构

- [ ] 1. 创建 `UserRole` Ent schema（多对多关联 User ↔ Role）
   - 新增 `/workspace/internal/ent/schema/userrole.go`
   - 字段：`id` (uuid), `user_id` (uuid, FK→User), `role_id` (uuid, FK→Role)
   - 边：`user` → `User` (To), `role` → `Role` (From)
   - 添加 User → `roles` 边（To, 多对多）
   - 添加 Role → `users` 边（From, 多对多）

- [ ] 2. 扩展 Session schema
   - 添加字段：`role` (string, 可选), `login_type` (string, 默认 "normal")
   - login_type 枚举值：`normal`, `oauth`, `developer`, `admin`
   - 不添加 client_id（使用现有 device 字段管理来源）

- [ ] 3. 运行 `go generate ./internal/ent/` 生成代码
   - 验证 ent 代码生成成功

- [ ] 4. 数据库迁移
   - 创建自动迁移逻辑或 SQL 脚本
   - 插入初始角色数据：USER, DEVELOPER, ADMIN, SUPER_ADMIN

## Phase 2: 后端逻辑

- [ ] 5. 实现角色分配服务
   - 注册 Handler 中创建用户后分配 USER 角色
   - 提供 `AssignUserRole(ctx, userID, roleName)` 方法
   - 提供 `GetUserRoles(ctx, userID)` 方法
   - 提供 `HasRole(ctx, userID, roleName)` 方法

- [ ] 6. 修改登录 Handler
   - 登录成功后查询用户角色列表
   - 将角色信息存入 Session 记录（`role` 字段）
   - 设置 `login_type` 为 `normal`
   - 登录响应中返回角色信息用于前端跳转
   - 包含用户包含多个角色时的处理策略（取最高权限角色）

- [ ] 7. 修改 Session 创建逻辑
   - 所有创建 Session 的地方（登录、MFA 验证、OAuth 登录）均需要记录 `role` 和 `login_type`
   - MFA Validate 流程同步修改

- [ ] 8. 实现 `requireRole` 路由中间件
   - 从 JWT context 获取 user_id
   - 查询用户角色
   - 验证是否包含指定角色
   - 不满足则返回 403 Forbidden
   - 同时支持单一角色和多重角色验证

- [ ] 9. 应用路由权限保护（后端）
   - `/api/user/*` → requireRole(USER, DEVELOPER)
   - `/api/apps/*` → requireRole(DEVELOPER)
   - `/api/webhooks/*` → requireRole(DEVELOPER)
   - `/api/admin/*` → requireRole(ADMIN)（当前为独立 AdminJWT，保持不动）
   - 修改 router.go 应用中间件

- [ ]* 10. 编写角色服务单元测试
   - AssignUserRole 测试
   - GetUserRoles 测试
   - HasRole 测试

- [ ] 11. 实现 OAuth 角色限制
   - 修改 OAuthAuthorize handler
   - 用户已登录时检查角色：DEVELOPER → 403，ADMIN → 403
   - 用户未登录时通过 `/oauth/login` 登录后检查角色

- [ ] 12. 创建 OAuth 独立登录后端端点
   - 新增 `/api/auth/oauth/login` 端点
   - 登录成功后检查角色限制
   - 仅允许 USER 角色继续授权流程
   - DEVELOPER/ADMIN 返回 403

- [ ] 13. 创建 OAuth 注册后端端点
   - 新增 `/api/auth/oauth/register` 端点
   - 注册后默认分配 USER 角色
   - 禁止创建 DEVELOPER/ADMIN 角色

- [ ] 14. 重构 GetMe Handler
   - 改为从数据库 `user_roles` 表读取角色
   - 移除动态计算（基于 app_count 的逻辑）
   - 返回用户的所有角色列表和主角色

- [ ] 15. 检查点 - 确保后端编译通过
   - `go build ./...` 通过
   - 所有 API 端点可正常访问

## Phase 3: 前端路由改造

- [ ] 16. 重命名路由：`/account` → `/user`
   - 将 `/workspace/web/apps/auth-web/src/app/account/` 移动到 `/user/`
   - 更新所有 `account/layout.tsx` 中的内部链接
   - 更新 sidebar 中的路径引用

- [ ] 17. 统一登录页
   - 保留 `/login` 作为唯一登录入口
   - 移除独立 `/developer/login` 和 `/developer/register` 页面
   - 登录后通过 GetMe 返回的角色自动跳转

- [ ] 18. 创建 `/oauth/login` 页面
   - 独立的 OAuth 登录页面 UI
   - 登录后检查角色，仅 USER 可继续
   - 调用 `/api/auth/oauth/login` 端点
   - 成功后跳转到 OAuth 授权确认流程

- [ ] 19. 创建 `/oauth/register` 页面
   - 独立的 OAuth 注册页面 UI
   - 注册后仅创建 USER 角色
   - 调用 `/api/auth/oauth/register` 端点

- [ ] 20. 实现前端路由权限保护
   - 在 `/user` layout 中检查角色，非 USER/DEVELOPER 跳转到 `/login`
   - 在 `/developer` layout 中检查角色，非 DEVELOPER 跳转到 `/login`
   - 在 `/admin` layout 中检查角色，非 ADMIN 跳转到 `/login`

- [ ] 21. 更新所有内部链接和导航
   - 确认 `/user` 下所有页面链接正确
   - 更新 sidebar 中所有路径
   - 更新 `/page.tsx` 中的 CTA 链接

- [ ] 22. 检查点 - 确保前端编译通过
   - `npm run build` (turbo) 通过
   - 所有页面路由可访问

## 备注

- [ ]* 标记的任务为可选（测试相关），非核心功能
- Phase 1 是基础，Phase 2 和 Phase 3 可部分并行
- 管理员前端路由保持不变（`/admin/*`），独立 AdminJWT 认证不动

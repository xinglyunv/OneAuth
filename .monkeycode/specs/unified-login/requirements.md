# 聚合登陆系统需求文档

## Introduction

聚合登陆系统（Unified Login）是一个基于 OAuth 2.0 / OIDC 协议的单点登录（SSO）服务平台。用户通过一个聚合账号即可登录所有已接入的第三方网站，无需在每个网站分别注册。

系统采用 Go 语言实现后端服务，提供 RESTful API、官方 Web UI 以及可扩展的 SDK，支持邮箱注册、邮箱验证、密码重置、TOTP 多因素认证等账号安全功能。

## Glossary

- **聚合账号（Unified Account）**：用户在聚合登陆系统中注册的主账号，可用于登录所有已接入的第三方应用。
- **第三方应用（Client Application）**：接入聚合登陆系统的外部网站或服务。
- **OAuth 2.0**：授权框架协议，用于第三方应用获取有限的资源访问权限。
- **OIDC（OpenID Connect）**：基于 OAuth 2.0 的身份认证层协议。
- **授权码流程（Authorization Code Flow）**：OAuth 2.0 推荐的授权流程，适用于有后端的第三方应用。
- **TOTP**：基于时间的一次性密码算法，用于多因素认证。
- **ID Token**：OIDC 中用于传递用户身份信息的 JWT。
- **Access Token**：OAuth 2.0 中用于访问受保护资源的令牌。
- **Refresh Token**：用于获取新的 Access Token 的长效令牌。
- **Scope**：OAuth 2.0 中定义访问权限范围的机制，控制第三方应用可获取的用户数据粒度。
- **Audit Log**：记录用户关键操作的不可变日志，用于安全审计和行为追溯。
- **设备会话（Device Session）**：用户在某设备上登录后产生的活跃会话记录，包含设备指纹信息。

## Requirements

### Requirement 1: 用户注册

**User Story:** AS 一个访客，I want 使用邮箱注册聚合账号，so that 我可以用这个账号登录所有接入的网站。

#### Acceptance Criteria

1. WHEN 用户提交注册表单（邮箱 + 密码），系统 SHALL 验证邮箱格式和密码强度（最少 8 位，含大小写字母和数字）。
2. IF 邮箱已被注册，系统 SHALL 返回错误提示且不泄露该邮箱是否已注册。
3. WHEN 注册成功，系统 SHALL 创建未验证状态的用户记录，发送含验证链接的邮件到注册邮箱。
4. IF 用户在 24 小时内未完成邮箱验证，系统 SHALL 将该未验证账号标记为过期，同一邮箱可重新注册。

### Requirement 2: 邮箱验证

**User Story:** AS 一个刚注册的用户，I want 通过邮件验证邮箱所有权，so that 我的账号被激活可以使用。

#### Acceptance Criteria

1. WHEN 用户点击邮件中的验证链接，系统 SHALL 验证 token 的有效性和时效性（24 小时内有效）。
2. IF token 有效，系统 SHALL 将账号状态标记为已激活，并跳转到登录成功页。
3. IF token 无效或已过期，系统 SHALL 提示用户重新发送验证邮件。
4. WHEN 用户请求重新发送验证邮件，系统 SHALL 限制同一邮箱每 60 秒仅可发送一次。

### Requirement 3: 用户登录

**User Story:** AS 一个已注册用户，I want 使用邮箱和密码登录，so that 我可以访问聚合登陆系统和个人中心。

#### Acceptance Criteria

1. WHEN 用户提交正确的邮箱和密码，系统 SHALL 验证凭据并创建登录会话。
2. IF 用户开启了多因素认证，系统 SHALL 在密码验证通过后要求输入 TOTP 验证码。
3. IF 密码连续错误达到 5 次，系统 SHALL 锁定该账号 15 分钟，并发送安全告警邮件。
4. WHEN 登录成功，系统 SHALL 记录登录 IP、设备信息和时间戳。

### Requirement 4: 用户登出

**User Story:** AS 一个已登录用户，I want 主动登出，so that 当前会话被安全终止。

#### Acceptance Criteria

1. WHEN 用户点击登出，系统 SHALL 销毁当前会话 token。
2. WHEN 用户在聚合登陆中心登出，系统 SHALL 提供选项同步登出所有已授权的第三方应用。

### Requirement 5: 密码重置

**User Story:** AS 一个忘记密码的用户，I want 通过邮箱重置密码，so that 我可以重新登录。

#### Acceptance Criteria

1. WHEN 用户提交密码重置请求（输入邮箱），系统 SHALL 发送含重置链接的邮件到该邮箱。
2. IF 邮箱未注册，系统 SHALL 返回成功提示但不实际发送邮件。
3. WHEN 用户点击重置链接并提交新密码，系统 SHALL 验证 reset token 的有效性（30 分钟内有效）和密码强度。
4. WHEN 密码重置成功，系统 SHALL 销毁该账号所有活跃会话，要求用户重新登录。

### Requirement 6: 多因素认证（TOTP）

**User Story:** AS 一个安全敏感的用户，I want 开启 TOTP 多因素认证，so that 我的账号更安全。

#### Acceptance Criteria

1. WHEN 用户在个人中心开启 MFA，系统 SHALL 生成 TOTP 密钥并展示二维码供用户扫码绑定。
2. WHEN 用户输入 TOTP 验证码确认绑定，系统 SHALL 验证码值正确后激活 MFA。
3. WHEN 开启 MFA 的用户登录，系统 SHALL 在密码验证后要求输入 6 位 TOTP 验证码。
4. WHEN 用户关闭 MFA，系统 SHALL 要求验证当前 TOTP 码或邮箱验证码作为确认。

### Requirement 7: 第三方应用管理

**User Story:** AS 一个网站管理员，I want 在聚合登陆平台注册我的应用，so that 用户可以通过聚合账号登录我的网站。

#### Acceptance Criteria

1. WHEN 管理员提交应用注册信息（名称、回调 URL、网站首页），系统 SHALL 生成唯一的 Client ID 和 Client Secret。
2. WHEN 管理员查看应用详情，系统 SHALL 展示 Client ID、Client Secret（可重新生成）和回调 URL 配置。
3. WHEN 管理员修改回调 URL，系统 SHALL 验证 URL 格式并立即生效。

### Requirement 8: OAuth 2.0 授权码流程

**User Story:** AS 一个终端用户，I want 在第三方网站点击"聚合登陆"按钮完成授权登录，so that 无需在第三方网站单独注册。

#### Acceptance Criteria

1. WHEN 用户在第三方网站点击"聚合登陆"，系统 SHALL 将用户重定向到聚合登陆授权页面，显示应用名称和请求的权限范围。
2. IF 用户未登录，系统 SHALL 先引导用户完成登录，登录成功后自动跳回授权页。
3. WHEN 用户点击授权确认，系统 SHALL 生成授权码并重定向到第三方应用的回调 URL。
4. WHEN 第三方应用使用授权码换取 token，系统 SHALL 验证 Client ID、Client Secret、授权码和回调 URL 的一致性。
5. IF 授权码已被使用或过期（10 分钟内有效），系统 SHALL 拒绝令牌请求并返回错误。

### Requirement 9: OIDC ID Token

**User Story:** AS 一个第三方应用开发者，I want 获取包含用户身份信息的 ID Token，so that 我可以在应用中识别用户身份。

#### Acceptance Criteria

1. WHEN 第三方应用使用授权码换取 token，系统 SHALL 返回 Access Token、Refresh Token 和 ID Token（JWT 格式）。
2. ID Token SHALL 包含 sub（用户唯一 ID）、email、email_verified、name、picture 等标准 claims。
3. WHEN 第三方应用使用 Access Token 调用 /userinfo 端点，系统 SHALL 返回当前用户的基本信息。
4. WHEN Access Token 过期（默认 1 小时），第三方应用 SHALL 可使用 Refresh Token 获取新的 Access Token。

### Requirement 10: 已授权应用管理

**User Story:** AS 一个已登录用户，I want 查看和管理已授权的第三方应用，so that 我可以撤销不再使用的应用授权。

#### Acceptance Criteria

1. WHEN 用户访问个人中心的已授权应用列表，系统 SHALL 展示所有已授权应用的名称、授权时间和权限范围。
2. WHEN 用户对某个应用执行撤销授权，系统 SHALL 销毁该应用相关的所有 token。

### Requirement 11: 安全防护

**User Story:** AS 系统管理员，I want 系统具备基础安全防护能力，so that 用户账号和系统数据得到保护。

#### Acceptance Criteria

1. 系统 SHALL 对所有密码进行 bcrypt 哈希存储。
2. 系统 SHALL 对所有外部输入进行 XSS 和 SQL 注入防护。
3. 系统 SHALL 对敏感操作（登录、重置密码、修改安全设置）进行速率限制。
4. 系统 SHALL 在用户执行敏感操作（修改密码、关闭 MFA）时发送安全通知邮件。
5. IF 系统检测到异常登录（新设备或新 IP），系统 SHALL 发送安全告警邮件。

### Requirement 12: 官方 Web UI

**User Story:** AS 一个用户，I want 通过美观的 Web 页面进行注册、登录和管理账号，so that 操作体验流畅直观。

#### Acceptance Criteria

1. 系统 SHALL 提供登录、注册、邮箱验证、密码重置的 Web 页面。
2. 系统 SHALL 提供 OAuth 授权确认页面。
3. 系统 SHALL 提供个人中心页面（个人信息、MFA 设置、已授权应用管理）。
4. 系统 SHALL 提供应用管理后台页面（仅管理员）。
5. Web UI SHALL 支持移动端响应式布局。

### Requirement 13: SDK 支持

**User Story:** AS 一个第三方应用开发者，I want 使用官方 SDK 快速接入聚合登陆，so that 减少接入开发工作量。

#### Acceptance Criteria

1. 系统 SHALL 提供标准的 OAuth 2.0 / OIDC 发现端点（/.well-known/openid-configuration）。
2. 系统 SHALL 发布 Go 语言 SDK，封装授权码流程、token 刷新和用户信息获取。
3. SDK SHALL 提供中间件集成示例（Gin / net/http）。

### Requirement 14: 审计日志（Audit Log）

**User Story:** AS 系统管理员和用户，I want 查看账号操作的历史记录，so that 可以追溯安全事件和操作轨迹。

#### Acceptance Criteria

1. 系统 SHALL 记录所有关键操作事件：登录（成功/失败）、登出、注册、邮箱验证、密码修改、MFA 开启/关闭、应用授权/撤销、个人信息修改。
2. 每条审计日志 SHALL 包含：操作时间、操作类型、操作者 ID、IP 地址、User-Agent、操作结果。
3. WHEN 用户访问个人中心的审计日志，系统 SHALL 展示该用户近 90 天的操作记录。
4. WHEN 管理员访问管理后台审计日志，系统 SHALL 支持按用户、操作类型、时间范围检索。

### Requirement 15: 设备/会话管理

**User Story:** AS 一个已登录用户，I want 查看和管理我所有活跃的登录设备，so that 可以远程登出陌生设备保障安全。

#### Acceptance Criteria

1. WHEN 用户登录成功，系统 SHALL 记录当前设备信息（设备名称、操作系统、浏览器、IP、登录时间）作为一个会话。
2. WHEN 用户访问设备管理页面，系统 SHALL 列出所有活跃会话，标注当前会话。
3. WHEN 用户选择登出某个设备，系统 SHALL 销毁该会话对应的 token。
4. WHEN 用户选择登出所有其他设备，系统 SHALL 仅保留当前会话，销毁其余所有会话。

### Requirement 16: OAuth Scope 权限管理

**User Story:** AS 一个第三方应用管理员和终端用户，I want 精细化控制应用可获取的用户信息范围，so that 用户隐私得到保护且应用只获得必要数据。

#### Acceptance Criteria

1. 系统 SHALL 预定义 Scope 粒度：openid（基础身份）、profile（昵称/头像）、email（邮箱地址）、offline_access（Refresh Token）。
2. WHEN 管理员注册应用，系统 SHALL 允许选择应用可请求的最大 Scope 范围。
3. WHEN 用户在授权页面确认授权，系统 SHALL 清晰展示应用请求的每一项权限及其含义。
4. IF 第三方应用请求超出管理员预设范围的 Scope，系统 SHALL 在授权流程中忽略超出部分，仅授予允许的 Scope。
5. 用户 SHALL 可在已授权应用列表中查看每个应用实际获得的 Scope。


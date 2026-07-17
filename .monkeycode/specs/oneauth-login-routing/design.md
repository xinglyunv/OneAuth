# OneAuth 登录路由与 OAuth 登录架构设计

版本：v1.0


## 1. 设计目标

OneAuth 使用统一账号系统。

系统存在三类身份：

- USER 用户
- DEVELOPER 开发者
- ADMIN 管理员


要求：

1. 所有用户使用统一登录入口。
2. 登录后自动根据账号类型跳转对应系统。
3. 用户不能手动选择身份。
4. 不同身份之间严格隔离。
5. 第三方网站调用 OneAuth 登录时，使用独立 OAuth 登录页面。
6. 第三方 OAuth 登录禁止开发者账号和管理员账号。


---

## 2. 系统结构


```
OneAuth

www.x.com

├── /login
│
├── /register
│
├── /user
│
├── /developer
│
├── /admin
│
└── /oauth
    ├── /authorize
    ├── /login
    ├── /register
    ├── /consent
    └── /callback
```


---

## 3. 账号角色模型


### User

普通用户账号。

权限：

- 使用 OneAuth 登录
- 管理个人信息
- 管理安全设置
- 管理授权应用


禁止：

- 创建 OAuth 应用
- 管理系统
- 访问后台


---

### Developer

开发者账号。

权限：

- 创建 OAuth 应用
- 管理自己的应用
- 查看 API 数据
- 管理 Client 信息


禁止：

- 管理其他用户
- 修改系统设置
- 使用开发者身份登录第三方应用


---

### Admin

管理员账号。


权限：

- 管理用户
- 管理开发者
- 管理 OAuth 应用
- 管理系统设置
- 查看审计日志


禁止：

- 通过第三方 OAuth 登录


---

## 4. 内部统一登录


入口：

```
GET /login
```


用途：

OneAuth 官方网站登录。


流程：

```
用户访问

www.x.com/login

        ↓

输入账号密码

        ↓

Auth Service验证

        ↓

查询用户角色

        ↓

创建Session

        ↓

角色路由跳转
```


---

## 5. 登录后的自动跳转规则


### USER


条件：

```
role = USER
```


跳转：

```
/user
```


完整地址：

```
www.x.com/user
```


---

### DEVELOPER


条件：

```
role = DEVELOPER
```


跳转：

```
/developer
```


完整地址：

```
www.x.com/developer
```


---

### ADMIN


条件：

```
role = ADMIN
```


跳转：

```
/admin
```


完整地址：

```
www.x.com/admin
```


---

## 6. 身份隔离规则


### USER


允许：

```
/user/*
```


禁止：

```
/developer/*
/admin/*
```


---

### DEVELOPER


允许：

```
/developer/*
```


禁止：

```
/user/*
/admin/*
```


---

### ADMIN


允许：

```
/admin/*
```


禁止：

普通用户功能。


---

## 7. 路由权限验证


所有页面必须经过权限 Middleware。


示例：


```
/user

requireRole(USER)
```


```
/developer

requireRole(DEVELOPER)
```


```
/admin

requireRole(ADMIN)
```


前端隐藏菜单。

后端必须再次验证。


---

## 8. 第三方网站 OAuth 登录


第三方网站：

```
example.com
```


调用：

```
https://www.x.com/oauth/authorize
```


请求参数：

```
client_id

redirect_uri

scope

state

code_challenge
```


---

## 9. OAuth 独立登录页面


注意：

OAuth 登录不能复用：

```
/login
```


必须使用：

```
/oauth/login
```


原因：

内部登录和第三方授权登录权限不同。


---

## 10. OAuth 登录流程


流程：


```
第三方网站

↓

/oauth/authorize

↓

检查已有Session

↓

没有Session

↓

/oauth/login

↓

用户登录

↓

检查账号类型

↓

授权确认页面

↓

返回Authorization Code

↓

第三方完成登录
```


---

## 11. OAuth 注册


入口：

```
/oauth/register
```


用途：

第三方应用用户注册。


规则：

只能创建：

```
USER
```


禁止：

创建：

```
DEVELOPER

ADMIN
```


---

## 12. OAuth 登录角色限制


OAuth 登录：

```
/oauth/login
```


登录成功后：

检查角色。


### USER


允许：


```
继续授权

↓

生成Authorization Code

↓

返回第三方
```


### DEVELOPER


禁止。


返回：

```
403

Developer accounts cannot login through OAuth
```


原因：

开发者账号只能管理开发者资源。


### ADMIN


禁止。


返回：

```
403

Administrator accounts cannot login through OAuth
```


原因：

管理员账号不能暴露给第三方应用。


---

## 13. 数据模型


### users


字段：

```
id

email

password_hash

status

created_at
```


### roles


数据：

```
USER

DEVELOPER

ADMIN

SUPER_ADMIN
```


### user_roles


关系：

```
user_id

role_id
```


### sessions


增加：

```
user_id

role

login_type

client_id

ip

device

created_at
```


login_type:

```
NORMAL_LOGIN

OAUTH_LOGIN

DEVELOPER_LOGIN

ADMIN_LOGIN
```


---

## 14. OAuth Client


表：

```
oauth_clients
```


字段：

```
client_id

client_secret

owner_id

redirect_uri

scope

status
```


owner_id：

表示：

该应用属于哪个 Developer。


---

## 15. 登录逻辑伪代码


```go
func Login(user, context){

    role := GetUserRole(user)


    if context == "NORMAL_LOGIN" {

        switch role {

        case USER:
            redirect("/user")

        case DEVELOPER:
            redirect("/developer")

        case ADMIN:
            redirect("/admin")
        }

    }


    if context == "OAUTH_LOGIN" {

        if role == DEVELOPER {
            deny()
        }


        if role == ADMIN {
            deny()
        }


        allow()

    }

}
```


---

## 16. 最终效果


### 官方网站登录


```
www.x.com/login

        ↓

账号判断

        ↓


USER
 |
 /user


DEVELOPER
 |
 /developer


ADMIN
 |
 /admin
```



---

### 第三方网站登录


```
第三方网站

↓

OAuth授权

↓

/oauth/login

↓

账号判断


USER

允许


DEVELOPER

拒绝


ADMIN

拒绝
```



---

## 17. 开发要求


实现：

- RBAC角色系统
- 统一登录入口
- 自动身份分流
- Session角色记录
- 路由权限控制
- OAuth独立登录
- OAuth角色限制
- 第三方注册限制
- 前后端双重权限验证

# OneAuth 部署指南

## 环境要求

- Linux 服务器 (Ubuntu 22.04+ / CentOS 7+)
- Go 1.24+
- PostgreSQL 16+
- Redis 7+
- Node.js 18+ (pnpm)
- Nginx（反向代理）

## 1. 安装依赖

```bash
# Ubuntu
apt update && apt install -y golang-go postgresql redis-server nginx

# 安装 pnpm
npm install -g pnpm
```

## 2. 配置 PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE oneauth;
CREATE USER oneauth WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE oneauth TO oneauth;
\q
```

## 3. 配置 Redis

```bash
# Ubuntu: 默认已启动
systemctl enable redis-server && systemctl start redis-server
```

## 4. 拉取代码

```bash
git clone https://github.com/xinglyunv/OneAuth.git
cd OneAuth
```

## 5. 生成 Ent 代码

```bash
go generate ./internal/ent/...
```

## 6. 配置

编辑 `config/config.yaml`：

```yaml
server:
  http_port: 9898

database:
  host: localhost
  port: 5432
  user: oneauth
  password: your_password
  dbname: oneauth

redis:
  addr: localhost:6379
  password: ""
```

## 7. 构建后端

```bash
go build -o server ./cmd/server
```

## 8. 构建前端

```bash
cd web
pnpm install
pnpm build
cd ..
```

## 9. 运行

```bash
# 使用 systemd 管理

# /etc/systemd/system/oneauth.service
[Unit]
Description=OneAuth
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/OneAuth
ExecStart=/path/to/OneAuth/server
Restart=always

[Install]
WantedBy=multi-user.target

# 启动
systemctl daemon-reload
systemctl enable oneauth
systemctl start oneauth
```

## 10. Nginx 反向代理

```nginx
# /etc/nginx/sites-available/oneauth
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:9898;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 启用
ln -s /etc/nginx/sites-available/oneauth /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 11. SSL（可选）

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## 验证

访问 `http://your-domain.com` 确认服务正常运行。

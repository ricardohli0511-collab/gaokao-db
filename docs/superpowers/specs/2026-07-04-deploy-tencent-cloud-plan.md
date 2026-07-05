# 部署到腾讯云服务器 — 执行计划

## 前提

- 腾讯云 2核4G 服务器，已有其他软件在运行
- 需要把当前项目（gaokao-db）并排部署，互不影响
- 数据库从 Turso 切到本地 SQLite

## 步骤

### 第一步：本地 — 切换数据库到本地 SQLite

| 文件 | 操作 |
|------|------|
| `.env` | `DATABASE_URL="file:./prisma/dev.db"`，删除 TURSO_AUTH_TOKEN |
| `src/lib/prisma.ts` | `PrismaLibSql` → `PrismaSqlite`，去掉 authToken |
| `package.json` | `npm install @prisma/adapter-sqlite`，`npm uninstall @prisma/adapter-libsql` |

本地验证：`npm run dev`，确认首页秒开。

### 第二步：本地 — 导出 Turso 数据到本地文件

```bash
node scripts/export-from-turso.js   # 或通过 API 导出
# → 生成 prisma/dev.db 本地文件
```

运行 `npx prisma db push` 确保 schema 和本地数据库对齐。

### 第三步：本地 — 构建生产包

```bash
npm run build
# 确认 build 成功（忽略 scripts/data/ 的预存错误）
```

### 第四步：服务器 — 上传项目

```bash
# SSH 到腾讯云
scp -r gaokao/ 用户名@服务器IP:/home/你的用户名/gaokao/
```

上传文件（排除 node_modules、.env）：
- `.next/` 构建产物
- `prisma/dev.db` 数据库文件
- `package.json` `package-lock.json`
- `public/` 静态资源

### 第五步：服务器 — 启动服务

```bash
ssh 用户名@服务IP
cd /home/你的用户名/gaokao
cp .env.example .env    # 编辑 DATABASE_URL
npm install --production
PORT=3001 npm run start   # 用 3001 避免和现有软件端口冲突
```

### 第六步：服务器 — 配置 nginx 反向代理

```nginx
# /etc/nginx/sites-available/gaokao
server {
    listen 80;
    server_name gaokao.你的域名.com;   # 或你的域名/gaokao

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 启用
ln -s /etc/nginx/sites-available/gaokao /etc/nginx/sites-enabled/
nginx -t && nginx -s reload
```

### 验证

1. 访问 `http://你的域名/` — 现有软件正常
2. 访问 `http://gaokao.你的域名/` — 升学网站正常，页面秒响应
3. 管理后台登录正常

## 不在此范围

- 修改现有软件配置
- Docker 容器化
- HTTPS 证书配置（如需可后续加 Certbot）

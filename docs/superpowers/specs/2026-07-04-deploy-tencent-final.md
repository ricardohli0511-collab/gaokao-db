# 部署到腾讯云服务器 — 最终执行计划

## 服务器信息

- IP: `111.230.94.26`
- 用户: `uniclass`
- SSH 端口: 22 (开放)
- 配置: 2核4G

## 安全原则

- **不修改现有软件的任何配置**
- 升学网站用**独立目录** `/home/uniclass/gaokao/`
- 用**独立端口** 3001 避免冲突
- nginx 用**二级域名**区分，不动现有配置

## 执行步骤

### 第1步: SSH 登录 + 探测环境

```bash
ssh uniclass@111.230.94.26
# 登录后执行:
node -v        # 检查 Node.js 版本
npm -v         # 检查 npm
nginx -v       # 检查 nginx
ss -tlnp       # 查看已用端口
ls /home/uniclass/   # 查看现有项目
pm2 list       # 检查 pm2 进程管理
free -h        # 内存
df -h          # 磁盘
```

### 第2步: 安装 Node.js（如没有）

```bash
# 如果 node -v 无输出，安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 第3步: 上传项目

在**本地 Mac** 执行：

```bash
# 打包（排除 node_modules）
cd /Users/haoyuli/Desktop/gaokao
tar --exclude='node_modules' --exclude='.next/cache' -czf /tmp/gaokao-deploy.tar.gz .

# 上传
scp /tmp/gaokao-deploy.tar.gz uniclass@111.230.94.26:/home/uniclass/
```

### 第4步: 解压 + 安装依赖

在**服务器**执行：

```bash
cd /home/uniclass
mkdir -p gaokao
cd gaokao
tar xzf ../gaokao-deploy.tar.gz
npm install --production
```

### 第5步: 确保数据库文件存在

```bash
# 检查 dev.db 是否已上传
ls -lh /home/uniclass/gaokao/prisma/dev.db
# 应该显示 ~50MB
```

### 第6步: 选择未占用端口启动

```bash
# 检查 3001 是否空闲
ss -tlnp | grep 3001

# 如果没有输出，用 3001 启动
cd /home/uniclass/gaokao
PORT=3001 npm run start

# 如果 3001 被占，试 3002、3003...
```

### 第7步: 配置 nginx（不动现有配置）

```bash
sudo tee /etc/nginx/sites-available/gaokao << 'EOF'
server {
    listen 80;
    server_name gaokao.uciclass.com;  # 改成你的域名

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/gaokao /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

### 第8步: 用 pm2 守护进程

```bash
# 安装 pm2（如果没有）
npm install -g pm2

# 启动
cd /home/uniclass/gaokao
PORT=3001 pm2 start npm --name gaokao -- run start

# 开机自启
pm2 save
pm2 startup
```

### 验证

1. `curl http://localhost:3001/` → 返回 HTML
2. `curl http://localhost:3001/api/institutions/1` → 返回 JSON
3. 浏览器访问 `http://111.230.94.26:3001/` （如果防火墙开放 3001）
4. 配置域名后访问 `http://gaokao.yourdomain.com/`

## 回滚方案

如果出问题：
```bash
pm2 stop gaokao                           # 停掉升学网站
sudo rm /etc/nginx/sites-enabled/gaokao   # 移除 nginx 配置
sudo nginx -s reload                       # nginx 重载
# 现有软件完全不受影响
```

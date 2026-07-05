# GitHub 集成部署到 Cloudflare Pages

## 当前状态

- 项目不是 Git 仓库
- `npm run build:static` 构建成功，`out/` 目录包含所有静态文件

## 步骤

### 1. 初始化 Git 仓库

```bash
cd gaokao
git init
```

### 2. 创建 .gitignore

排除 `node_modules/`, `.next/`, `out/`, `prisma/dev.db`, `.env`

### 3. 提交代码

```bash
git add .
git commit -m "initial commit"
```

### 4. 推送到 GitHub

在 GitHub 创建新仓库（建议命名 `gaokao-db`），然后：

```bash
git remote add origin https://github.com/你的用户名/gaokao-db.git
git push -u origin main
```

### 5. Cloudflare Pages 连接

1. https://dash.cloudflare.com → 左侧「Workers 和 Pages」
2. 「创建」→「Pages」→「连接到 Git」
3. 授权 GitHub，选择 `gaokao-db` 仓库
4. 构建设置：
   - **构建命令**：`npm run build:static`
   - **输出目录**：`out`
   - **Node.js 版本**：`20` 或 `22`
5. 「保存并部署」

### 6. 自动部署

以后每次 `git push` 到 main 分支，Cloudflare 自动重新构建部署。

## 环境变量（Cloudflare 里设置）

```
DATABASE_URL = file:./prisma/dev.db
```

> 构建时会用 dev.db dump 数据到 JSON，然后烤进 HTML。

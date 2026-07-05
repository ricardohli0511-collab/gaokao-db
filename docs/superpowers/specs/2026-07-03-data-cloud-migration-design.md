# 数据上云方案设计文档

## 概述

将项目中的本地 SQLite 数据库（`dev.db`）迁移到 Turso 云数据库，并一次性批量导入 `data/raw/` 下的所有 Excel 源文件。完成后本地不再保留数据库文件和 Excel 源文件。

## 当前状态

- **数据库**：SQLite，本地文件 `/Users/haoyuli/Desktop/gaokao/dev.db`
- **连接方式**：`@prisma/adapter-libsql` + `@libsql/client`（已安装 Turso 兼容客户端）
- **Excel 源文件**：`data/raw/` 下有山东/湖南/浙江/江苏 11 个 Excel 文件（2023-2025）
- **导入方式**：管理后台 `/admin/import/csv` 通过 xlsx 库解析后 upsert 到 SQLite
- **中间件**：`middleware.ts` 对 `/admin/*` 路径进行认证拦截

## 方案决策

| 决策 | 选项 | 理由 |
|------|------|------|
| 导入方式 | 批量脚本 | 11 个文件手动上传太繁琐 |
| 迁移目标 | Turso | 项目已集成 `@libsql/client`，零额外依赖 |
| 推进顺序 | 先导入后迁移 | 先在本地验证数据完整性，再一次性迁移到云 |

## 设计方案

### Step 1：批量导入脚本

创建 `scripts/import-all.ts`，功能：

1. 使用 `glob` 扫描 `data/raw/` 下所有 `.xls` / `.xlsx` 文件
2. 对每个文件，用 `xlsx` 库解析工作表（复用 `src/app/api/admin/import/csv/route.ts` 中的 `parseWorkbook` 逻辑）
3. 调用 `src/lib/import/upsert.ts` 中的 `upsertAdmissionBundle` 写入数据
4. 打印每个文件的导入结果统计（成功/跳过/错误数量）

技术要点：
- 复用现有的 `normalizeAdmissionType`、`normalizeInstitutionName`、`normalizeNumberLike` 等数据清洗函数
- 复用 `src/lib/import/upsert.ts` 的 upsert 逻辑（包含院校匹配和自动创建）
- 脚本用 `tsx` 执行，无需编译

### Step 2：验证数据接入

1. 运行 `npm run dev` 启动本地服务器
2. 验证首页国内高考查询（选择省份山东、年份 2025、输入分数）能查到新数据
3. 验证 `/recommend` 推荐页能正确推荐山东/浙江/江苏的院校
4. 抽查 `data/raw/` 中某校的最低分与查询结果页展示一致

### Step 3：Turso 云数据库迁移

1. 安装 Turso CLI：`brew install tursodatabase/tap/turso`（或 `curl -sSfL https://get.tur.so/install.sh | bash`）
2. 登录：`turso auth login`
3. 创建数据库：`turso db create gaokao-db`
4. 获取连接 URL：`turso db show gaokao-db --url`
5. 导入本地数据：`turso db shell gaokao-db < dump.sql`（需先 `sqlite3 dev.db .dump > dump.sql`）
6. 创建 auth token：`turso db tokens create gaokao-db`
7. 更新 `.env`：
   ```
   DATABASE_URL="libsql://[your-db-name]-[org].turso.io"
   TURSO_AUTH_TOKEN="[your-token]"
   ```
8. 重启开发服务器验证一切正常
9. 删除本地 `dev.db`

### Step 4：清理本地文件

1. 删除 `data/raw/` 目录下所有 Excel 文件
2. 删除 `.tmp-import/` 目录
3. 在 `.gitignore` 中加入：
   ```
   /dev.db
   /dev.db-journal
   /dump.sql
   /data/
   /.tmp-import/
   ```

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/import-all.ts` | **新建** | 批量导入脚本 |
| `prisma/schema.prisma` | 不修改 | 保持 SQLite provider，Turso 兼容 |
| `.env` | 修改 | DATABASE_URL → Turso |
| `.gitignore` | 修改 | 加入 dev.db、data/、.tmp-import/ |
| `/dev.db` | 删除 | 迁移到云后删除本地文件 |
| `data/raw/` | 删除 | Excel 源文件清理 |

## 不在本次范围

- 修改 Schema 结构（保持适配 SQLite 的模型）
- 客户端 API 改造（`@prisma/adapter-libsql` 已兼容 Turso HTTP 连接）
- 对已有三次 Phase 的功能改动

## 验证步骤

1. 运行 `tsx scripts/import-all.ts` 成功导入 11 个文件
2. 首页查询山东 2025 数据有结果
3. `/recommend` 推荐功能正常
4. `DATABASE_URL` 切换后 `npm run dev` 正常启动
5. 所有已有页面不报错
6. 本地不再有 `dev.db` 和 `data/raw/` 目录

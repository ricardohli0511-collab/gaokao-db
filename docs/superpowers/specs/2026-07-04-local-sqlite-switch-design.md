# 数据库切换到本地 SQLite + 缓存加速 设计文档

## 目标

把数据库从远程 Turso（每次查询 200-800ms）切到本地 SQLite（<5ms），网站操作秒响应。同时部署后其他人也能访问。

## 根因

```typescript
// 当前：所有 SQL 走网络到 Turso
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,  // libsql://gaokao-db...turso.io
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

每次 `prisma.admissionRecord.findMany()` 都是 HTTP 请求 → Turso 服务器 → 返回。首页加载 3-5 次查询 = 0.6-4s 纯网络延迟。

## 方案：本地 SQLite + API 缓存

### 1. 数据库适配器从 LibSQL 切回原生 SQLite

**文件**：`src/lib/prisma.ts`

```typescript
// 改前
import { PrismaLibSql } from '@prisma/adapter-libsql';
const adapter = new PrismaLibSql({ url: ..., authToken: ... });

// 改后  
import { PrismaSqlite } from '@prisma/adapter-sqlite';
const adapter = new PrismaSqlite({ url: 'file:./prisma/dev.db' });
```

**文件**：`prisma/schema.prisma`

```diff
- provider = "sqlite"  
+ provider = "sqlite"
// 不变，但 datasource url 改为文件路径
```

**文件**：`.env`

```diff
- DATABASE_URL="libsql://gaokao-db-...turso.io"
- TURSO_AUTH_TOKEN="eyJ..."
+ DATABASE_URL="file:./prisma/dev.db"
```

### 2. 数据迁移：从 Turso 导出 → 导入本地

```bash
# 用 Turso CLI 导出
turso db shell gaokao-db ".dump" > dump.sql
# 导入本地
sqlite3 prisma/dev.db < dump.sql
```

如果 Turso CLI 不可用，通过现有 API 逐表导出（已有 /api/admin/records 等接口）。

### 3. 新增 API 缓存层

**文件**：新建 `src/lib/cache.ts`

```typescript
const cache = new Map<string, { data: unknown; expiry: number }>();

export function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return Promise.resolve(entry.data as T);
  }
  return fetcher().then((data) => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  });
}

export function invalidateCache(pattern: string) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
```

**涉及文件**：每个 API route 的 GET 方法用 `getCached()` 包裹

| Route | TTL | 说明 |
|-------|-----|------|
| `/api/provinces` | 1h | 省份列表不变 |
| `/api/years` | 1h | 年份列表不变 |
| `/api/provinces/stats` | 10min | 省份统计 |
| `/api/records` | 1min | 查询结果 |
| `/api/recommend` | 1min | 推荐结果 |
| `/api/institutions/[id]` | 10min | 院校详情 |
| `/api/admin/records` | 30s | 管理后台（修改后失效） |

管理后台写操作（POST/PUT/DELETE）时调用 `invalidateCache('admin/records')`。

### 4. 部署方案（让其他人也能用）

| 方案 | 速度 | 可行性 |
|------|------|--------|
| **VPS（推荐）** | 本地磁盘 SQLite < 5ms | 阿里云/腾讯云轻量服务器 ¥50/月，sqlite 文件持久化 |
| **Fly.io** | 本地卷 SQLite < 5ms | 有免费额度的 volumes 持久化，但国内访问可能慢 |
| **Vercel + Turso** | 远程 200ms+ | 和现在一样慢，不推荐 |
| **自托管** | 你的 MacBook 当服务器 | 开发阶段直接用，通过 ngrok/frp 暴露给外网 |

**推荐路线**：
1. 开发阶段：本地 SQLite + `npm run dev`，秒响应
2. 分享给朋友：用 ngrok `ngrok http 3000` 临时生成公网 URL
3. 正式部署：买一台阿里云轻量服务器，`npm run build && npm start`

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.env` | 修改 | DATABASE_URL 改为本地路径 |
| `src/lib/prisma.ts` | 修改 | 适配器从 PrismaLibSql 改为 PrismaSqlite |
| `src/lib/cache.ts` | 新建 | 内存缓存工具 |
| `src/app/api/records/route.ts` | 修改 | GET 包装缓存 |
| `src/app/api/recommend/route.ts` | 修改 | GET 包装缓存 |
| `src/app/api/institutions/[id]/route.ts` | 修改 | GET 包装缓存 |
| `src/app/api/admin/records/route.ts` | 修改 | POST 后 invalidate 缓存 |
| `package.json` | 修改 | @prisma/adapter-libsql → @prisma/adapter-sqlite |

## 不在此范围

- 修改 Prisma Schema
- 修改前端页面逻辑
- Redis 缓存（过度设计，本地 SQLite 已经够快）

## 验证步骤

1. `.env` 改 DATABASE_URL 后 `npm run dev`，首页加载 < 1s
2. `curl -o /dev/null -w "%{time_total}" http://localhost:3000/` < 0.3s
3. 查询/推荐/院校详情均秒返
4. `npm run build` 通过
5. ngrok 分享给朋友，URL 可访问

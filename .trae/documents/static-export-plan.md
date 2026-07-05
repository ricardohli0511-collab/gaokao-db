# 修复剩余 API 调用 + 部署 Cloudflare Pages

## 当前状态

构建成功（45 HTML 页面 + 4 JSON 数据文件），但以下页面仍有 `fetch('/api/...')` 调用，部署后会报错：

| 页面 | 问题 fetch | 数量 |
|------|-----------|------|
| `query/page.tsx` | `/api/provinces`, `/api/years`, `/api/records`, `/api/recommend`, `/api/institutions/[id]` | 6处 |
| `recommend/page.tsx` | `/api/recommend` 或 `/api/recommend/associate` | 1处 |
| `school/[id]/ClientPage.tsx` | `/api/institutions/[id]`（分页第2页+） | 1处 |

---

## 改造方案

### 1. query/page.tsx（最复杂，~950行）

**省份/年份** → `/data/provinces-years.json`

```diff
- fetch('/api/provinces')
- fetch('/api/years')
+ fetch('/data/provinces-years.json')
```

**查询模式** → 客户端过滤 `/data/records.json`

原来：
- 收集表单参数（province/year/subjectGroup/batch 等）
- `fetch(/api/records?...)` → 服务端 prisma 查询
- 再对每条记录 `fetch(/api/institutions/[id])` 获取趋势数据

改为：
- `fetch('/data/records.json')` 一次性加载全部数据（710KB）
- 客户端 `Array.filter` 实现筛选 + 分页
- 趋势数据直接从 `records.json` 中 group by institutionId + year

**推荐模式** → 客户端推荐算法

原来 `/api/recommend` 做的工作：
1. 查询 `admissionRecord` 表（条件：year, province, subjectGroup, batch 等）
2. 按 `reachOffset/matchOffset` 把结果分成：冲刺(reach) / 稳妥(match) / 保底(safety)

改为客户端：load `/data/records.json` → 过滤 → 按阈值分组

**院校详情** → `/data/institutions.json`

```diff
- fetch(`/api/institutions/${institutionId}`)
+ 从已缓存的 institutions.json 中查找
```

### 2. recommend/page.tsx

```diff
- fetch(`${apiEndpoint}?${params.toString()}`)
+ 加载 /data/records.json 或 /data/associate.json → 客户端分组
```

### 3. school/[id] 分页

`page.tsx` 服务端已预取 50 条。第2页及以上需要 fallback。

改为：`ClientPage.tsx` 中当 `recordsPage > 1` 时加载 `/data/records.json`，filter by institutionId 补充数据。

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/app/query/page.tsx` | 重写 fetchFilter/fetchRecords/fetchRecommend/趋势数据部分 |
| `src/app/recommend/page.tsx` | 改为客户端推荐算法 |
| `src/app/school/[id]/ClientPage.tsx` | 分页 fallback 使用 data JSON |
| `src/lib/recommend.ts` | **新增**：客户端推荐算法函数 |

---

## Cloudflare Pages 部署

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录
wrangler login

# 3. 创建 pages 项目
wrangler pages project create gaokao-db

# 4. 部署 out/ 目录
wrangler pages deploy out --project-name=gaokao-db
```

或通过 GitHub Actions 自动部署（后续可添加）。

---

## 验证

1. `npm run build:static` 成功
2. `npx serve out` 本地访问 `/query` → 筛选数据正常展示
3. `/recommend` → 推荐结果正常
4. 部署后所有页面不报 404/500

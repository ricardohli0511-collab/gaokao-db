# 纯静态改造：数据全内置到 HTML

## 核心思路

`npm run build` 时把所有数据库数据「烤」进静态文件中。部署后不需要任何服务器、数据库、API。

---

## 改造策略（按页面分）

### 第1层：改为纯服务端组件（数据 100% 内嵌）

| 页面 | 改造 |
|------|------|
| `associate/[id]` | 在 `page.tsx` 中 `await prisma.associateDegreeRecord.findUnique()` 直查数据，作为 props 传给纯展示组件。<br>**删除** `ClientPage.tsx`，不再需要 API。 |
| `associate` 列表 | 服务端读取 `searchParams` 中的筛选参数（examCategory/programmeCategory），直查 prisma 渲染。下拉切换改为 `<Link>` 跳转新 searchParams。 |
| `hk-schools` | 同上 —— searchParams 驱动 hkCategory 筛选，服务端 prisma 查询。 |

### 第2层：服务端预取初始数据（hybrid）

| 页面 | 改造 |
|------|------|
| `school/[id]` | `page.tsx` 服务端用 `params.id` 查询 institution + 第1页 records，传给 `ClientPage` 作为 `initialData`。<br>分页/筛选/Tab 保持客户端 `useState`（数据从 API 变静文件）。<br>**关键**：图表数据也在服务端预取全部 years 的 records，<br>传入组件作为初始 chart 数据。 |
| 首页 | 省份/年份/院校列表在服务端预取，作为初始 props 传给客户端表单组件。 |

### 第3层：API 数据预生成 JSON（复杂交互页用）

| 页面 | 改造 |
|------|------|
| `query` | 太复杂无法改服务端组件。改为：构建时预生成 `public/data/records.json`（所有录取记录）和 `public/data/recommend-index.json`（推荐索引），页面用 `fetch('/data/records.json')` 替代 `fetch('/api/records')`。 |
| `recommend` | 同上，所有推荐数据预生成到 `public/data/recommend.json`。 |

### 不需要改的

| 页面 | 原因 |
|------|------|
| `admin/*` | 管理后台无法静态化，静态部署后只是占位页 |
| `compare` | 纯客户端 zustand store，不依赖后端 |

---

## 数据实体化（关键步骤）

构建前运行脚本，从 SQLite dump 出：

```
public/data/
├── records.json        ← 所有 AdmissionRecord（约600条）
├── institutions.json   ← 所有 Institution（约30条）
├── associate.json      ← 所有 AssociateDegreeRecord
└── provinces-years.json ← 省份 + 年份枚举
```

### 数据量估算

| 文件 | 大小 |
|------|------|
| records.json（DSE 562条 + 高考 29条） | ~200KB |
| institutions.json（30条） | ~5KB |
| associate.json | ~10KB |
| **合计** | **~220KB** |

> Chrome 首次加载 200KB JSON 约需 30-50ms，比 Turso 网络延迟快 10 倍。

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| `src/app/associate/[id]/page.tsx` | 改为服务端组件 + prisma 直查 |
| `src/app/associate/[id]/ClientPage.tsx` | **删除** |
| `src/app/associate/page.tsx` | 改为 searchParams 驱动服务端组件 |
| `src/app/hk-schools/page.tsx` | 改为 searchParams 驱动服务端组件 |
| `src/app/school/[id]/page.tsx` | 服务端预取 initialData |
| `src/app/page.tsx` | 服务端预取 provinces/years/institutions |
| `src/app/query/page.tsx` | 改 fetch 目标为 `/data/records.json` |
| `src/app/recommend/page.tsx` | 改 fetch 目标为 `/data/recommend.json` |
| `scripts/export-static-data.ts` | **新增**：构建前 dump 数据库到 JSON |
| `package.json` | `build:static` 增加数据导出步骤 |

---

## 验证

1. `npm run build:static` 成功，`out/` 包含所有页面 + `public/data/*.json`
2. `npx serve out` 本地测试，所有页面数据正常渲染
3. 香港大学详情页能看到课程列表和分数

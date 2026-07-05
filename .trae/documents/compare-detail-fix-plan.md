# 对比功能修复 + 学校详情页修复 计划

## 一、问题诊断

### 问题1：对比功能始终失败

**现象**：点击「开始对比」返回错误「对比需要 province、year、subjectGroup、batch 上下文」

**根因**：3个 Bug 叠加导致：

| Bug | 位置 | 问题 |
|-----|------|------|
| B1 | `school/[id]/page.tsx` `handleCompare` | 只传 `{id, name}`，完全不带上下文 |
| B2 | `recommend/page.tsx` `toggleCompare` | 缺 `subjectGroup` 和 `batch` 字段 |
| B3 | `CompareDrawer.tsx` `handleCompare` | 只看 `items[0]` 的上下文——如果第一项是从学校详情页加入的（无上下文），即使其他项有完整上下文也会失败 |

**Flow**：用户在学校详情页点「加入对比」→ item 无上下文 → 存入 localStorage → 该 item 排在数组首位 → `CompareDrawer` 取 `items[0]` → 发送空上下文给 API → 400 错误。

### 问题2：学校详情页查看不了内容

**现象**：筛选出的学校打开详情后没有录取数据。

**根因**：

| 原因 | 说明 |
|------|------|
| API 默认只返回 20 条 | `pageSize=20`，有记录的按 `year desc, minScore desc` 排序后被截断 |
| 前端没有分页 | `meta.total` 已返回但前端从未使用 |
| API 无 try-catch | 数据库错误时静默 500，无明确错误信息 |
| 部分院校确实无记录 | 如香港副学士院校等，Institution 表有但 AdmissionRecord 表没有 |

---

## 二、实施计划

### 实施项 A：修复对比功能（3个修复点）

#### A1. CompareDrawer — 智能上下文提取

**文件**：`src/components/CompareDrawer.tsx`

修改 `handleCompare`，不从 `items[0]` 取上下文，改为：
1. 遍历所有 items，找到第一个有 `province && year && subjectGroup && batch` 的 item
2. 如果都找不到完整上下文，找第一个有 `examCategory` 的 item
3. 如果所有 items 都没有任何上下文 → 显示友好提示「部分院校缺少查询上下文，请从查询页重新添加」

```typescript
const contextItem = items.find(i => i.province && i.year && i.subjectGroup && i.batch)
  || items.find(i => i.examCategory)
  || null;

if (!contextItem) {
  setError('对比院校缺少查询上下文，请从查询结果页重新添加院校');
  setComparing(false);
  return;
}
```

#### A2. school/[id] — 对比按钮改为仅打开抽屉

**文件**：`src/app/school/[id]/page.tsx`

修改 `handleCompare`：不再将院校加入对比列表（无上下文不可用），只调度事件打开对比抽屉，让用户查看已在查询页添加的对比项。

```typescript
const handleCompare = useCallback(() => {
  window.dispatchEvent(new CustomEvent('open-compare-drawer'));
}, []);
```

按钮文案从「加入对比」改为「查看对比」。

#### A3. compare API — 放宽 DSE 模式的上下文要求

**文件**：`src/app/api/compare/route.ts`

`examCategory` 单独已足够筛选 DSE 记录，不需要 province/year/subjectGroup/batch。修改验证逻辑：

```typescript
const hasContext = province && year && subjectGroup && batch;
const hasExamOnly = !!examCategory;

if (!hasContext && !hasExamOnly) {
  // 400 error
}
```

同时当 `hasExamOnly` 为 true 时，仅用 `examCategory` + 可选的 `year` 过滤，不再要求 province。

### 实施项 B：修复学校详情页

#### B1. 增加分页支持

**文件**：`src/app/school/[id]/page.tsx`

1. 新增 `recordsPage` 状态（默认1）
2. 新增 `recordsPageSize` 常量（50，一次显示更多）
3. fetch 时传入 `?page=${recordsPage}&pageSize=${recordsPageSize}`
4. 当 `meta.total > recordsPage * recordsPageSize` 时，列表底部显示「加载更多」按钮
5. 点击时 `recordsPage + 1`，追加新数据到 `records` 数组（而非替换）

```typescript
const [recordsPage, setRecordsPage] = useState(1);
const recordsPageSize = 50;

// fetch
const res = await fetch(`/api/institutions/${params.id}?page=${recordsPage}&pageSize=${recordsPageSize}`);

// 追加模式
setInstitution(prev => prev ? {
  ...data,
  records: [...prev.records, ...data.records],
} : data);
```

#### B2. API 添加 try-catch

**文件**：`src/app/api/institutions/[id]/route.ts`

用 `try-catch` 包裹整个 `GET` 函数体，catch 中打印错误日志并返回 500。

---

## 三、涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/CompareDrawer.tsx` | **修改** | 智能上下文提取 + 无上下文友好提示 |
| `src/app/school/[id]/page.tsx` | **修改** | 对比按钮改为仅打开抽屉；增加分页加载 |
| `src/app/api/compare/route.ts` | **修改** | 放宽 examCategory 模式校验 |
| `src/app/api/institutions/[id]/route.ts` | **修改** | 添加 try-catch |

---

## 四、验证步骤

1. 访问 `/school/9`（港大），在详情页点击「查看对比」→ 打开抽屉但不添加无上下文项
2. 访问查询页，按 广东/2024/物理类/本科批 查询，加入 3 所院校到对比，点击「开始对比」→ 返回 200 并显示对比表格
3. 访问推荐页 `/recommend?year=2024&score=15&examCategory=dse&degreeLevel=associate`，加入对比 → API 接受 `examCategory` 模式
4. 访问 `/school/9`，确认录取记录列表有数据，底部有「加载更多」按钮
5. 访问 `/school/21`（之前无记录的院校），确认不会崩溃

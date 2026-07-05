# 对比功能上下文 + 管理后台返回入口 修复计划

## 一、问题分析

### 问题1：对比功能缺失上下文

| 层面 | 现状 | 问题 |
|------|------|------|
| **CompareStore** | 只存储 `{ id, name, minScore? }` | 没有省/年份/选科/批次/考试类型上下文 |
| **CompareDrawer handleCompare** | `body: JSON.stringify({ ids })` | **不传任何上下文参数**，API 直接报 400 |
| **CompareDrawer 列表展示** | 只显示院校名和最低分 | 看不出这些院校是从哪个年份/省份/考试加入的 |
| **CompareDrawer 结果展示** | 表格列：院校/类别/所在地/最低分/平均分/最低位次/招生人数 | **没有显示对比的年份、省份、考试类型** |
| **Compare API** | 要求 `province/year/subjectGroup/batch` 必填 | 前端不传，功能实际上**不可用** |
| **各页面 addItem** | `addItem({ id, name })` | 都只存 id+name，没存上下文 |

**根因**：加入对比时没有带上查询上下文，导致 API 无法正确筛选录取记录，对比结果也缺少必要的元信息展示。

### 问题2：管理后台无返回网站入口

- `src/app/admin/layout.tsx` 侧边栏只有 4 个管理功能链接
- 侧边栏底部或顶部没有任何「返回网站」入口
- 用户进入后台后无法方便地回到前台页面

---

## 二、实施计划

### 实施项 A：对比功能增加上下文

**涉及文件**：3 个文件需修改

#### A1. Store 扩展（`src/lib/compare-store.ts`）

扩展 `CompareItem` 接口，增加可选的上下文字段：

```typescript
interface CompareItem {
  id: number;
  name: string;
  minScore?: number;
  // 新增：对比上下文
  province?: string;
  year?: number;
  subjectGroup?: string;
  batch?: string;
  examCategory?: string;
}
```

`addItem` 改为接收完整 `CompareItem`，不再只接收 `{ id, name }`。

#### A2. CompareDrawer 改造（`src/components/CompareDrawer.tsx`）

**列表展示**：每项显示年份、省份、科目组上下文标签
```
┌──────────────────────────────────────┐
│ 香港大学                          ✕  │
│ 2024 · 广东 · 物理类 · 本科批       │
│ 最低分 689                           │
└──────────────────────────────────────┘
```

**API 调用**：从 items 中提取上下文传给 API
```typescript
body: JSON.stringify({
  ids: items.map(i => i.id),
  province: items[0]?.province,
  year: items[0]?.year,
  subjectGroup: items[0]?.subjectGroup,
  batch: items[0]?.batch,
})
```

> **注意**：不同考试类型（高考 vs DSE）的对比逻辑不同。高考按 province/year/subjectGroup/batch 查询，DSE 按 examCategory 查询。需要兼容两种场景。

**结果展示**：在对比表格上方增加上下文信息栏
```
对比上下文：2024年 · 广东 · 物理类 · 本科批 · 高考
```

#### A3. 各页面入口适配

分别在以下页面修改 `addItem` 调用，传入完整上下文：

| 文件 | 当前 | 修改后 |
|------|------|--------|
| `school/[id]/page.tsx` | `addItem({ id, name })` | 不加上下文（院校详情页无查询上下文） |
| `query/page.tsx` | `toggleCompare(record)` | 传入 `province/year/subjectGroup/batch/examCategory` |
| `recommend/page.tsx` | `toggleCompare(item)` | 传入 `province/year/region/examCategory` |

---

### 实施项 B：管理后台返回网站入口

**文件**：`src/app/admin/layout.tsx`

在侧边栏底部新增「返回网站」链接：

```tsx
<div className="p-3 border-t border-slate-100 mt-auto">
  <Link
    href="/"
    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-brand-accent transition"
  >
    {/* 返回箭头图标 */}
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
    返回网站
  </Link>
</div>
```

使侧边栏使用 `flex flex-col` 布局，`mt-auto` 将返回链接推到底部。

---

## 三、涉及文件清单

| 文件 | 操作 | 改动量 |
|------|------|--------|
| `src/lib/compare-store.ts` | **修改** - 扩展 CompareItem 接口 | 小 |
| `src/components/CompareDrawer.tsx` | **修改** - 上下文展示 + API 调用 + 上下文栏 | 中 |
| `src/app/query/page.tsx` | **修改** - 传上下文入 compare | 小 |
| `src/app/recommend/page.tsx` | **修改** - 传上下文入 compare | 小 |
| `src/app/admin/layout.tsx` | **修改** - 增加返回网站链接 | 极小 |

---

## 四、验证步骤

1. 访问查询页 `/query`，按广东/2024/物理类/本科批查询，加入 2-3 所院校到对比
2. 打开对比抽屉，列表项应显示「2024 · 广东 · 物理类」标签
3. 点击「开始对比」，API 返回 200，对比表格上方显示上下文信息栏
4. 访问管理后台 `/admin`，侧边栏底部显示「返回网站」链接，点击跳转到首页
5. TypeScript 编译无新增错误

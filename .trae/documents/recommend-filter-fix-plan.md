# 推荐页筛选 + 后台去重 修复计划

## 执行状态

- ✅ 常量 `CATEGORY_OPTIONS / TYPE_OPTIONS / HK_CATEGORY_OPTIONS` — 已完成
- ✅ API `category/type/hkCategory` 参数 — 已完成 (Records + Recommend + Associate)
- ⏳ Recommend 页面筛选 UI — 待完成
- ⏳ RecommendSection 分类统计 — 待完成
- ⚠ **新发现：后台录取数据看起来重复** — 需修复

---

## 问题 B：后台录取数据「重复」根因分析

**结论：不是数据库重复，是表格列不全导致的不同记录看起来相同。**

查询后台 `/admin/records` 页面，表格显示的列为：

```
院校 | 年份 | 省份 | 科类 | 批次 | 最低分 | 录取类型 | 操作
```

但 `AdmissionRecord` 的复合唯一约束包含 **四个未显示字段**：
- `groupCode`（专业组编号，如 JS7204）
- `programmeName`（课程名）
- `programVariant`（课程变体）
- `campusName`（校区）

**举例**：岭南大学 2025 DSE 有 21 条记录，每条 `groupCode` 不同（JS7123、JS7133、JS7204...），但表格中所有 21 行看起来完全一样。这就是用户看到的「重复」。

**修复方案**：
1. 在后台录取记录表格增加 `groupCode` 和 `programmeName` 列
2. 排序增加 `id` 为二级排序，避免翻页时记录顺序漂移

---

## 继续执行计划

### 实施项 3（续）：Recommend 页面筛选 UI

**文件**：`src/app/recommend/page.tsx`

在信息栏下方增加筛选行（用 `FilterChip` 风格的 compact 下拉）：

```tsx
<div className="flex flex-wrap items-center gap-2 mb-4">
  <select value={category} onChange={...}> {CATEGORY_OPTIONS} </select>
  <select value={instType} onChange={...}> {TYPE_OPTIONS} </select>
  <select value={filterRegion} onChange={...}> {REGION_OPTIONS} </select>
  <select value={hkCategory} onChange={...}> {HK_CATEGORY_OPTIONS} </select>
</div>
```

onChange 时更新 URL searchParams（用 router.replace），触发 useEffect 重新 fetch。

### 实施项 4（续）：RecommendSection 分类统计

**文件**：`src/components/RecommendSection.tsx`

每个档位标题下方增加一行分类计数：

```
冲刺  (+5分内)  8 所
  985: 2  |  211: 3  |  港八大: 2  |  普通本科: 1
```

用 `useMemo` 按 `item.institution.category` 聚合计数，仅当有 ≥2 个不同类别时显示。

### 实施项 FIX：后台录取记录表格增加区分列

**文件**：`src/app/admin/records/page.tsx`

1. 表格增加 `groupCode`、`programmeName` 两列
2. API `orderBy` 改为 `[{ createdAt: 'desc' }, { id: 'asc' }]`
3. `programmeName` 过长时截断 + tooltip

---

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/recommend/page.tsx` | **修改** | 筛选行 UI + 4 个下拉框 |
| `src/components/RecommendSection.tsx` | **修改** | 档位标题下分类统计 |
| `src/app/admin/records/page.tsx` | **修改** | 表格增加 groupCode/programmeName |
| `src/app/api/admin/records/route.ts` | **修改** | 二级排序 id:asc |

---

## 验证步骤

1. 推荐页显示 4 个筛选下拉框，选择「985」后仅显示 985 院校
2. 每个档位标题下方显示分类数量统计
3. 后台 `/admin/records` 表格显示 groupCode 列，不同专业组可区分
4. 翻页不会出现同一记录出现在两页

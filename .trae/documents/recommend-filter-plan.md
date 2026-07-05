# 推荐结果分类筛选 + 地区过滤 增强计划

## 一、当前状态分析

### 问题1：推荐结果太多，缺少分类维度

| 现状 | 问题 |
|------|------|
| Recommend API 不支持 `category`/`type`/`hkCategory` 筛选 | 用户无法按 985/211/港八大 缩小范围 |
| Recommend 页面无分类下拉框 | 所有档次（冲刺/稳妥/保底）可能返回几十条结果 |
| Associate Recommend API 几乎无筛选能力 | 仅支持 year/score/examCategory |

### 问题2：跨地区分数线查找

| 现状 | 问题 |
|------|------|
| `region` 参数已存在于 Records API 和 Recommend API | 但 Recommend 页面未暴露地区选择 |
| RecommendPage URL 有 `region` 参数但从首页传入 | 独立访问推荐页时无法选择地区 |

---

## 二、实施计划

### 实施项 1：Recommend + Records API 增加院校分类筛选

**文件**：
- `src/app/api/records/route.ts`
- `src/app/api/recommend/route.ts`
- `src/app/api/recommend/associate/route.ts`

新增查询参数：

| 参数 | 数据库字段 | 过滤方式 |
|------|-----------|---------|
| `category` | `Institution.category` | `where.institution = { category }` |
| `type` | `Institution.type` | `where.institution = { type }` |
| `hkCategory` | `Institution.hkCategory` | `where.institution = { hkCategory }` |

**代码模式**（三个 API 统一）：
```typescript
if (category) {
  where.institution = { ...(where.institution as object || {}), category };
}
if (type) {
  where.institution = { ...(where.institution as object || {}), type };
}
if (hkCategory) {
  where.institution = { ...(where.institution as object || {}), hkCategory };
}
```

**Associate API 额外补充**：
- `region` → `where.institution = { region }`
- `hkCategory` → `where.institution = { hkCategory }`

### 实施项 2：Recommend 页面增加分类/地区筛选

**文件**：`src/app/recommend/page.tsx`

在信息栏下方增加筛选行：
```
[院校类别 ▼] [院校类型 ▼] [地区 ▼] [港校分类 ▼]
```

| 下拉框 | 选项 |
|--------|------|
| 院校类别 | 全部 / 985 / 211 / 双一流 / C9 / 港八大 / 省重点 / 普通本科 |
| 院校类型 | 全部 / 综合 / 理工 / 师范 / 农林 / 医药 / 语言 / 政法 / 财经 / 艺术 |
| 地区 | 全部 / 内地 / 香港 / 澳门 |
| 港校分类 | 全部 / 教资会资助 / 自资院校 / 副学士院校 |

筛选变化时追加到 API 请求参数，自动重新查询。
- 切换筛选 → URL searchParams 更新
- URL 变化 → fetch 重新请求

### 实施项 3：推荐结果中显示各分类数量统计

**文件**：`src/components/RecommendSection.tsx`

每个档位（冲刺/稳妥/保底）标题下方增加分类数量统计：

```
冲刺  (+5分内)  8 所
  985: 2 | 211: 3 | 港八大: 2 | 普通本科: 1
```

统计逻辑在 `RecommendSection` 中，`useMemo` 按 `item.institution.category` 聚合计数。

---

## 三、涉及文件清单

| 文件 | 操作 | 改动量 |
|------|------|--------|
| `src/app/api/records/route.ts` | **修改** — 增加 category/type/hkCategory 参数 | 小 |
| `src/app/api/recommend/route.ts` | **修改** — 增加 category/type/hkCategory 参数 | 小 |
| `src/app/api/recommend/associate/route.ts` | **修改** — 增加 region/hkCategory 参数 | 小 |
| `src/app/recommend/page.tsx` | **修改** — 增加筛选行 + URL 参数 | 中 |
| `src/components/RecommendSection.tsx` | **修改** — 显示分类计数统计 | 小 |

---

## 四、验证步骤

1. 访问推荐页 `/recommend?year=2024&score=630&examCategory=gaokao&province=广东`，不选分类 → 结果含所有院校
2. 选择「985」→ 仅显示 985 院校结果
3. 选择「港八大」→ 仅显示港八大结果
4. 切换地区「香港」→ 仅显示香港地区院校
5. 每档标题下方显示分类数量统计
6. Associate 推荐页 `/recommend?year=2024&score=15&examCategory=dse&degreeLevel=associate` 增加地区筛选

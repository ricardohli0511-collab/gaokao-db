# 紧急 Bug 修复 + 数据补充 计划

## Bug 1: 「港港院校录取查询」H1 多一字

**文件**: `src/app/page.tsx`

`highlightChar="港"` + `title="香港院校录取查询"` → PageHeader 把第一个字「香」替换为 `<span>港</span>`，然后追加 `title.slice(1)` = "港院校录取查询" → 结果 **"港港院校录取查询"**。

**修复**: 去掉 `highlightChar`，直接用 `title="香港院校录取查询"`。

---

## Bug 2: 省份和年份下拉无法选择

**文件**: `src/app/page.tsx`

**根因**: `/api/provinces` 和 `/api/years` 返回的是**裸数组** `['北京','天津',...]`，但代码写了 `pData.data`，取到 `undefined`。

```js
setProvinces(pData.data || []); // ❌ pData 是数组, pData.data = undefined
setYears(yData.data || []);     // ❌ 同理
```

**修复**:
```js
setProvinces(Array.isArray(pData) ? pData : []);
setYears(Array.isArray(yData) ? yData : []);
```

---

## Bug 3: DSE JUPAS 数据中有假数据

806 条 DSE 记录中 **138 条 minScore = 0 或 NULL**，且 `programmeName` 里塞入了解析残留文本（如 "M 4 4 5* A 5** 5* ..."）。

**真数据检索**: 只看 `uqScore` + `medianScore` + `lqScore` 三分位都有的记录（这才是 JUPAS 官方 PDF 的真实分数）。

**修复**: 不删记录，但 API 查询时对 DSE 结果做有效性过滤（`minScore > 0 OR uqScore IS NOT NULL`），前端卡片只展示有有效分数的院校。

---

## Bug 4: 缺少内地高校数据

数据库已将高考数据全部清除。需要重新导入真实来源的内地高校录取数据。

**方案**: 恢复 `scripts/data/insert-hk-gaokao-seed.ts` 中的部分真实数据（港校通过内地高考招收学生的分数线 — 中大/城大提前批），同时补充最常见的 985 高校在广东的高考录取线（数据来源：各校官网）。

**新增**: 
- 中大/城大高考提前批（广东/浙江/江苏）约 20 条 ✅ 之前有
- 全国前 20 高校在广东的录取线（北大/清华/复旦/浙大/武大/中山/华南理工等）

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| `src/app/page.tsx` | 修复 h1 + provinces/years |
| `src/app/api/records/route.ts` | DSE 过滤 `minScore>0` |
| `prisma/seed.ts` 或新脚本 | 导入内地高校数据 |

# JUPAS数据补全 + 副学士增强 + 主页筛选 + 推荐集成 计划

## 一、当前状态分析

### 1. JUPAS 历年数据
- **PDF 源文件**（`data/raw/香港/JUPAS/`）：2023 / 2024 / 2025 三年均有 PDF
- **已解析 JSON**（`data/normalized/香港/`）：仅 2025 已解析并导入（320 条）
- **缺失**：2023、2024 需要运行 `parse-jupas-dse.ts --year=2023` / `--year=2024` 解析，再通过 `load-all-jupas.ts` 导入

### 2. 副学士种子数据
- 当前 `prisma/seed.ts` 仅 6 条关联记录（HKU SPACE 3条、HKCC 2条、HKBU CIE 1条）
- 需要增加更多课程类型（商科/理工/社科/艺术等）和考试覆盖（DSE + 高考）
- HKCC 和 HKBU CIE 只有 2-3 个课程，可以扩展到 5+ 个

### 3. 主页 HK 院校卡片
- 当前 `src/app/page.tsx` 院校卡片从 `/api/hk-institutions` 获取，但不区分考试类型
- 用户切换考试 Tab 后，卡片区无任何变化
- 需要根据选中的 `examType` 高亮有该考试数据的院校

### 4. 推荐页 degreeLevel 集成
- `src/app/recommend/page.tsx` 已接收 `degreeLevel` 参数但未使用
- 当 `degreeLevel=associate` 时，应调用 `/api/recommend/associate` 而非 `/api/recommend`
- `RecommendSection` 组件的 `RecommendItem` 接口需要扩展以支持副学士特有字段

---

## 二、实施计划

### 实施项 1：历年 JUPAS 数据补全

**步骤**：
1. 运行 `npx tsx scripts/data/parse-jupas-dse.ts --year=2023` 解析 2023 PDF
2. 运行 `npx tsx scripts/data/parse-jupas-dse.ts --year=2024` 解析 2024 PDF
3. 运行 `npx tsx scripts/data/load-all-jupas.ts` 批量导入所有年份
4. 验证 DB 中 DSE 记录总数（预计 2023 ~300 + 2024 ~320 + 2025 320 ≈ 940 条）

### 实施项 2：副学士种子数据增强

**文件**：`prisma/seed.ts`（第94-101行）

**新增数据**（不重置数据库，通过脚本插入）：
- **HKCC 新增**：商业分析副学士、酒店管理高级文凭、设计学副学士
- **HKBU CIE 新增**：商学副学士、创意媒体副学士、应用科学副学士
- **UOWCHK 新增**（香港伍伦贡学院）：工商管理副学士、资讯系统副学士
- **每门课程都覆盖 DSE 和 高考 两个 examCategory**

**采用方案**：新建独立脚本 `scripts/data/insert-associate-seed.ts` 直接插入数据库，不 touch seed.ts 以避免 reset

### 实施项 3：主页按考试类型筛选/高亮院校

**文件**：`src/app/page.tsx`

**方案**：
- 在 `/api/hk-institutions` 增加可选参数 `examCategory`，返回 `_count.records` 按考试类型统计
- 主页 `hkInsts` 状态基于当前 `examType` 动态获取
- 院校卡片增加"有数据"高亮效果：有该考试数据的卡片保持原样式，无数据的降低透明度（opacity-50 + pointer-events-none 或灰色）
- 切换考试类型时重新 fetch

**具体改动**：
```tsx
// 监听 examType 变化，重新获取 HK 院校列表
useEffect(() => {
  fetch(`/api/hk-institutions?examCategory=${examType}`)
    .then(res => res.json())
    .then(data => setHkInsts(data.data))
}, [examType]);
```

**API 扩展** `src/app/api/hk-institutions/route.ts`：
```typescript
const examCategory = searchParams.get('examCategory') || '';
// 返回 _count 中按 examCategory 筛选的 records 数量
// 新增 hasExamData 布尔字段
```

### 实施项 4：推荐页集成副学士推荐

**文件**：`src/app/recommend/page.tsx`

**方案**：
- 根据 `degreeLevel === 'associate'` 切换 API 端点：
  - 本科：`/api/recommend`
  - 副学士：`/api/recommend/associate`
- `RecommendItem` 接口需要扩展以支持副学士特有字段（`programmeName`、`medianScore`、`maxScore`）
- `RecommendSection` 组件 `RecommendCard` 适配副学士数据展示
- 信息栏显示学位层级标签

**RecommendSection.tsx 改动**：
```typescript
export interface RecommendItem {
  // 现有字段...
  // 副学士扩展字段
  programmeName?: string;
  programmeCode?: string;
  medianScore?: number;
  maxScore?: number;
  interviewRequired?: boolean;
  quota?: number;
  hkCategory?: string;
}
```

---

## 三、涉及文件清单

| 文件 | 操作 |
|------|------|
| `scripts/data/parse-jupas-dse.ts` | 运行 --year=2023 --year=2024（不变更文件） |
| `scripts/data/load-all-jupas.ts` | 运行（不变更文件） |
| `scripts/data/insert-associate-seed.ts` | **新建** - 插入副学士增强数据 |
| `src/app/api/hk-institutions/route.ts` | **修改** - 增加 examCategory 参数 |
| `src/app/page.tsx` | **修改** - 监听 examType 重新获取院校列表，卡片高亮逻辑 |
| `src/app/recommend/page.tsx` | **修改** - degreeLevel 切换 API |
| `src/components/RecommendSection.tsx` | **修改** - 扩展 RecommendItem，适配副学士展示 |

---

## 四、验证步骤

1. 运行 `npx tsx scripts/data/parse-jupas-dse.ts --year=2024` 确认 JSON 生成
2. 运行 `npx tsx scripts/data/load-all-jupas.ts` 确认三年度数据导入
3. 运行 `npx tsx scripts/data/insert-associate-seed.ts` 确认副学士数据插入
4. 访问首页，切换 DSE → 确认港八大卡片高亮（有DSE数据），副学士卡片暗淡
5. 在首页选择「副学士」+「DSE」+分数 → 点击匹配 → 推荐页显示副学士课程
6. 访问 `/recommend?score=15&year=2024&examCategory=dse&degreeLevel=associate` 确认调用 associate API

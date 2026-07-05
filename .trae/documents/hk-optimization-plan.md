# 香港升学平台优化计划

## 一、总览

本次优化涵盖4个方面的改进：

| # | 优化项 | 涉及文件 |
|---|--------|---------|
| A | 首页标题改版 + 香港院校卡片链接修复 | `src/app/page.tsx`、`src/app/hk-schools/page.tsx` |
| B | 院校详情页增加副学士 Tab | `src/app/school/[id]/page.tsx`、`src/app/api/institutions/[id]/route.ts` |
| C | 副学士推荐算法 API | `src/app/api/recommend/associate/route.ts` |
| D | JUPAS 数据批量导入 | `scripts/data/parse-jupas-dse.ts`（修复 institutionId 硬编码）、`src/app/admin/import/page.tsx`（新增 JUPAS 导入入口）|

---

## 二、当前状态分析

### A. 首页标题 + 香港院校链接
- **首页 title** (`src/app/page.tsx`:91)：当前为 `"香港升学分数匹配"` / `"香港本科 · 副学士录取分数查询平台"`
  - 用户要求改为：全球院校查询，目前侧重香港的本科和副学士
- **香港院校卡片** (`src/app/page.tsx`:247)：`href={`/hk-schools`}` — 当前首页卡片全都指向 `/hk-schools` 列表页，而不是各自院校的详情页
  - 同时 `hk-schools/page.tsx:96` 已经正确指向 `href={`/school/${inst.id}`}`，但首页卡片也需要修复

### B. 院校详情页
- `src/app/school/[id]/page.tsx` 当前只有本科录取数据（单 Tab 展示）
- API `/api/institutions/[id]` 已经在上一轮改造中返回了 `associateRecords` 字段
- Institution 接口不含 `region`/`hkCategory`/`associateRecords` 字段

### C. 副学士推荐
- 当前无副学士推荐 API
- 现有 `associateDegreeRecord` 表有 `minScore`/`medianScore`/`maxScore`（Float 类型）
- 推荐算法需要按分数范围分 reach/match/safety，与本科推荐逻辑一致但针对 `AssociateDegreeRecord` 表

### D. JUPAS 导入
- `scripts/data/parse-jupas-dse.ts` 解析 PDF → JSON 输出
- `scripts/data/load-jupas-dse.ts` 加载 JSON → 写入 DB，但 **`institutionId: 1` 硬编码**，未做院校名称匹配
- JUPAS PDF 路径：`data/raw/香港/JUPAS/af_{year}_JUPAS.pdf`（2023/2024/2025 三年已有）
- 管理后台 `/admin/import` 目前只支持 CSV/Excel，不支持 JUPAS JSON 批量导入

---

## 三、具体实施计划

### 实施项 A：首页标题改版 + 院校卡片链接修复

**文件：`src/app/page.tsx`**

1. **标题修改**（第91行）：
   - 标题：`"全球院校录取查询"` 
   - 副标题：`"当前侧重香港本科 · 副学士 — 覆盖高考 / DSE / IB / A-Level 等考试"`

2. **院校卡片链接修复**（第247行）：
   - 当前：`href={`/hk-schools`}` — 所有院校卡片都跳转到院校列表页
   - 修改为：`href={`/school/${inst.id}`}` — 需要先 fetch 数据库中的 HK 院校获取真实 ID
   - **方案**：改用 API 获取的院校列表（与 `/hk-schools` 页面相同的方式），通过 `/api/hk-institutions` 获取包含 `id` 的院校列表渲染卡片

**具体改动**：
```diff
- 标题: "香港升学分数匹配"
- 副标题: "香港本科 · 副学士录取分数查询平台"
+ 标题: "全球院校录取查询"
+ 副标题: "当前侧重香港本科 · 副学士 — 覆盖高考 / DSE / IB / A-Level 等考试"
```

院校卡片部分：从 `HK_INSTITUTIONS` 静态常量改为从 `/api/hk-institutions` API 获取的含 `id` 的动态数据：
```diff
- {HK_INSTITUTIONS.map((inst) => (
-   <Link key={inst.code} href={`/hk-schools`}>
+ {hkInsts.map((inst) => (
+   <Link key={inst.id} href={`/school/${inst.id}`}>
```

---

### 实施项 B：院校详情页增加「副学士」Tab

**文件：`src/app/school/[id]/page.tsx`**  
**辅助：`src/app/api/institutions/[id]/route.ts`**

1. **扩展 Institution 接口**（`page.tsx`）：
```typescript
interface AssociateRecord {
  id: number;
  examCategory: string;
  year: number;
  programmeName: string;
  programmeCode: string | null;
  programmeCategory: string | null;
  admissionRequirement: string | null;
  minScore: number | null;
  medianScore: number | null;
  maxScore: number | null;
}

interface Institution {
  // ... 现有字段 ...
  region: string | null;
  hkCategory: string | null;
  records: AdmissionRecord[];
  associateRecords: AssociateRecord[];
}
```

2. **新增 Tab 切换**：在返回按钮下方、趋势图上方增加 `本科` / `副学士` Tab 切换：
```tsx
const [activeTab, setActiveTab] = useState<'undergraduate' | 'associate'>('undergraduate');
```

3. **副学士 Tab 内容**：当 `activeTab === 'associate'` 时，展示 `associateRecords` 列表（卡片/表格形式），包含：
   - 课程名称、课程编号
   - 最低分/中位数/最高分
   - 入学要求
   - 是否需面试

4. **API 调整**：`api/institutions/[id]/route.ts` 已经在上一轮返回 `associateRecords`，无需改动。

---

### 实施项 C：新增副学士推荐算法 API

**文件：`src/app/api/recommend/associate/route.ts`**（新建）

与本科推荐逻辑相同的三段式算法（reach/match/safety）：

```typescript
// 核心算法
const { reachOffset, matchOffset } = getRecommendThresholds(examCategory);

const reachLower = scoreNum;
const reachUpper = scoreNum + reachOffset;
const matchLower = scoreNum - matchOffset;
const matchUpper = scoreNum;

// 查询 AssociateDegreeRecord 表
const allRecords = await prisma.associateDegreeRecord.findMany({
  where: { year: yearNum, examCategory },
  include: { institution: { select: { id, name, category, hkCategory } } },
});

// 分类
const reach = allRecords.filter(r => r.minScore !== null && r.minScore > reachLower && r.minScore <= reachUpper);
const match = allRecords.filter(r => r.minScore !== null && r.minScore <= matchUpper && r.minScore >= matchLower);
const safety = allRecords.filter(r => r.minScore !== null && r.minScore < matchLower);
```

- 支持参数：`year`、`score`、`examCategory`、`institutionId`（可选）
- 返回格式与本科推荐一致：`{ reach, match, safety, meta }`
- 需要处理 `minScore` 为 `null` 的情况（有课程可能只有门槛描述，无具体分数）

---

### 实施项 D：JUPAS 批量导入

**涉及文件**：
- `scripts/data/parse-jupas-dse.ts` — 已有，无需改动
- `scripts/data/load-jupas-dse.ts` — 需要修复
- `scripts/data/load-all-jupas.ts` — **新建**，批量加载历年数据
- 可选：管理后台入口

1. **修复 `load-jupas-dse.ts`**（第31行 `institutionId: 1` 硬编码问题）：
   - 改为通过 `matchInstitution` 查找香港院校名称匹配
   - 如果匹配不到，则输出警告但不创建新院校
   - 匹配逻辑复用 `src/lib/import/match-institution.ts` 中的现有机制

2. **新建 `scripts/data/load-all-jupas.ts`**：
   - 自动扫描 `data/normalized/香港/` 目录下所有年份的 JUPAS JSON 文件
   - 依次加载并调用 `parse-jupas-dse.ts` 解析 → `load-jupas-dse.ts` 导入
   - 使用方法：`npx tsx scripts/data/load-all-jupas.ts`

3. **数据模型适配**：
   - JUPAS 记录中的 `minScore` 实际是 `lowerQuartile`，映射到 `AdmissionRecord.minScore`
   - `avgScore` 实际是 `median`，需要同时设置 `medianScore`
   - `groupCode` 对应 JS 课程编号
   - `programmeTitle` 对应 `programmeName`

---

## 四、验证步骤

1. 启动 `npm run dev`，访问首页确认标题变更 + 院校卡片可跳转到 `/school/[id]`
2. 访问 `/school/9`（港大），确认副学士 Tab 可切换并显示副学士课程
3. 访问 `/api/recommend/associate?year=2024&score=15&examCategory=dse` 确认返回推荐结果
4. 运行 `npx tsx scripts/data/load-all-jupas.ts` 确认 JUPAS 数据导入成功

---

## 五、实施顺序

1. **A**（首页标题 + 链接修复）— 影响最小，最先实施
2. **D**（JUPAS 导入）— 先修复导入脚本，导入更多数据以便展示
3. **B**（副学士 Tab）— 依赖 D 导入的数据来展示
4. **C**（副学士推荐 API）— 最后的增量功能

# BIT load + SAT 录入 + DSE 前端对接 专项计划

## Current State

### 数据层 ✅
- **BIT 7983**：createMany 已改造但未入库（Turso institution matching 太慢）
- **JUPAS DSE 320**：已入库，`admissionType: '联招'`
- **SAT PDF**：已下载，mean=1029

### 前端对接缺陷 🔴
| 问题 | 影响 |
|------|------|
| DSE `types: ['DSE']` 但 DB 中 `admissionType: '联招'` | **DSE 记录在 API 中完全不可见** |
| DSE `scoreMax: 35` 不准确 | 推荐阈值计算错误（实际范围 20-49） |
| 无 SAT 记录 | `admissionType: 'SAT'` 无可查询数据 |
| 学校详情页 `isInternational` 硬编码 `['IB','A-Level','DSE']` | 新增 SAT 时需要同步更新 |

---

## Step 1: BIT load（直接 DB）

```bash
cd /Users/haoyuli/Desktop/gaokao
# 直接 run（Turso institution matching ~2min + batch createMany ~10s）
npm run import:load
```

如果太慢，可以跳过 BIT，先跑 provincial + JUPAS。

---

## Step 2: SAT 1 条手动录入

写入 1 条 `AdmissionRecord` 验证前端 SAT 流程：

```sql
INSERT INTO AdmissionRecord (
  "examCategory", "year", "province", "subjectGroup", "batch",
  "rawInstitutionName", "institutionId", "minScore", "avgScore",
  "granularity", "admissionType", "groupName",
  "sourceUrl", "rawRowHash", "createdAt", "updatedAt"
) VALUES (
  'sat', 2025, '全球', '', 'SAT Suite Annual Report',
  'College Board', 1, 1029, 1029,
  'institution', 'SAT', 'SAT Suite of Assessments 2025 Total Group',
  'https://reports.collegeboard.org/sat-suite-program-results/class-2025-data',
  'sat-2025-total-group-mean-1029', datetime('now'), datetime('now')
);
```

验证：
```bash
npx tsx --test src/lib/import/source-registry.test.ts
# select admissionType, count(*) from AdmissionRecord where examCategory='sat' → 1
```

---

## Step 3: 修复 DSE 对接

### 3A. `constants.tsx` — 修复 DSE scoreMax + types

```typescript
dse: {
  key: 'dse',
  label: 'DSE 香港中学文凭',
  types: ['联招'],            // ← 改：与 DB 中 admissionType 对齐
  scoreMax: 49,              // ← 改：7分×7科=49（实际录取分在20-45之间）
  fields: ['score'],
  rankLabel: null,
  batchLabel: null,
  subjectLabel: '计分方式',
  subjects: ['Best 5 Subjects', 'Best 6 Subjects', '4C+2X', '4C+1X', 'Best 5 (weighted)'],
},
```

### 3B. parse-jupas-dse.ts — 调整 admissionType 输出（备选方案）

如果选择不改 `types` 而改 parsed 输出：
```typescript
// 第 185 行
admissionType: 'DSE',  // 改为 'DSE' 而非 '联招'
```

**推荐**：3A 方案 — 修改 `constants.tsx` 更安全，不影响已入库的 320 条记录。

### 3C. 学校详情页 — 扩展 isInternational

```typescript
// school/[id]/page.tsx 第 208 行
const isInternational = filteredRecords.length > 0
  ? ['IB', 'A-Level', 'DSE', 'SAT', 'ACT', 'AP', 'SAT 联招', 'DSE 联招'].includes(filteredRecords[0].admissionType)
  : false;
```

或更简洁：
```typescript
const firstType = filteredRecords[0]?.admissionType ?? '';
const isInternational = firstType !== '统招' && firstType !== '艺考' && firstType !== '体育'
  && firstType !== '强基' && firstType !== '综评' && firstType !== '保送';
```

---

## Step 4: 验证全链路

```bash
npm run import:report    # coverage 更新
npm run dev              # 启动 localhost:3000
```

### 浏览器测试
1. 首页 → 选择 "DSE 香港中学文凭" → 输入 30 分 → 查询
   - 应能看到 320 条香港录取记录
   - 分数刻度显示 20-45
2. 首页 → 选择 "SAT" → 输入 1100 分 → 查询
   - 应能看到 1 条 College Board 数据
3. `/school/任意DSE学校ID` → 确认无「最低位次」列

---

## 文件变更

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/lib/constants.tsx` | 修改 | DSE `types: ['联招']`, `scoreMax: 49` |
| `src/app/school/[id]/page.tsx` | 修改 | 扩展 `isInternational` 判断 |
| -- | SQL 命令 | SAT 1 条手动插入 |
| -- | 命令 | `npm run import:load` + `npm run import:report` |

## 验证

- [ ] DSE 320 条在 `examCategory='dse'` 前端可查询
- [ ] SAT 1 条在前端可查询
- [ ] BIT load 完成后 `majorImportedCount > 0`
- [ ] import:report 更新
- [ ] 测试 7/7 通过

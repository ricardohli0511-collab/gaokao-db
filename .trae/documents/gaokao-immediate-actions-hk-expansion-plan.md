# 立即优化 + 香港副学士/本科录取扩展计划

> **Status:** 4 项短期操作已明确，香港 JUPAS 官方 PDF 路径已确认，Schema 已有 `dse`/`alevel` 枚举。

---

## Direction A: 立即执行的 4 项优化

### A1. BIT batch createMany（upsert.ts 改造）

**文件**：`src/lib/import/upsert.ts`（约第 355-440 行 synthetic parent 创建循环）

**问题**：当前 93 个省份 synthetic parent 逐个 `prisma.admissionRecord.create()`，每次 100-300ms 远端 Turso 延迟 → ~30 秒。

**方案**：用 `prisma.admissionRecord.createMany({ data: [...], skipDuplicates: true })` 一次性批量创建。

```typescript
// 收集所有待创建的 synthetic parent
const syntheticBatch: Array<{...}> = [];
for (...) { syntheticBatch.push({...}) }

// 一次 createMany
if (syntheticBatch.length > 0) {
  await prisma.admissionRecord.createMany({
    data: syntheticBatch,
    skipDuplicates: true,
  });
}

// 然后批量查出刚创建的记录
const created = await prisma.admissionRecord.findMany({
  where: { recordIdentityKey: { in: syntheticBatch.map(s => s.recordIdentityKey) } },
  select: { id: true, recordIdentityKey: true },
});
for (const rec of created) {
  locatedAdmissionsByIdentity.set(rec.recordIdentityKey!, rec);
  counters.syntheticParentsCreated += 1;
}
```

**同理 majors 也可改为 `createMany`**（majors 循环第 361 行后）。

**验证**：`LOAD_CONCURRENCY=1 npm run import:load` BIT 文件在 3 分钟内完成（当前 ~15 分钟超时）。

### A2. 贵州历史类 load

```bash
cd /Users/haoyuli/Desktop/gaokao
npm run import:load  # 贵州 4856 majors 会在 provincial 循环中入库
```

### A3. 河北/山东 load 验证

```bash
# 确认 source-load-summary.json 已有条目
grep -A5 '"河北"' data/reports/source-load-summary.json
grep -A5 '"山东"' data/reports/source-load-summary.json
```

如果 `importedMajors: 0`，说明上次 load 被中断后没有重新跑完 provincial 循环。单独跑 `import:load` 即可。

### A4. SAT PDF 数据提取验证

SAT PDF 已在 `data/raw/海外/SAT/2025-total-group-sat-suite-annual-report.pdf`。

**最小验证**：用 Prisma Studio 或 SQLite CLI 手动插入一条 `examCategory: 'sat'` 的记录：

```sql
INSERT INTO AdmissionRecord (examCategory, year, province, subjectGroup, batch, institutionId, minScore, avgScore, granularity, admissionType)
VALUES ('sat', 2025, '全国', '', '年度', 1, 1024, 1050, 'institution', '统招');
```

然后打开管理后台确认：筛选栏显示 SAT 选项、分数 1024 正常展示。

---

## Direction B: 香港副学士 + 本科录取

### Schema 现状（已就绪）

```prisma
enum ExamCategory {
  gaokao
  sat
  act
  ap
  ib
  alevel   // ← 已有
  dse      // ← 已有
}
```

`AdmissionRecord.examCategory` 已支持 `dse` / `alevel`，**不需要 schema 变更**。

### 数源分析

| 类型 | 官方数据源 | URL | 可用性 |
|------|-----------|-----|--------|
| 港八大本科 JUPAS 录取 | JUPAS 官方年度 PDF | `https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf` | ✅ 每年稳定发布，包含 9 校分专业录取分数（UQ/Median/LQ） |
| 港校内地高考生录取 | 各校官网独立发布 | 港大、中大、科大等有年度招生报告 | 🔶 无统一平台，各校格式不同 |
| 副学士录取 | 各专上学院独立发布 | HKCC PolyU、HKBU CIE、UOWCHK 等 | 🔶 以招生简章 PDF 为主，录取分数通常不公开 |

**结论**：可立即入手的是 **JUPAS 官方 PDF**——包含 9 所学校 × 数百个专业 × 标准化 HKDSE Best 5/6 分数。

### 实施步骤

#### B1. 扩展 OverseasSourceRegistry 类型

**文件**：`src/lib/import/overseas-source-registry.ts`

```typescript
// 扩展联合类型
export interface OverseasSourceEntry {
  examCategory: 'sat' | 'act' | 'ap' | 'ib' | 'dse' | 'alevel';  // ← 新增 dse, alevel
  title: string;
  officialUrl: string;
  sourceType: 'research-pdf' | 'research-csv' | 'official-admissions-pdf';  // ← 新增类型
  publicationYear: number;
  dataYear: number;
  status: 'collected' | 'searched-only' | 'todo';
  notes: string;
  // 香港特有字段
  institutionScope?: 'jupas-all' | 'single-school' | 'self-financed';  // ← 可选
}
```

#### B2. 新增香港条目

```typescript
// === 香港本科录取 ===
{
  examCategory: 'dse',
  title: '2025 JUPAS 9所参与院校新生入学成绩',
  officialUrl: 'https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf',
  sourceType: 'official-admissions-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'todo',
  institutionScope: 'jupas-all',
  notes: '港八大+都大 JUPAS Main Round 录取分数（UQ/Median/LQ），按课程分。HKDSE Best 5/6 计分。历年 2012-2025 均有 PDF。',
},
{
  examCategory: 'dse',
  title: '2024 JUPAS 9所参与院校新生入学成绩',
  officialUrl: 'https://www.jupas.edu.hk/f/page/3667/af_2024_JUPAS.pdf',
  sourceType: 'official-admissions-pdf',
  publicationYear: 2024,
  dataYear: 2024,
  status: 'todo',
  institutionScope: 'jupas-all',
  notes: '同上，2024 年版。',
},
{
  examCategory: 'dse',
  title: '2023 JUPAS 9所参与院校新生入学成绩',
  officialUrl: 'https://www.jupas.edu.hk/f/page/3667/af_2023_JUPAS.pdf',
  sourceType: 'official-admissions-pdf',
  publicationYear: 2023,
  dataYear: 2023,
  status: 'todo',
  institutionScope: 'jupas-all',
  notes: '同上，2023 年版。',
},
// === 香港副学士（暂无统一公开录取数据） ===
{
  examCategory: 'dse',
  title: '香港副学士/高级文凭课程录取数据（待收集）',
  officialUrl: 'TODO: 各院校招生简章分散收集',
  sourceType: 'research-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'todo',
  institutionScope: 'self-financed',
  notes: '副学士录取无统一公开数据集。来源需从 HKCC PolyU、HKBU CIE、UOWCHK、HKU SPACE 等院校招生简章中逐个提取。录取通常以 HKDSE 分数+面试评估，不公开最低分。',
},
```

#### B3. 下载 JUPAS PDF + 建立香港数据目录

```bash
mkdir -p data/raw/香港/JUPAS
curl -L -o "data/raw/香港/JUPAS/af_2025_JUPAS.pdf" \
  "https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf"
curl -L -o "data/raw/香港/JUPAS/af_2024_JUPAS.pdf" \
  "https://www.jupas.edu.hk/f/page/3667/af_2024_JUPAS.pdf"
curl -L -o "data/raw/香港/JUPAS/af_2023_JUPAS.pdf" \
  "https://www.jupas.edu.hk/f/page/3667/af_2023_JUPAS.pdf"
```

#### B4. JUPAS PDF 解析策略

JUPAS PDF 结构：
- 每页一个 institution → 表格式：课程编号 | 课程名称 | UQ | Median | LQ | 计分方式(Best 5/6)
- 9 所学校 × ~50 个专业 = ~450 行
- 可用 `pdf2json` 或 `tabula-py` 提取

**解析后写入 `AdmissionRecord`**：
```typescript
{
  examCategory: 'dse',
  year: 2025,
  province: '香港',
  subjectGroup: '',           // DSE 无文理分科
  batch: 'JUPAS Main Round',
  institutionName: '香港大学',
  granularity: 'institution',
  minScore: 32,               // LQ Best 5
  avgScore: 34,               // Median
  maxScore: null,             // UQ 可放入或者忽略
  admissionType: '联招',
}
```

副学士暂时放 `status: 'todo'`，标注需要逐个院校手动收集。

### 香港 vs 内地 vs SAT 数据差异总结

| 维度 | 内地 gaokao | 香港 DSE (JUPAS) | 香港副学士 | SAT/AP (美国) |
|------|------------|-----------------|-----------|---------------|
| 来源性质 | 各省考试院定期发布 | JUPAS 统一平台年度 PDF | 各专上学院招生简章 | College Board 年度报告 |
| 更新周期 | 每年 7-8 月 | 每年 8 月（放榜后） | 每年 12-7 月（申请季） | 每年 9-12 月 |
| 分数体系 | 750 分制 | Best 5/6 计分（5**=8.5） | 通常不公开最低分 | SAT 400-1600 |
| 录入方式 | 自动 fetch+parse+load | 手动下载 PDF → 半自动解析 | 手动收集（数据稀疏） | 手动收集 |
| Schema 兼容性 | ✅ | ✅（examCategory: 'dse'） | 🔶（需 institutionScope 区分） | ✅（examCategory: 'sat'） |

---

## Assumptions & Decisions

1. BIT batch `createMany` 改造不改变已有 admission upsert 逻辑，只改 synthetic parent 部分。
2. JUPAS PDF 每年 8 月稳定发布，URL 格式为 `af_{year}_JUPAS.pdf`，历年可追溯至 2012。
3. 香港副学士录取分数**不公开**——各院校只发布入学要求（如 HKDSE 5 科 Level 2），不发布实际录取最低分。标记为 `status: 'todo'` 并注明数据可得性限制。
4. `alevel` 暂不加入 registry（无确定的数据源），但 Schema 已支持。
5. 本轮不改动 Prisma schema。

## Verification

- BIT `createMany` 后 `LOAD_CONCURRENCY=1 npm run import:load` 在 3 分钟内完成 BIT 文件
- JUPAS PDF 下载并确认 `data/raw/香港/JUPAS/` 有 3 份 PDF
- `source-registry.test.ts` + `bit-undergrad-html.test.ts` + `hit-undergrad-html.test.ts` 全部通过

# Load + Report + JUPAS DSE 入库 专项计划

> **Status:** BIT batch createMany 已改造完成，JUPAS PDF 3份已下载。下一步：全量 load → report → JUPAS 解析入库。

---

## Section 1: Load + Report（直接执行）

### 1A. 全量 import:load

```bash
cd /Users/haoyuli/Desktop/gaokao
LOAD_CONCURRENCY=1 npm run import:load
```

预期产出：
- BIT 93 synthetic parents batch created → 7983 majors 挂载
- 贵州物理+历史 约 10,000 majors 入库
- 河北/山东 majors 确认入库
- HIT 58 majors 确认（已有）

时间：单线程全量约 5-10 分钟（batch createMany 大幅缩短 synthetic parent 阶段）

### 1B. import:report

```bash
npm run import:report
```

验证点：
- `source-load-summary.json` 河北/山东/贵州有非零 `importedMajors`
- `coverage-summary.json` BIT `majorImportedCount > 0`
- HIT `schoolGapState` 不再为 `school_adapter_pending`

---

## Section 2: JUPAS DSE PDF 解析入库

### PDF 结构分析

| 维度 | 值 |
|------|-----|
| 总页数 | ~40 页 |
| 院校数 | 9（CityU, HKBU, Lingnan, CUHK, EdUHK, PolyU, HKUST, HKU, HKMU） |
| 课程数 | ~305 个 JS 编号 |
| 分数指标 | Median（中位数）, Lower Quartile（下四分位数） |
| 计分方式 | Best 5 / 3C+2E / 4C+2E 等（每课程不同） |
| 分数转换 | 5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1 |
| 特殊标记 | "New Programme in 2026 JUPAS"（无分数，跳过） |

**pdftotext -layout 输出格式**：

```
City University of Hong Kong – 2025 JUPAS Admissions Scores    Page X of Y

          JUPAS Catalogue No. and      Main Admission Score Formula    Admissions Scores
             Programme Title                                           Median  Lower Quartile

 JS1000
 BSc Computational Finance ...         Best 5 subjects (include
                                       English and Mathematics)    1   24.5    23.5
```

### 解析策略

#### Step 1: 全量文本提取

```bash
pdftotext -layout data/raw/香港/JUPAS/af_2025_JUPAS.pdf /tmp/jupas_2025.txt
```

#### Step 2: 逐行状态机解析

```typescript
// scripts/data/parse-jupas-dse.ts
// 状态：
// - SEEK_INST: 找 "XXX University – 2025 JUPAS" 行 → 提取 institution name
// - SEEK_HEADER: 找 "JUPAS Catalogue No" 行 → 确认表头
// - PARSE_ROW: 逐行读，JS\d{4} 开头 → 提取 programme 信息
// - ACCUM: 非 JS 行 → 追加到上一个 programme 的 title

interface JupasRow {
  institutionName: string;
  jsCode: string;          // JS1000
  programmeTitle: string;  // multi-line concatenated
  scoreFormula: string;    // "Best 5 subjects"
  median: number | null;   // null if "New Programme"
  lowerQuartile: number | null;
}
```

核心正则：

```typescript
// 匹配 institution header
const INST_RE = /^(.+)\s+–\s+2025 JUPAS Admissions Scores/i;

// 匹配 programme 行（JS编号开头）
const JS_RE = /^(JS\d{4})\b/;

// 匹配分数行（末尾两列数字）
const SCORE_RE = /(\d+(?:\.\d)?)\s+(\d+(?:\.\d)?)\s*$/;

// 匹配 New Programme 标记
const NEW_PGM_RE = /New Programme/i;
```

#### Step 3: 写入 AdmissionRecord

```typescript
const record = {
  examCategory: 'dse',
  year: 2025,
  province: '香港',
  subjectGroup: '',
  batch: 'JUPAS Main Round',
  institutionName: row.institutionName,
  granularity: 'institution',
  minScore: row.lowerQuartile,    // LQ → minScore
  avgScore: row.median,           // Median → avgScore
  admissionType: '联招',
  rawRowHash: sha256(row.jsCode + row.institutionName),
  sourceUrl: 'https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf',
};
```

#### Step 4: 验证

```bash
npx tsx scripts/data/parse-jupas-dse.ts --year=2025

# 预期输出
# CityU: 25 courses
# HKBU: 30 courses
# CUHK: 55 courses
# ...
# Total: ~260 courses (305 JS codes - 45 "New Programme")
# Written to: data/normalized/香港/2025/jupas-dse-2025.json
```

然后将产出文件加入 normalized 目录，跑 `import:load` 入库。

---

## 文件变更清单

| 文件 | 操作 | 内容 |
|------|------|------|
| `scripts/data/parse-jupas-dse.ts` | 新增 | JUPAS PDF 解析脚本（pdftotext → 状态机 → NormalizedAdmissionRecord[]） |
| `data/normalized/香港/2025/jupas-dse-2025.json` | 产出 | parse 结果 |
| `data/reports/source-load-summary.json` | 更新 | load 后自动生成 |
| `data/reports/coverage-summary.json` | 更新 | report 后自动生成 |

---

## Assumptions

1. `pdftotext -layout` 在 macOS 上预装（poppler-utils），可直接使用。
2. JUPAS PDF 中 "New Programme in 2026 JUPAS" 标记的课程不产生记录（无历史分数）。
3. 分数为 0-50 范围的加权 Best 5 值，不使用 gaokao 的 750 分制比较。
4. institution 匹配走 `matchInstitution`，港校在 institution 表中可能不存在 → 自动创建。
5. `examCategory: 'dse'` 数据在前端展示时需单独处理分数刻度（0-50 vs 750）。

## Verification

- `npm run import:load` 完成后 `source-load-summary.json` 河北/山东/贵州有数据
- `parse-jupas-dse.ts --year=2025` 产出 9 校 ~260 条记录
- `import:load` 将 JUPAS 数据以 `examCategory: 'dse'` 成功入库
- 现有测试 7/7 仍通过

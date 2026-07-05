# Load 验证 + CUHK/EdUHK + BIT batch 优化 + 港澳 gaokao 数据

> **调研结果：**
> - CUHK：字母等级 + 末尾 "Programme Weighted Total" 数字列，需特殊提取
> - EdUHK：JS 编号 + 数字分数（Median/LQ），正则 `\^?` 已修复，但 `JS8001-JS8013`+`JS8651-JS8727` 仍未匹配。原因：行内容过长，JS 编号前有缩进 + 表头行干扰
> - BIT majors 批量：当前行 564 逐个 `create()`，改为 `createMany` chunks of 500
> - 港澳 gaokao：全部为自主招生 / 无省分数线公开，**无可入库结构化数据**，registry 标注即可

---

## Step 1: import:report 验证

```bash
cd /Users/haoyuli/Desktop/gaokao
# load 完成后跑（目前 BIT+provincial 正在后台）
npm run import:report
```

验证点：

```bash
# BIT major 入库数
grep -A20 '"bit-undergrad"' data/reports/coverage-summary.json | grep majorImportedCount

# 贵州/河北/山东 入库
grep -B2 -A15 '"贵州"\|"河北"\|"山东"' data/reports/source-load-summary.json | grep -E 'province|importedMajors|nativeMajorCount'
```

---

## Step 2: CUHK/EdUHK JUPAS 补齐 (+~34 条)

### 2A. CUHK（~25 条）

CUHK 格式：
```
    JS4006    Anthropology                            M         5*    3       3        A        5**    4    3    24.5
```
- 行尾 `Programme Weighted Total` = 数字分数（如 24.5, 30.4, 26.5）
- `M`/`LQ` 行分别有各自的 weighted total

**策略**：在 `buildRow` 中新增 CUHK 分支 → 从 `accLines` 找单独的数字行（行末数字）作为 Median/LQ

```typescript
// 在 buildRow 中，HKBU else-if 之后新增：
else if (inst === '香港中文大学') {
  // CUHK: extract Programme Weighted Total from M/LQ lines
  let cuhkMedian: number | null = null, cuhkLQ: number | null = null;
  for (const line of accLines) {
    const m = line.trim().match(/(\d+(?:\.\d+)?)\s*$/);
    if (!m) continue;
    const n = Number.parseFloat(m[1]);
    if (Number.isNaN(n) || n < 5 || n > 80) continue;
    if (line.includes('M') && !line.includes('LQ')) cuhkMedian = n;
    if (line.includes('LQ')) cuhkLQ = n;
  }
  if (cuhkMedian !== null) { median = cuhkMedian; lq = cuhkLQ; }
}
```

### 2B. EdUHK（~15 条）

EdUHK 格式：
```
     JS8001     and Digital Arts      Specified ApL             21.3        21.5       -       Specified ApL
```
JS 编号在列中（前有缩进），后面跟 programme 名称 + 数字分数（Lower Quartile / Median）。

问题：`\b(JS\d{4})(?:\^)?\b` 已适配 `^` 后缀，但 EdUHK 的 JS 行混入了 `Specified ApL` 等表头文字导致跳过。

**修复**：EdUHK 的 JS 检测需要更宽松（`JS\d{4}` 后跟数字分数）

```typescript
// 在 main parse 循环中，切换 institution 时检测 EdUHK
if (currentInst === '香港教育大学') {
  // EdUHK JS codes may appear mid-line
  const eduhkM = line.match(/JS(\d{4})(?:\^)?\s+/);
  if (eduhkM && !/^\d{4}\s+JUPAS/.test(line)) {
    const afterJS = line.slice(line.indexOf(eduhkM[0]));
    // Check if followed by programme title + numeric scores
    if (/\d+(?:\.\d+)?\s+\d+(?:\.\d+)?/.test(afterJS)) {
      code = 'JS' + eduhkM[1];
    }
  }
}
```

### 2C. 验证

```bash
npx tsx scripts/data/parse-jupas-dse.ts --year=2025
# 预期: ~250 programmes（9校接近全覆盖）
```

---

## Step 3: BIT majors createMany 批量优化

### 当前代码
`src/lib/import/upsert.ts` 行 450-573：
```typescript
for (const ... of syntheticPrepared) {
  if (existingMajor) {
    await prisma.majorRecord.update(...)   // 逐个 update
  } else {
    await prisma.majorRecord.create(...)   // 逐个 create — 7983 次！
  }
}
```

### 改造方案

```typescript
// 1. 收集待 create 的新 majors
const newMajorPayloads: Array<Prisma.MajorRecordCreateManyInput> = [];
const updateOps: Array<{ id: number; data: Prisma.MajorRecordUpdateInput }> = [];

for (const { major, parentAdmission } of syntheticPrepared) {
  // ... existing identity key logic ...
  
  if (existingMajor) {
    updateOps.push({ id: existingMajor.id, data: majorPayload });
    counters.updatedMajors += 1;
  } else {
    newMajorPayloads.push(majorPayload);
    counters.importedMajors += 1;
  }
}

// 2. Batch create in chunks of 500
for (const chunk of chunkArray(newMajorPayloads, 500)) {
  await prisma.majorRecord.createMany({
    data: chunk,
    skipDuplicates: true,
  });
}

// 3. Batch update via transaction (or sequential, since Prisma doesn't support batch update natively)
for (const op of updateOps) {
  await prisma.majorRecord.update({ where: { id: op.id }, data: op.data });
}
```

### 影响
- BIT 7983 majors: ~150ms × 7983 ≈ 20 分钟 → 16 × 500 batch ≈ 8 秒
- 其他 provincial majors 同理受益

---

## Step 4: 港澳 gaokao 数据评估 + registry

### 数据源现状

| 区域 | 学校数 | 招生方式 | 公开省分数线 | 可行性 |
|------|--------|---------|-------------|--------|
| **香港统招** | 3 校（CUHK/CityU/珠海学院） | 统招提前批/本科批 | ✅ 各省考试院投档线 | 已在 provincial parser 源中 |
| **香港自主** | 12 校（HKU/PolyU/HKUST/HKBU/Lingnan/EdUHK/HKMU等） | 自主招生 | ❌ 不公开省分数线 | 无结构化数据 |
| **澳门自主** | 6 校（澳大/澳科大/澳理工/澳城大/澳旅游/镜湖） | 自主招生 | ❌ 仅有"一本线以上"等模糊要求 | 无量化数据 |

### 结论
- **香港统招 3 校**：CUHK/CityU 投档线已在现有 provincial parser 源中自动入库（与内地高校同批投档）
- **港澳自主招生校**：全部不公开省最低录取分数——仅公开"需达一本线+英语 X 分+面试"等定性门槛。`groupRequirement` 字段可存储入学要求文本，但无 `minScore`/`avgScore` 可入库
- **副学士**：录取基于 HKDSE 分数+面试评估，院校不公开最低分，仅公开"5 科达 Level 2"等入学要求

### Registry 更新

修改 `src/lib/import/overseas-source-registry.ts`，新增港澳 gaokao 条目：

```typescript
// === 香港本科录取（内地高考统招） ===
{
  examCategory: 'gaokao',
  title: '香港中文大学/香港城市大学 内地高考统招录取（提前批）',
  officialUrl: '各省考试院投档线中已包含',
  sourceType: 'research-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'searched-only',
  institutionScope: 'single-school',
  notes: 'CUHK/CityU/珠海学院通过内地统招录取，投档线已随各省 provincial parser 源自动入库。无需额外操作。',
},
// === 香港自主招生（高考） ===
{
  examCategory: 'gaokao',
  title: '香港 12 所自主招生院校 内地高考录取（无公开省分数线）',
  officialUrl: '各校自主招生官网',
  sourceType: 'research-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'todo',
  institutionScope: 'self-financed',
  notes: 'HKU/PolyU/HKUST/HKBU/Lingnan/EdUHK/HKMU/SYU/HSU/TWC/THEi/APA 等 12 校均为自主招生，录取基于高考总分+英语+面试，不公开各省最低分数线。无法以结构化数据入库。',
},
// === 香港副学士 ===
{
  examCategory: 'gaokao',
  title: '香港副学士/高级文凭 内地高考录取（无公开分数线）',
  officialUrl: '各专上学院招生简章分散发布',
  sourceType: 'research-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'todo',
  institutionScope: 'self-financed',
  notes: 'HKCC PolyU/HKBU CIE/HKU SPACE/UOWCHK 等副学士课程录取基于 HKDSE 分数（需 5 科 Level 2）+面试，部分院校接受内地高考成绩（需一本/二本线+英语成绩）。不公开实际录取最低分。',
},
// === 澳门（高考） ===
{
  examCategory: 'gaokao',
  title: '澳门 6 所高校 内地高考录取（无公开省分数线）',
  officialUrl: '各校自主招生官网',
  sourceType: 'research-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'todo',
  notes: '澳门大学/澳科大/澳理工/澳城大/澳旅游/镜湖护理 6 校自主招生。录取要求：高考一本线/特控线+英语 110+（澳大），其他校一本/二本线。无省分数线公开，仅公开入学门槛。',
},
```

---

## 文件变更

| 文件 | 操作 | 内容 |
|------|------|------|
| `scripts/data/parse-jupas-dse.ts` | 修改 | CUHK weight-total 提取 + EdUHK JS 行内匹配 |
| `src/lib/import/upsert.ts` | 修改 | majors createMany batch chunks 500 |
| `src/lib/import/overseas-source-registry.ts` | 修改 | 新增港澳 gaokao 4 条（统招+自主+副学士+澳门） |
| -- | 命令 | load→report→JUPAS→测试 |

## 验证

- [ ] JUPAS 产出 ≥ 245 条（含 CUHK+EdUHK 新增）
- [ ] BIT/provincial load 后 `majorImportedCount` 非零
- [ ] `createMany` 改造后 BIT 7983 条在 10 秒内完成
- [ ] 测试 7/7 通过

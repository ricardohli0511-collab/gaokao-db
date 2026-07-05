# BIT 入库 + JUPAS 4校补齐 + 全量 provincial load 执行计划

> **调研结果：**
> - JUPAS 剩余 4 校（Lingnan/HKBU/EdUHK/HKMU）格式已逐校确认
> - Lingnan：同一 JS 编号分两行（Median / Lower Quartile），需特殊合并
> - HKBU：分数为 Mean Score + 科目等级（5*/5/4/3），非数字 Median/LQ
> - EdUHK/HKMU：JS 在行首 + 数字分数，`^` 后缀导致正则未匹配，改 `\b`→`\^?` 即可
> - CUHK gaokao：provincial normalized 中无"香港中文大学"，**不需额外后处理**；CUHK 若在广东/江苏提前批出现会在 import:load 时以 `examCategory: 'gaokao'` 自动入库
> - SAT PDF 已在本地，最小验证：手动插入 1 条 sat 记录

---

## Step 1: JUPAS 4 校补齐（parser 微调）

### 1A. EdUHK + HKMU：改 JS 正则

问题：JS 编号带 `^` 后缀（如 `JS9009^`），`\b` 在 `^` 后断开。

修复：
```typescript
// line 70: change
const jsM = /\b(JS\d{4})\b/.exec(line);
// to
const jsM = /\b(JS\d{4})(?:\^)?\b/.exec(line);
```

### 1B. Lingnan：多行合并同一 programme

Lingnan PDF 输出格式：
```
JS7101                                          Median      25.845       5           3            3            4              4
Bachelor of Arts (Hons) in Chinese               Lower       25.27        4           3            3            4              3
```

修复：在 `buildRow` 中识别 Lingnan → 查找 `accLines` 中含 `Median` 和 `Lower` 的行，分别提取第一个数字列（加权分数）。

### 1C. HKBU：Mean Score + 科目等级

HKBU 格式：
```
JS2020 Bachelor of Arts (Hons) (...)
Score Formula: Best 5
                Median            5*         3         4      Attained      5        4
   21.95
            Lower Quartile        5*         3         4      Attained      5        3        3
```

Mean Score `21.95` 单独一行。Median/LQ 用等级。

修复：HKBU 的 `buildRow` → 从 `accLines` 中找单独的数字行（`/^\s*\d+(?:\.\d+)?\s*$/`）作为 mean → 存入 `avgScore`。科目等级列表存入 `groupRequirement`，不计算总分。

### 1D. 输出验证

```bash
npx tsx scripts/data/parse-jupas-dse.ts --year=2025
# 预期: ~260 programmes（9校全覆盖，含 Lingnan/HKBU/EdUHK/HKMU）
```

---

## Step 2: BIT solo load

```bash
cd /Users/haoyuli/Desktop/gaokao

# 隔离 BIT normalized 文件
mkdir -p /tmp/gaokao-bak
mv data/normalized/山东 data/normalized/广东 data/normalized/江苏 \
   data/normalized/河北 data/normalized/浙江 data/normalized/湖南 \
   data/normalized/贵州 data/normalized/辽宁 data/normalized/陕西 \
   data/normalized/香港 /tmp/gaokao-bak/ 2>/dev/null

# 清理全国/2025 中非 BIT 文件
ls data/normalized/全国/2025/ | grep -v bit-undergrad | while read f; do rm -f "data/normalized/全国/2025/$f"; done

# 跑 load
LOAD_CONCURRENCY=1 npm run import:load
```

验证：
```bash
# 在 load 的 terminal 中等待输出类似：
# [  1/1] adm: +93/~0 maj: +7983/~0 sk:0 bit-undergrad-html-all-06c6f3bca1d9.html
```

---

## Step 3: 恢复全量 provincial load

```bash
# 恢复 provincial normalized 目录
mv /tmp/gaokao-bak/* data/normalized/ 2>/dev/null
rmdir /tmp/gaokao-bak

# 全量 load（包含贵州+河北+山东+广东+江苏+浙江+湖南+辽宁+陕西+香港）
LOAD_CONCURRENCY=1 npm run import:load

# report
npm run import:report
```

---

## Step 4: CUHK gaokao 确认 + SAT 最小验证

### CUHK gaokao
- 已搜索：provincial normalized 无"香港中文大学"/"香港大學"字符串
- **结论**：现有 provincial 来源不包含 CUHK 数据。CUHK 通过统招提前批录取，分数线发布在各省考试院投档线 PDF 中（如广东 2025 提前批投档线）。**暂不额外处理**，registry 条目已标注 `status:'searched-only'`

### SAT 最小验证
```bash
# 查看 SAT PDF 首几行确认可提取
pdftotext -layout data/raw/海外/SAT/2025-total-group-sat-suite-annual-report.pdf - 2>/dev/null | head -40
```
手动录入 1 条：
- `examCategory:'sat', year:2025, province:'全国', minScore:1024, avgScore:1050, admissionType:'统招'`

---

## 文件变更

| 文件 | 操作 | 内容 |
|------|------|------|
| `scripts/data/parse-jupas-dse.ts` | 修改 | JS 正则改 `\^?`；Lingnan/HKBU buildRow 特殊处理 |
| -- | 命令 | Step 2+3: BIT solo load → 全量 provincial load → report |

---

## 验证清单

- [ ] JUPAS parse 产出 ≥ 220 条（含 Lingnan/HKBU/EdUHK/HKMU 新增）
- [ ] BIT load 输出 `adm:+93/~0 maj:+7983/~0`
- [ ] 全量 provincial load 贵州/河北/山东有数据
- [ ] `source-load-summary.json` 河北/山东/贵州 `importedMajors > 0`
- [ ] 测试 7/7 通过

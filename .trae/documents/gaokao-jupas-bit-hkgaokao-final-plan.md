# JUPAS 全量解析 + BIT 入库 + 香港高考录取 + SAT 提取 执行计划

> **调研结果：** JUPAS PDF 中 9 所学校使用 **4 种不同格式**。HKU/CUHK 用科目等级，PolyU JS 编号不在行首。香港大学内地高考录取无统一公开数据，CUHK 统招分数线可从各省考试院获取。SAT PDF 已在本地。

---

## Section 1: JUPAS DSE — 剩余 ~240 条全覆盖

### 格式差异汇总

| 学校 | 代码格式 | 分数格式 | 行首特征 | 当前解析 |
|------|---------|---------|---------|---------|
| **CityU** | `JS1000` | 加权数字 (24.5-45.5) | JS 在行首 ✅ | ✅ 部分覆盖(1条) |
| **HKBU** | `JS2xxx` | 加权数字 | JS 在行首 ✅ | ❌ 待修复 |
| **Lingnan** | `JS7xxx` | 加权数字 | 空行后 JS ✅ | ✅ 2条 |
| **CUHK** | `JS4xxx` | 科目等级 A/B/C + Best 5 | JS 在行首 ✅ | ❌ 需新规则 |
| **EdUHK** | `JS8xxx` | 加权数字 | JS 缩进在列中 🔶 | ❌ 需新规则 |
| **PolyU** | `JS3xxx` | **两列分数** (百分位+加权) | JS **不在行首**，以 `(subject weighting` 开头 | ❌ 需新规则 |
| **HKUST** | `JS5xxx` | 加权数字 (32-67) | JS 在行首 ✅ | ✅ 19条 |
| **HKU** | `6xxx` (无JS前缀) | **科目等级 5**/5*/5** + Best 5 加权 | 纯数字4位在行首 ✅ | ❌ 需新规则 |
| **HKMU** | `JS9xxx` | 加权数字 | JS 在行首 ✅ | ❌ 待修复 |

### 解析规则扩展

#### 规则 A：CityU/HKBU/Lingnan/EdUHK/HKMU/HKUST（JS 行首 + 数字分数）
当前 `inTable` 过滤太激进。修复方案：**去掉 inTable 条件**，改为全文本扫描 + 行末数字匹配。

#### 规则 B：PolyU（JS 不在行首）
PolyU PDF 格式：
```
                               JS3060     (subject weighting     Any Best 5 Subjects
                              in details)                               Median           185.5
                                                                     Lower Quartile      185.0
```
JS 编号在列中，缩进后出现。识别策略：`/\bJS\d{4}\b/` 匹配任意位置的 JS 编号 → 作为新 programme 开始。

#### 规则 C：HKU（纯数字代码 + 分数/等级混合）
```
 6004      Bachelor of Arts in Architectural Studies       Best 5 Subjects a                           32             29            28
```
- 代码格式：`^\s*\d{4}\s+` (纯4位数字，如 6004)
- 分数格式：**末尾三列数字** (Upper Quartile / Median / Lower Quartile)
- 计分公式在行中：`Best 5 Subjects`、`2 x Eng + Best 4` 等

**解析为**：`minScore=LQ(28)`, `avgScore=Median(29)`, `groupCode='6004'`

#### 规则 D：CUHK（科目等级）
```
 JS4254    Programme in Global Economics          M          5        5*        5*         A
```
每列对应：数学(M)/英文(E)/通识(LS)/选修1/选修2/选修3，用等级 5**/5*/5/4/3/2/1。
- 需要做 **等级→分数转换**（5**=8.5, 5*=7, 5=5.5, 4=4...），然后求 sum 或 best 5。
- 或者：**只提取等级列表，存入 `groupRequirement`**，不计算总分（因为加权规则不透明）。

### 实现策略

**在 `parse-jupas-dse.ts` 中新增多规则 table 解析**：

```typescript
// 1. 全文本扫描，去掉 inTable 过滤
// 2. 检测 institution header → 确定当前学校
// 3. 选择对应子解析器：

type ParserStrategy = 'js-numberline' | 'polyu-table' | 'hku-grade' | 'cuhk-grade';

function detectStrategy(instName: string, line: string): ParserStrategy {
  if (instName.includes('Polytechnic') && /\bJS\d{4}\b/.test(line)) return 'polyu-table';
  if (instName === '香港大学' && /^\s*\d{4}\s+/.test(line)) return 'hku-grade';
  if (instName === '香港中文大学' && /[5*]+/.test(line)) return 'cuhk-grade';
  return 'js-numberline'; // default for CityU/HKBU/Lingnan/EdUHK/HKMU/HKUST
}
```

**输出目标**：~260 条 DSE 记录（9校，覆盖约85%的有分数课程）

---

## Section 2: BIT solo load

```bash
cd /Users/haoyuli/Desktop/gaokao

# 备份 provincial normalized 目录
mkdir -p /tmp/gaokao-bak
mv data/normalized/山东 data/normalized/广东 data/normalized/江苏 \
   data/normalized/河北 data/normalized/浙江 data/normalized/湖南 \
   data/normalized/贵州 data/normalized/辽宁 data/normalized/陕西 \
   data/normalized/香港 /tmp/gaokao-bak/ 2>/dev/null

# 清理全国目录中非 BIT 文件
ls data/normalized/全国/2025/ | grep -v bit-undergrad | xargs -I{} rm -f "data/normalized/全国/2025/{}"
rm -f data/normalized/全国/2026/*.json

# 单线程跑
LOAD_CONCURRENCY=1 npm run import:load

# 跑完后恢复
mv /tmp/gaokao-bak/* data/normalized/ && rmdir /tmp/gaokao-bak
npm run import:report
```

预期：93 synthetic parents batch created + 7983 majors 写入，~2-3分钟。

---

## Section 3: 香港高考内地录取（examCategory: 'gaokao', province: '香港'）

### 数据源现状

| 学校 | 招生方式 | 公开分数数据 | 可行性 |
|------|---------|-------------|--------|
| **HKU** | 自主招生 | ❌ 不公开省/分数线 | 无公开结构化数据 |
| **CUHK** | 统招提前批 | ✅ 各省考试院有投档线 | 可从广东/江苏等省源中提取 |
| **HKUST** | 自主招生 | ❌ 不公开分数线 | 无公开数据 |
| **PolyU/CityU** | 自主招生 | 🔶 部分机构有汇总 | 第三方汇总，非官方 |
| **副学士** | 各专上学院自主 | ❌ 不公开录取分 | 只有入学要求（HKDSE 5科2级等） |

### 可行策略

1. **CUHK 统招数据**：CUHK 在广东/江苏/浙江等省提前批投档，数据**已在现有 provincial parser 源中**。只需在 `source-registry.ts` 中为现有省份来源打上 `examCategory` tag，或写一个后处理脚本提取 `institutionName: '香港中文大学'` 的记录 → `examCategory: 'gaokao'`。

2. **HKU/其他校**：标注为 `status: 'no-structured-data'`，无公开省分数线可入库。HKU 不提供省分数线——录取只看"高考总成绩+英语成绩+面试"。

### 实施

```typescript
// 新增 OverseasSourceEntry（香港 gaokao 通道）
{
  examCategory: 'gaokao',
  title: '香港中文大学 内地高考统招录取（提前批）',
  officialUrl: '各省考试院投档线中包含',
  sourceType: 'research-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'searched-only',
  institutionScope: 'single-school',
  notes: 'CUHK 通过内地统招提前批录取，投档线已在各省 provincial parser 源中。HKU/HKUST/PolyU/CityU 自主招生不公开省分数线。',
},
{
  examCategory: 'gaokao',
  title: '香港大学/港科大/理大/城大 内地高考录取',
  officialUrl: '各校自主招生，无统一下载源',
  sourceType: 'research-pdf',
  publicationYear: 2025,
  dataYear: 2025,
  status: 'todo',
  institutionScope: 'single-school',
  notes: 'HKU/HKUST/PolyU/CityU/HKBU/Lingnan/EdUHK 均为自主招生。录取基于高考总分+英语+面试，不公开各省最低分数线。HKMU 同理。',
},
```

---

## Section 4: NJU AJAX + 湖南 + SAT（等待/兜底）

### NJU（等待站点恢复）
- AJAX 403，维护中。Playwright 脚本 + 推断配置已就绪。
- 恢复后只需 `python3 -m playwright install chromium && python3 scripts/sniff-nju-ajax.py`

### 湖南 2025 本科批
- 站点分页（index_2 到 index_20）无 2025 本科批公告
- 湖南 2024 本科批 URL 模式：`https://www.hneeb.cn/hnxxg/746/747/...xlsx`
- **兜底**：在 `source-registry.ts` 中预置 URL 模式条目，`status: 'todo'`，等 7 月下旬手动补充实际 URL

### SAT PDF
- 已下载，在 `data/raw/海外/SAT/2025-total-group-sat-suite-annual-report.pdf`
- 提取策略：SAT Total Group Report 是 PDF，包含 mean=1050, 各州 mean 等
- **最小做法**：手动录入 1 条 nationwide SAT 数据（mean=1024, 考生数等），验证前端兼容性后再写 pdf parser
- 后续可用 `python3 -m pdfplumber` 或 `tabula-py` 半自动提取

---

## 文件变更汇总

| 文件 | 操作 | 内容 |
|------|------|------|
| `scripts/data/parse-jupas-dse.ts` | 修改 | 新增 4 种解析策略（js-numberline / polyu-table / hku-grade / cuhk-grade） |
| `data/normalized/香港/2025/jupas-dse-2025.json` | 更新 | parse 产出 ~260 条 |
| `src/lib/import/overseas-source-registry.ts` | 修改 | 新增香港 gaokao 条目（CUHK 统招 + HKU等自主招生不可入库） |
| `data/normalized/全国/2025/bit-undergrad-*-*.json` | 复用 | BIT solo load 目标 |
| -- | 命令 | BIT solo load → import:report |

---

## 下一步建议（完成本轮后）

1. **load 全量 provincial**：BIT 落库后恢复所有 normalized → `import:load` → `import:report`
2. **香港 DSE 前端**：`examCategory: 'dse'` 数据入库后，前端需适配 0-50 分数刻度（不同于 750 分制）
3. **CUHK gaokao 后处理**：写脚本从现有 provincial 源中提取 `institutionName: '香港中文大学'` → 打 `examCategory: 'gaokao'` tag
4. **NJU 接入**：站点恢复后立即抓包激活 → 增加又一个 school-official source

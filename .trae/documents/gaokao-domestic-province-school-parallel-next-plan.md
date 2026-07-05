# 国内省级专业线与学校补齐并行推进计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有国内导入链路上继续补更多省级官方专业线来源，同时把学校官网补齐这条线从“候选验证”推进到“可稳定判断是否可落地”的状态。

**Architecture:** 继续沿用 `source-registry -> fetch -> parse -> load -> report` 主链路，但把这轮工作拆成两条并行线：省级线优先接入真正可自动化下载的官方专业线来源；学校线优先修正候选源建模与可观测性，再用一个更适合自动抓取的静态学校页做首个可落地样板。所有学校来源继续遵循“只补 majors，优先挂到省级 parent admission”的规则。

**Tech Stack:** Next.js 16、TypeScript、Prisma、libsql/Turso、`xlsx`、`pdf-parse`

---

## Summary

当前工作不再适合只按“再加几个省”推进，而要按两条线同时收敛：

1. 省级官方专业线：继续扩可稳定自动化的官方来源。
2. 学校官网补齐：把候选学校源的状态、页面模式、年份表达和报告可观测性补齐，再决定哪些学校可以进入真正的补线闭环。

这轮优先级固定为：

- 省级新增第一优先：`河北 2025 本科批历史/物理两条官方 xlsx`
- 省级低成本扩充：`山东 2025 第 2 次志愿官方 xls`
- 省级保留候选但暂不写入 registry：`贵州同结构历史类/后续征集 PDF`
- 学校线修正现有候选：`BIT`、`NJU`
- 学校线新增首个更适合落地的静态样板：`HIT`
- 学校线只建模不本轮落地：`SEU`

这样排序的原因已经在现有仓库与官方来源上得到验证：

- `河北` 当前仓内尚未接入，但适合作为新增省份样板，因为是标准官方表格下载源，适合直接走 workbook 解析。
- `山东` 已有 `shandong` parser 和 score ladder，新增第 2 次志愿只需要扩来源，不需要再造新 parser。
- `贵州` 当前 parser 已经打底，但要先补精确 URL 清单，而不是盲目继续往 registry 堆条目。
- `BIT` 当前 `officialUrl` 已回退成首页，抓取到的是首页壳而非分数页，说明现阶段最重要的不是继续堆 adapter，而是先修正学校来源建模。
- `NJU` 默认页只显示单条可见记录，仍然是 `filter-page` 候选，而不是已验证全量来源。
- `HIT` 适合做学校线的首个“更有机会真正产出 majors”的样板，因为页面类型比首页壳/单行默认态更接近稳定表格。

## Current State Analysis

### 当前已经完成的部分

- `src/lib/import/source-registry.ts`
  - 已接广东、江苏、浙江、山东、贵州、陕西、辽宁、湖南。
  - 已区分 `province-major-pdf`、`province-institution-html`、`school-major-html-filtered` 等 family。
- `src/lib/import/school-source-registry.ts`
  - 已有 `BIT`、`NJU` 两个学校候选来源。
  - 已支持 `status`、`pageMode`、`coverageYears`、`coverageProvinces`、`crossCheckUrls`。
- `scripts/data/parse-sources.ts`
  - 已支持 `guizhou` PDF 与 `shaanxi` HTML reader 分支。
  - 学校 HTML 仍以整页快照传给 adapter。
- `src/lib/import/parser-registry.ts`
  - 已接入 `guizhou`、`shaanxi`、`bit-undergrad-html`、`nju-undergrad-html`。
- `scripts/data/load-normalized.ts`
  - 已输出 `source-load-summary.json`，并统计 `supplementedMajors`、`dedupedMajors`、`syntheticParentsCreated`。
- `scripts/data/generate-coverage-report.ts`
  - 已开始区分 `nativeMajorCount` 与 `schoolSupplementCount`，并读取学校 metadata。

### 当前最关键的问题

#### 学校源年份是漂移的

涉及文件：

- `src/lib/import/source-registry.ts`

现状：

- `getSchoolIngestSources(referenceYear = new Date().getFullYear())` 会把学校来源统一映射到“当前系统年”。
- 这会让学校抓取与报告结果落在 `全国 / 当前年份` 下，而不是稳定映射到学校来源实际覆盖的年份。

影响：

- 相同学校源在不同时间执行会落到不同 `year`。
- `coverage-summary.json` 里学校源的 year 不稳定，不利于复跑与对账。

#### BIT 当前抓到的是首页壳，不是分数页

涉及文件：

- `src/lib/import/school-source-registry.ts`
- `src/lib/import/parsers/schools/bit-undergrad-html.ts`

现状：

- BIT 现在为了绕开 404/403，把 `officialUrl` 回退成了首页。
- 当前 raw/normalized 产物显示抓到的是首页壳，adapter 仍停留在缺口声明层。

影响：

- 主链路虽然不再因 404/403 中断，但学校补齐线没有实质推进。
- 如果不在计划中把“首页壳”和“真实分数页验证失败”区分开，后续会误把“抓到 HTML”当成“学校源已推进”。

#### 学校 coverage 仍然偏向按 `province/year` 聚合

涉及文件：

- `scripts/data/generate-coverage-report.ts`

现状：

- 现有报告仍会拿 `doc.province`、`doc.year` 去匹配 admission groupBy 结果。
- 这对省级源成立，但对学校源天然失真，因为学校补线来源往往是“全国、多省、多年”的补录入口。

影响：

- 学校源是否真正产出 majors、是否只停留在候选态，当前报告还不够直观。

#### 继续扩省需要从“来源质量”而不是“省份数量”出发

涉及文件：

- `src/lib/import/source-registry.ts`
- `scripts/data/parse-sources.ts`

现状：

- 当前已有省份里，真正专业级来源、父记录型来源、专业组来源已经混合存在。
- 如果继续不加筛选地扩省，会迅速放大“接了来源但实际不提升专业线可用性”的问题。

影响：

- 本轮必须优先接入那些能稳定产出 major 或者以极低成本扩充当前 major 主线的来源。

## Proposed Changes

### 一、固定下一批来源决策

#### 修改 `src/lib/import/source-registry.ts`

What:

- 新增河北 2025 本科批历史/物理两条官方源。
- 新增山东 2025 第 2 次志愿官方源。
- 暂不把贵州历史类/后续征集 PDF 直接写入 registry。
- 暂不新增新的“只有 institution 没有 majors”的省级来源。

Why:

- 河北适合作为新省份样板，山东适合作为低成本扩轮次，贵州则应先补精确 URL 清单，避免把“候选来源”误写成“可直接抓取来源”。

How:

- 为河北新增两条 `parserKey: 'hebei'` 来源，按真实下载格式设定 `sourceType` 与 `granularity`。
- 为山东新增一条 2025 第 2 次志愿来源，继续复用 `parserKey: 'shandong'` 与既有 `gapPolicy`。
- 不在本轮引入福建、江西、重庆等未确认有稳定公开全量下载附件的来源。

#### 修改 `src/lib/import/source-registry.test.ts`

What:

- 新增来源选择和学校年份稳定性的测试。

Why:

- 这轮决策的关键不是 parser 能不能写，而是 registry 的来源表达必须稳定且不漂移。

How:

- 校验河北两条来源都已注册。
- 校验山东第 2 次志愿来源已注册。
- 校验学校 ingest source 的 year 不再依赖当前系统时间。
- 校验学校 sourceId 在重复生成时保持稳定。

### 二、修正学校来源建模，避免“抓到首页壳”被误算推进

#### 修改 `src/lib/import/school-source-registry.ts`

What:

- 修正 BIT 来源表达。
- 保留 NJU 为 `candidate`。
- 新增 HIT 作为 `static-table` 候选。
- 新增 SEU 作为 `review + article-list` 建模样板。

Why:

- 现有学校线的主要问题不是学校数量太少，而是候选态与真实可落地态还没有被清楚地区分。

How:

- BIT：
  - `officialUrl` 改为真实分数页 URL，而不是首页。
  - `crossCheckUrls` 同时保留首页和分数页。
  - `status` 继续保持 `candidate`。
  - `pageMode` 保持 `filter-page`。
- NJU：
  - 继续保持 `candidate`。
  - 暂不升级为 `active`。
- HIT：
  - 新增 `schoolKey: 'hit-undergrad'`。
  - `pageMode: 'static-table'`。
  - 初始 `status: 'candidate'`，待真实抓取+解析通过后再升级。
- SEU：
  - 新增 `schoolKey: 'seu-undergrad'`。
  - `pageMode: 'article-list'`。
  - `status: 'review'`。
  - 本轮只做来源建模，不要求进入 parser 与 ETL。

#### 修改 `src/lib/import/school-source-registry.status.test.ts`

What:

- 补齐学校状态与页面模式的断言。

Why:

- 学校线这轮最重要的验收点是状态表达准确，而不是先把更多学校塞进抓取流程。

How:

- 校验 `BIT` 不再使用首页作为唯一 officialUrl。
- 校验 `HIT` 为 `static-table`。
- 校验 `SEU` 为 `review + article-list`。
- 校验 `NJU` 仍是 `candidate`。

### 三、补河北 parser，并把学校 HTML 的壳状态显式化

#### 新增 `src/lib/import/parsers/hebei.ts`

What:

- 新建河北 parser。

Why:

- 河北是这轮唯一真正新增的省级主样板，不应继续把 workbook 解析逻辑塞回 `parse-sources.ts`。

How:

- 先依据真实 workbook 表头做字段映射，再决定最终输出是 `major` 还是 `group`。
- 首轮实现禁止“先假设 granularity、后修测试”；必须由真实表头和样本决定。
- 统一产出 `recordIdentityKey`、`majorIdentityKey`，并沿用现有 normalized 结构。

#### 新增 `src/lib/import/parsers/hebei.test.ts`

What:

- 为河北 parser 先写失败测试。

Why:

- 这轮按 `writing-plans` 约束执行，新增 parser 必须先锁定真实结构，再写最小实现。

How:

- 用真实或近真实表头样本构造 `RawSourceRow`。
- 断言 parser 输出非空 admissions。
- 如果表头确认是专业级，则断言 majors 非空且带父挂载信息。
- 如果表头最终确认是专业组级，则断言 `granularity` 不被误报成 `major`。

#### 修改 `scripts/data/parse-sources.ts`

What:

- 新增 `hebei` workbook reader 分支。
- 增加学校 HTML 壳类型标记。

Why:

- 省级线需要为河北补行抽取；学校线需要把“首页壳”“默认单行态”“未知 HTML”区分开，避免 adapter 只能一律输出 `school_adapter_pending`。

How:

- 在 `rowsFromWorkbook()` 中增加 `source.parserKey === 'hebei'` 分支。
- 保持学校 HTML 整页传递给 adapter，但额外写入轻量 `htmlKind`，候选值至少包括：
  - `home-shell`
  - `filtered-single-row`
  - `unknown-html`
- 解析脚本只负责结构化原始输入，不在这一层直接生成学校业务 gaps。

### 四、扩 parser registry，并只接入本轮真正要落地的学校样板

#### 修改 `src/lib/import/parser-registry.ts`

What:

- 注册 `hebei`。
- 注册 `hit-undergrad-html`。
- 不在本轮注册 `seu-undergrad-html`。

Why:

- `SEU` 这轮只是 review 型建模，不应该被误送入执行主链路。

How:

- 在省级 registry 中加入 `hebei`。
- 在学校 adapter registry 中加入 `hit-undergrad-html`。
- `listParserKeys()` 只返回当前真正可运行的 parserKey。

#### 新增 `src/lib/import/parsers/schools/hit-undergrad-html.ts`

What:

- 新建 HIT 学校适配器。

Why:

- 需要一个比 BIT/NJU 更适合直接验证 majors 产出的学校样板，来推动学校补齐线真正往前走。

How:

- 直接从 HTML 表格提取 majors。
- 为每条 major 生成 `parentAdmissionLocator`。
- 不默认在 parser 里新建 admission；继续依赖 loader 的 synthetic parent 兜底。
- 省份、年份必须从表格行本身或稳定页面结构中解析，不得直接套用 `全国 / 当前年`。

#### 新增 `src/lib/import/parsers/schools/hit-undergrad-html.test.ts`

What:

- 为 HIT adapter 先写失败测试。

Why:

- 学校线当前缺的不是更多占位 adapter，而是第一个真能产出 majors 的样板。

How:

- 断言 `majors.length > 0`。
- 断言 majors 都带 `parentAdmissionLocator`。
- 断言在父记录缺失时不会直接伪造并行 admission。

### 五、让 loader 和 report 真正看得见“学校线是否推进”

#### 修改 `scripts/data/load-normalized.ts`

What:

- 扩充 source-level summary 的学校维度字段。

Why:

- 现在 loader 已经统计了学校补齐核心指标，但还不足以直接比较 BIT、NJU、HIT 三条学校线谁真的有产出。

How:

- 在 `sourceLoadSummary` 中追加字段：
  - `sourceId`
  - `parserKey`
  - `schoolKey`
  - `declaredGaps`
  - `verificationNotes`
  - `gapCount`
- 在 `gapSummary` 中保留 `schoolKey`。
- 确保空 majors 但有 gaps 的学校源不会被静默吞掉。

#### 新增 `scripts/data/load-normalized.test.ts`

What:

- 为 summary 结构补测试。

Why:

- 这轮报告准确性依赖 loader 输出，不应在报告脚本里临时猜测学校状态。

How:

- 若脚本不便直接测试，则先把 summary item 组装逻辑提炼成可导出的纯函数再测。
- 断言学校源 summary 带 `schoolKey`。
- 断言 `province-official` 与 `school-official` 可被直接区分。

#### 修改 `scripts/data/generate-coverage-report.ts`

What:

- 重构学校源 coverage 的计算方式。

Why:

- 学校源不应再主要依赖 `province/year` 聚合 admission 的方式来判断完成度。

How:

- 省级源仍可沿用当前 `province/year` 的 groupBy 逻辑。
- 学校源改为主要基于：
  - `officialUrl`
  - `schoolKey`
  - `source-load-summary.json`
  - `SCHOOL_SOURCE_REGISTRY`
- 补充输出字段：
  - `coverageYears`
  - `coverageProvinces`
  - `verificationNotes`
  - `majorImportedCount`
  - `schoolSupplementCount`
  - `syntheticParentCount`
  - `sourceStatus`
  - `pageMode`
  - `schoolGapState`
- 学校源“已完成”判断改为 `majorImportedCount > 0`，而不是仅看 `granularity === 'major'`。

#### 新增 `scripts/data/generate-coverage-report.test.ts`

What:

- 为学校 coverage 逻辑补测试。

Why:

- 这是当前最容易误判状态的地方，必须先用测试锁定“候选态”和“已产出”之间的边界。

How:

- 断言 `candidate + filter-page` 会显示 `school_page_filter_enumeration_unverified`。
- 断言 `review + article-list` 不会被误判成已覆盖。
- 断言 `majorImportedCount === 0` 的学校源不会被标记为完成。
- 断言即便 `province === '全国'`，学校源也能正确显示 coverage 信息。

### 六、继续沿用现有去重和父挂载规则，不重开 schema 侧工程

#### 不修改 `src/lib/import/upsert.ts` 与 `prisma/schema.prisma`

What:

- 本轮不再新增 schema 字段，也不改去重主策略。

Why:

- 当前去重、`parentAdmissionLocator`、`syntheticParentsCreated` 已经是稳定基础设施。
- 这轮主要问题在来源决策、学校建模和报告表达，不在数据库结构本身。

How:

- 所有新省级 parser、学校 parser 都继续复用：
  - `recordIdentityKey`
  - `majorIdentityKey`
  - `parentAdmissionLocator`
- 如果执行中发现河北或 HIT 样本暴露真正的 schema 缺口，再单独起新计划，不在本轮预先扩 schema。

## Assumptions & Decisions

1. 这轮国内继续推进的范围只包含“省级专业线 + 学校补齐”，不重开海外考试主线。
2. 省级新增第一优先是河北，第二优先是山东第 2 次志愿扩轮次。
3. 贵州后续扩线在 parser 能力上可复用，但本轮先不写新条目，必须等精确 URL 清单确认后再接。
4. 福建、江西、重庆这轮不进入自动 ETL，因为目前没有确认到稳定的官方全量公开下载源。
5. BIT 本轮目标不是“强行做成 active”，而是把首页壳与真实分数页验证失败状态区分清楚。
6. NJU 在确认存在稳定枚举方式之前，保持 `candidate`；若执行验证时确认不可枚举，可降为 `review`。
7. HIT 是学校线本轮主样板，优先级高于继续补更多 `filter-page` 候选。
8. SEU 这轮只做 `review + article-list` 建模，不进入 parser 与抓取主链路。
9. 学校 ingest source 的 year 必须改成稳定值，不再跟随系统当前年份漂移。
10. 本轮不新增 schema、不调整现有幂等与去重机制。

## Verification steps

### 代码级验证

1. registry 测试
   - 河北两条来源存在。
   - 山东第 2 次志愿来源存在。
   - 学校 source year 稳定。
   - `BIT`、`NJU`、`HIT`、`SEU` 状态与页面模式符合预期。
2. parser 测试
   - 河北 parser 能依据真实样本结构输出正确 granularity。
   - BIT adapter 对首页壳、空表态、待枚举态能给出更细 gaps。
   - NJU adapter 继续明确标记待枚举态。
   - HIT adapter 能产出非空 majors，并携带 `parentAdmissionLocator`。
3. loader/report 测试
   - 学校源 summary 输出 `schoolKey`、`declaredGaps`、`verificationNotes`。
   - coverage 对学校源不再依赖 `province/year` 的 admission 聚合。
   - `majorImportedCount === 0` 的学校源不会被误报为完成。

### 主链路验证

1. 只针对本轮目标来源执行最小回归：
   - 河北 2025 历史/物理
   - 山东 2025 第 2 次志愿
   - BIT
   - NJU
   - HIT
2. 依次验证：
   - `import:fetch`
   - `import:parse`
   - `import:load`
   - `import:report`
3. 产物检查：
   - 河北 normalized 非空，且 granularity 与真实样本一致。
   - 山东第 2 次志愿进入 normalized 与 load 结果。
   - BIT 若仍不能直接抓全量，必须在 gap 中精确体现原因。
   - NJU 保持候选态或降 review，不允许被误标 active。
   - HIT 若成功产出 majors，应在 summary 与 coverage 中清晰可见。

### 报告验证

1. `data/reports/source-load-summary.json`
   - 能直接比较 BIT、NJU、HIT 的导入和补齐情况。
2. `data/reports/gap-summary.json`
   - 能直接定位哪条学校源仍卡在首页壳、默认态不全或筛选枚举未验证。
3. `data/reports/coverage-summary.json`
   - 能区分：
     - 河北这类新增省级源
     - 山东这类扩轮次源
     - 陕西这类父记录型来源
     - BIT/NJU 这类候选学校源
     - HIT 这类学校补线样板

### 执行顺序

1. 先写测试：
   - `src/lib/import/source-registry.test.ts`
   - `src/lib/import/school-source-registry.status.test.ts`
   - `src/lib/import/parsers/hebei.test.ts`
   - `src/lib/import/parsers/schools/hit-undergrad-html.test.ts`
   - `scripts/data/load-normalized.test.ts`
   - `scripts/data/generate-coverage-report.test.ts`
2. 再写实现：
   - `src/lib/import/source-registry.ts`
   - `src/lib/import/school-source-registry.ts`
   - `scripts/data/parse-sources.ts`
   - `src/lib/import/parser-registry.ts`
   - `src/lib/import/parsers/hebei.ts`
   - `src/lib/import/parsers/schools/hit-undergrad-html.ts`
   - `scripts/data/load-normalized.ts`
   - `scripts/data/generate-coverage-report.ts`
3. 最后跑最小回归链路，并核对 reports。

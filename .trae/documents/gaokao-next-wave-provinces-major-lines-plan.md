# 更多省份扩容与专业线补齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有广东、江苏两省基础上，继续扩容更多省份的官方录取数据，并把“专业线”作为独立链路接入数据库与前台展示。

**Architecture:** 继续沿用当前 `source-registry -> raw -> normalized -> load -> report` 主链路，但把“扩省”和“专业线补齐”统一收敛到新的 parser registry 与 official-major pipeline。省级来源按官方优先分层接入，专业线不再混在 group parser 里临时处理，而是通过 `parentAdmissionRowHash` 和统一 upsert 机制挂到对应 admission 之下。

**Tech Stack:** Next.js 16、TypeScript、Prisma、SQLite/libSQL、`xlsx`、`adm-zip`、`pdf-parse`

---

## Summary

现有项目已经具备继续扩省的基础骨架，但还没有真正打通“专业线”入库闭环。下一轮实现必须同时做两件事：

1. 继续扩接更多省份，优先选择公开可下载官方附件、结构稳定、适合复用现有解析框架的省份。
2. 把“专业线”从“可能有但没挂上”升级为真正可入库、可追溯、可展示的主能力。

基于已验证来源，省份优先级直接定为：

1. 浙江：官方 `xls`，且志愿模式是“具体高校的具体专业（类）”，最适合做第一批 major parser [$TRAE_REF](https://www.zjzs.net/art/2025/7/21/art_45_11467.html)[$TRAE_REF](https://www.zjzs.net/art/2024/7/25/art_45_9916.html)
2. 山东：官方 `xls`，表头即为“专业代号及名称 + 院校代号及名称 + 最低位次”，天然接近专业线；但通常需要同年官方一分一段表做位次反推分数 [$TRAE_REF](https://www.sdzk.cn/NewsInfo.aspx?NewsID=6996)[$TRAE_REF](https://www.sdzk.cn/Floadup/file/20250728/6388931521217170972235326.xls)
3. 辽宁：官方以 `zip` 发布本科批最低分，志愿模式是“专业+学校”，适合作为 zip 家族和“专业+学校”模式的第三个省级样板 [$TRAE_REF](https://www.lnzsks.com/newsinfo/IMS_20240720_44109_OymtAPK6ag.htm)[$TRAE_REF](https://www.lnzsks.com/newsinfo/IMS_20240419_43790_4E1ZvwklLT.htm)
4. 湖南：当前已确认可下载 `xlsx`，但已检索到的样本更适合作为“扩省 + 提前批/专业组覆盖”，不是专业线主源 [$TRAE_REF](https://www.hneeb.cn/hnxxg/741/742/content_4454.html)[$TRAE_REF](https://www.hneeb.cn/hnxxg/741/742/content_4426.html)

高校专业线来源这轮不和省级 parser 混做，而是单独设计“学校适配器”接口。原因是高校本科招生网的结构分散、稳定性差，且已检索到的学校站点存在不同站型和可访问性差异，适合在省级主链路打稳后按学校逐个接入。比如北京理工大学本科招生网已经有独立“录取查询”入口，说明学校适配器是现实需求，但不能当成统一模板 [$TRAE_REF](https://admission.bit.edu.cn/)

## Current State Analysis

### 当前已完成部分

- `src/lib/import/source-registry.ts` 已接入广东、江苏，且都标注为 `group` 粒度。
- `scripts/data/fetch-official-sources.ts`、`parse-sources.ts`、`load-normalized.ts`、`generate-coverage-report.ts` 已形成离线 ETL 主链路。
- `prisma/schema.prisma` 已具备 `SourceDocument`、`ImportJob`、`InstitutionAlias`、扩展版 `AdmissionRecord` 与 `MajorRecord` 模型。
- 当前数据库和报告文件已表明项目可以稳定接官方附件并写库。

### 当前真正的缺口

#### 1. parser 分发仍然写死

文件：`scripts/data/parse-sources.ts`

现状：

- 目前只在主流程里硬编码 `guangdong / jiangsu` 二选一。
- 继续扩省会导致 `if/else` 链膨胀。

影响：

- 每加一个省都要改主流程。
- 无法做“按 parserKey 自动分发”的可维护扩容。

#### 2. 专业线没有父子关联主键

文件：`src/lib/import/types.ts`

现状：

- `NormalizedMajorRecord` 没有显式字段指向所属 admission。
- `load-normalized.ts` 当前也没有把 `content.majors` 传给 `upsertAdmissionBundle`。

影响：

- 即便 parser 解析出专业线，当前也无法稳定挂到 `AdmissionRecord`。
- “专业线补齐”会变成只有中间文件、没有数据库成果。

#### 3. 报告层还无法表达“有专业线 / 只有专业组线 / 只有位次”

文件：`scripts/data/generate-coverage-report.ts`

现状：

- 当前 coverage 主要统计来源和 admission 数量。
- 没有单独表达 `majorImportedCount`、`crossValidated`、`rankOnly`、`declaredGaps`。

影响：

- 无法区分“已经有专业线”与“只是扩了一个省但仍然只有专业组线”。

#### 4. 前台展示链路只部分准备好了

文件：

- `src/app/api/institutions/[id]/route.ts`
- `src/app/api/records/[id]/majors/route.ts`
- `src/app/school/[id]/page.tsx`

现状：

- 项目已经有 majors 单独查询接口。
- 但当前专业线主链路未打通，所以页面无法展示“新接入省份的真实专业线”。

影响：

- 如果只补 parser 不补 loader / report / UI，上线后用户仍然只能看到 group 结果。

### 技术与研究约束

这次计划按两个已加载技能的约束执行：

- `research-guide`：官方来源优先，量化字段必须来自 P0/P1，冲突时保留缺口而不是猜测。
- `writing-plans`：按文件边界拆任务，执行阶段走 TDD，先失败测试再补最小实现。

## Proposed Changes

### 1. 建立通用 parser registry 与专业线关联模型

#### 修改 `src/lib/import/types.ts`

What:

- 为来源注册和标准化结果补足扩省与专业线必需字段。

Why:

- 当前类型定义只够支撑 group 粒度，缺少 major 关联、交叉验证和缺口声明能力。

How:

- 给 `SourceRegistryEntry` 新增：
  - `sourceLevel`
  - `crossCheckUrls`
  - `expectedGranularity`
  - `gapPolicy`
- 给 `NormalizedMajorRecord` 新增：
  - `parentAdmissionRowHash`
  - `province`
  - `year`
- 给 `ParsedSourceDocument` 新增：
  - `gaps`
  - `verificationNotes`

#### 新增 `src/lib/import/parser-registry.ts`

What:

- 新建 parser 注册中心。

Why:

- `parse-sources.ts` 不应继续通过条件分支硬编码省份。

How:

- 导出 `Record<string, ParserHandler>`。
- 首批注册：
  - `guangdong`
  - `jiangsu`
  - `zhejiang`
  - `shandong`
  - `liaoning`
  - `hunan`
- 每个 parser 必须返回统一的 `ParsedSourceDocument`。

### 2. 扩展来源注册表，正式纳入第二批省份

#### 修改 `src/lib/import/source-registry.ts`

What:

- 把浙江、山东、辽宁、湖南加入来源注册表，并补同年交叉验证条目。

Why:

- 当前 registry 只覆盖广东和江苏，无法驱动扩省。

How:

- 新增浙江条目：
  - 普通类第一段平行投档 `xls`
  - 标注 `expectedGranularity = 'major'`
- 新增山东条目：
  - 常规批第 1 次志愿投档表 `xls`
  - 同时注册同年普通类一分一段表来源，用于位次反推分数
- 新增辽宁条目：
  - 本科批历史、物理 `zip`
  - 标注志愿模式为“专业+学校”
- 新增湖南条目：
  - 提前批/平行志愿 `xlsx`
  - 标注为 `group`，不作为 major 主来源

### 3. 为第二批省份分别实现 parser

#### 新增 `src/lib/import/parsers/zhejiang.ts`

What:

- 实现浙江普通类 `xls` parser。

Why:

- 浙江官方来源是当前最适合第一批打通 major 的省份。

How:

- 从表中提取：
  - 学校代码/名称
  - 专业代码/名称
  - 投档分/最低分
  - 位次
- 组装规则：
  - admissions：按院校 + 年份 + 省份 + 批次聚合父记录
  - majors：每个专业一条，`parentAdmissionRowHash` 指向父记录

#### 新增 `src/lib/import/parsers/shandong.ts`

What:

- 实现山东常规批 `xls` parser。

Why:

- 山东官方表格天然按“专业代号及名称 + 院校代号及名称”展开，是专业线高价值来源。

How:

- 先解析：
  - `专业代号及名称`
  - `院校代号及名称`
  - `投档计划数`
  - `最低位次`
- 再调用 `score-rank.ts` 用官方一分一段表把位次换算成 `minScore`。
- 若换算失败：
  - 保留 `majorMinRank`
  - 在 `gaps` 中明确标记，不伪造分数

#### 新增 `src/lib/import/parsers/liaoning.ts`

What:

- 实现辽宁 `zip` 家族 parser。

Why:

- 辽宁能验证“zip -> xls/xlsx -> 专业+学校”这一条新文件族。

How:

- 先做 zip 内文件发现。
- 通过文件名或 sheet 表头区分历史/物理。
- 优先输出 major；如果某文件只能提到院校层，则降级为 `institution` 或 `group`，同时记录 `gaps`。

#### 新增 `src/lib/import/parsers/hunan.ts`

What:

- 实现湖南 `xlsx` parser。

Why:

- 湖南能补“更多省份 + 提前批/平行志愿”覆盖，但不是本轮专业线主来源。

How:

- 解析：
  - 院校
  - 专业组/类别
  - 投档线
  - 科目组合
- 输出以 `group` 为主。

### 4. 新增官方位次转分数工具

#### 新增 `src/lib/import/score-rank.ts`

What:

- 提供官方一分一段表驱动的位次转分数函数。

Why:

- 山东等省公开的是位次优先，不能靠拍脑袋推回分数。

How:

- 输入：
  - 官方一分一段表
  - 目标最低位次
- 输出：
  - 对应 `minScore`
  - `derivedFromOfficialRank = true`
- 若未命中则返回缺口状态，不回填分数。

### 5. 改造解析主流程，使之真正支持 major

#### 修改 `scripts/data/parse-sources.ts`

What:

- 从“写死两个 parser”改成统一 registry 分发。

Why:

- 扩到 6 个以上 parser 时，主流程必须稳定。

How:

- 读取 `parser-registry.ts`。
- 所有 parser 统一返回 `ParsedSourceDocument`。
- zip 解压逻辑抽成独立 helper，避免主流程继续膨胀。

#### 修改 `scripts/data/load-normalized.ts`

What:

- 将 official majors 正式写入数据库。

Why:

- 这是“补专业线来源”是否真的完成的关键节点。

How:

- 读取 `content.majors`。
- 构造 `majorsByRowHash`，键为 `parentAdmissionRowHash`。
- 调用：
  - `upsertAdmissionBundle({ admissions, majorsByRowHash })`
- 同步写回 `ImportJob` 中的 major 统计。

#### 修改 `src/lib/import/upsert.ts`

What:

- 支持 official major 的父子入库。

Why:

- 现有 upsert 逻辑虽然支持 `majorsByRowHash`，但并未围绕 official-major pipeline 完整设计。

How:

- admission upsert 后，用 `parentAdmissionRowHash` 关联所属 major。
- major upsert 继续保持幂等。
- unresolved 数据继续进入 `manual-review.csv`。

### 6. 升级报告层，明确区分“扩省”与“专业线补齐”

#### 修改 `scripts/data/generate-coverage-report.ts`

What:

- 给报告加入专业线、交叉验证和缺口字段。

Why:

- 当前报告不足以支持下一阶段验收。

How:

- 在 `coverage-summary.json` 中增加：
  - `majorImportedCount`
  - `majorSourcePresent`
  - `crossValidated`
  - `rankDerivedFromOfficial`
  - `declaredGaps`

#### 新增 `data/reports/gap-summary.json`

What:

- 汇总所有非致命缺口。

Why:

- research-guide 要求明确声明缺口，不允许无声失败。

How:

- 统一输出状态：
  - `group_only`
  - `major_available`
  - `rank_only_waiting_score_ladder`
  - `header_drift`
  - `unmatched_institution`

### 7. 让前台真正展示专业线成果

#### 修改 `src/app/api/institutions/[id]/route.ts`

What:

- 院校详情接口返回每条 admission 的 `majorsCount`，不再尝试内嵌全量 majors。

Why:

- 扩省后 major 数据量会明显增加，保持懒加载更稳妥。

How:

- `records` 返回：
  - `id`
  - `granularity`
  - `groupCode`
  - `groupRequirement`
  - `sourceUrl`
  - `majorsCount`

#### 修改 `src/app/school/[id]/page.tsx`

What:

- 在院校详情页为新接入的专业线提供展示入口。

Why:

- 如果不改页面，专业线即使入库也不可见。

How:

- 展开行时调用现有 `/api/records/[id]/majors`。
- 对 `major` 粒度或 `majorsCount > 0` 的记录显示“查看专业线”。
- 在 UI 上明确标识：
  - `院校线`
  - `专业组线`
  - `专业线`

#### 修改 `src/app/query/page.tsx`

What:

- 在列表页明确标出专业线可用状态。

Why:

- 用户需要一眼区分“只是扩省了”还是“这个省已经补到专业层”。

How:

- 记录卡片增加：
  - `majorSourcePresent`
  - `granularity`
  - 交叉验证提示

### 8. 为高校专业线适配器留出第二通道

#### 新增 `src/lib/import/parsers/schools/README.md`

What:

- 新建高校专业线适配器约定文档。

Why:

- 学校官网结构分散，必须单独管理，不应混入省级 parser 目录。

How:

- 规定学校适配器目录结构与输出协议：
  - `src/lib/import/parsers/schools/<school-key>.ts`
- 明确只有当学校官网能稳定给出静态 HTML/XLS/JSON 时才接入。
- 第一轮只搭骨架，不要求同时接大量高校。

## Assumptions & Decisions

### 已定决策

1. 这轮不再只做“更多省份”，而是“扩省 + 专业线补齐”一起推进。
2. 省级主优先级固定为：浙江 -> 山东 -> 辽宁 -> 湖南。
3. 真正的专业线主来源优先走省级官方表；高校官网适配器只作为第二通道。
4. 对只有位次没有分数的官方表，允许只落 `majorMinRank`，但禁止虚构 `minScore`。
5. 对只能拿到专业组线的省份，允许接入，但必须明确为 `group`，不能伪装成 `major`。
6. 若学校官网无法稳定抓取或存在访问性差异，这轮只预留学校适配器框架，不强行承诺某校必接。

### 这轮验收口径

- “继续扩到更多省份”最低标准：新增浙江、山东、辽宁、湖南 4 个省份的来源注册与解析实现。
- “专门补专业线来源”最低标准：浙江与山东至少有 1 个批次以 `major` 粒度成功入库，并可从前台或 API 查询到。

## Verification steps

### 数据与解析验证

1. 浙江 parser
   - 用官方 `xls` 样本跑测试。
   - 验证能生成：
     - 至少 1 条 admission
     - 多条 majors
     - majors 都带 `parentAdmissionRowHash`

2. 山东 parser
   - 用常规批官方投档表跑测试。
   - 若已接一分一段表：
     - 验证 `majorMinRank -> minScore` 换算成功
   - 若未接：
     - 验证 `gaps` 正确声明缺口

3. 辽宁 parser
   - 用本科批 `zip` 样本跑测试。
   - 验证 zip 内附件发现、历史/物理识别、行级解析正常。

4. 湖南 parser
   - 用官方 `xlsx` 样本跑测试。
   - 验证能落 `group` 记录并保留类别信息。

### 入库验证

1. 运行完整链路：
   - `import:fetch`
   - `import:parse`
   - `import:load`
   - `import:report`
2. 核查：
   - `AdmissionRecord` 中新增浙江、山东、辽宁、湖南记录
   - `MajorRecord` 中新增浙江、山东 official majors
   - 重复导入无重复数据

### API 与页面验证

1. `/api/records`
   - 能返回新省份记录
   - `granularity` 正确
2. `/api/records/[id]/majors`
   - 对浙江、山东 admission 可返回专业线
3. `/api/institutions/[id]`
   - 返回 `majorsCount`
4. `query` 页和 `school` 页
   - 能清楚区分院校线、专业组线、专业线

### 工程验证

1. 为每个新 parser 先写失败测试再实现。
2. 执行：
   - `npm run lint`
   - `npm run build`
   - parser 相关测试命令
3. 检查输出文件：
   - `data/reports/coverage-summary.json`
   - `data/reports/gap-summary.json`
   - `data/reports/manual-review.csv`

## 执行顺序

1. 先改 `src/lib/import/types.ts`
2. 再建 `src/lib/import/parser-registry.ts`
3. 再扩 `src/lib/import/source-registry.ts`
4. 先实现 `score-rank.ts`
5. 再做浙江、山东 parser
6. 再做辽宁 zip parser
7. 最后做湖南 xlsx parser
8. 接着改 `parse-sources.ts`、`load-normalized.ts`、`upsert.ts`
9. 最后改报告、详情接口和前台展示

只有在“专业线 parent-child 关联”先打通后，才开始把高校专业线适配器接进来。

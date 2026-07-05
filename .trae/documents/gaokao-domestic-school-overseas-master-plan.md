# 国内扩省、高校适配器与海外考试总规划

## Summary

这轮需求不是单一“再加几个省”的续作，而是三条数据线的总设计：

1. 继续补国内更多省份的专业线。
2. 开始接具体高校官网的分专业录取线适配器。
3. 海外考试先做研究与建模，不做全面入库。

当前项目已经有稳定的国内省级 ETL 主链路和部分学校适配器骨架，但三条线如果直接一起往现有结构里塞，会在去重、来源优先级、父子挂载、报告统计、以及数据模型上互相冲突。基于代码现状和官方来源调研，这次应先完成“数据身份与来源分层”的底座升级，再分三段推进：先稳住国内已上传数据的幂等和补专业能力，再做学校官网适配器，最后把海外考试以研究模型形式接入站内。

这份计划遵循两个已加载技能的约束：

- `brainstorming`：先拆范围、先定边界、先形成设计，再进入后续实现。
- `research-guide`：国内与海外来源都以官方为先，无法稳定抓取或需登录/查询的来源不强行纳入 ETL，而是明确记为缺口或人工复核。

## Current State Analysis

### 当前已具备的能力

- `src/lib/import/source-registry.ts` 已覆盖广东、江苏、浙江、山东、辽宁、湖南等国内来源，并且已经出现 `major` 粒度来源。
- `scripts/data/fetch-official-sources.ts`、`parse-sources.ts`、`load-normalized.ts`、`generate-coverage-report.ts` 已形成完整离线导入链路。
- `src/lib/import/parsers/schools/README.md` 已经预留学校官网适配器目录与基本约定。
- 前端和 API 已能展示专业线，并且 `constants.tsx` 已经有 `ib`、`alevel`、`dse` 等考试类别概念。

### 当前最关键的结构性缺口

#### 1. 去重键不够稳定

涉及文件：

- `src/lib/import/upsert.ts`
- `src/app/api/admin/import/csv/route.ts`
- `prisma/schema.prisma`

现状：

- `MajorRecord` 的实际匹配与唯一性仍然依赖 `rawRowHash`。
- 手工补录里 admission/major 的 hash 还混入了 `rowNum` 一类位置型信息。

影响：

- 国内已经上传的数据在“补专业”时，仍有重复插入风险。
- 学校官网适配器如果复用现在的 major upsert，很容易继续产生重复。

#### 2. 来源层级还只真正支持“省级官方导入”

涉及文件：

- `src/lib/import/source-registry.ts`
- `src/lib/import/types.ts`
- `scripts/data/fetch-official-sources.ts`
- `scripts/data/generate-coverage-report.ts`

现状：

- 现有 registry 虽然已经有 `school-official` 类型概念，但真正落地的来源几乎都是省级官方。
- 海外考试没有独立 registry 或 research source 体系。

影响：

- 学校官网适配器没有稳定挂载点。
- 海外考试如果直接并进现有 registry，会把“可入库数据源”和“研究型来源”混为一谈。

#### 3. 学校官网专业线还没有和省级 canonical 记录形成明确关系

涉及文件：

- `src/lib/import/parsers/schools/README.md`
- `src/lib/import/types.ts`
- `src/lib/import/upsert.ts`

现状：

- 项目已经决定学校官网适配器单独管理，但尚未明确“学校官网 major 如何挂到已有 admission”。

影响：

- 如果直接为学校官网再建并行 admission，查询、推荐、对比都会出现重复记录。
- 如果不定义挂载策略，学校官网专业线就只能停在中间文件，无法可靠入库。

#### 4. 海外考试已出现在产品概念层，但后端模型仍是“高考 admission 模型”

涉及文件：

- `src/lib/constants.tsx`
- `prisma/schema.prisma`
- `src/lib/import/types.ts`

现状：

- 前端已有海外考试类别概念。
- 后端核心模型仍强依赖 `province`、`batch`、`subjectGroup`、`minScore/minRank` 等国内高考字段。

影响：

- SAT、ACT、AP、IB、A-Level、DSE 不能直接照搬国内“投档线/录取线”模型。
- 海外考试更适合先拆成“考试框架”和“高校要求”两层。

### 已验证的外部前提

- SAT、AP、ACT 都由考试组织官方管理成绩与送分，但高校如何使用这些成绩属于学校自己的录取政策 [$TRAE_REF](https://satsuite.collegeboard.org/scores)[$TRAE_REF](https://apstudents.collegeboard.org/about-ap-scores)[$TRAE_REF](https://www.act.org/content/act/en/products-and-services/the-act/scores/how-schools-use-the-act.html)。
- IB 官方明确有独立的成绩与 diploma passing criteria，大学录取解释并不等于统一“录取线” [$TRAE_REF](https://ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/)[$TRAE_REF](https://ibo.org/programmes/diploma-programme/assessment-and-exams/getting-results/)。
- Cambridge International 也把“资格认可/大学接受情况”做成单独 recognition 体系，说明海外考试更像“考试体系 + 院校政策”的双层模型 [$TRAE_REF](https://www.cambridgeinternational.org/programmes-and-qualifications/recognition-and-acceptance/)。

## Proposed Changes

### 一、先补数据治理底座，保证国内已上传数据去重并补专业

#### 修改 `src/lib/import/types.ts`

What:

- 补齐跨三条线通用的身份、来源和挂载字段。

Why:

- 现有类型可以跑省级 parser，但不够支撑学校官网补专业和海外考试研究建模。

How:

- 新增 `ExamCategory`，至少覆盖：
  - `gaokao`
  - `sat`
  - `act`
  - `ap`
  - `ib`
  - `alevel`
  - `dse`
- 为 `SourceRegistryEntry` 增加：
  - `sourceId` 或 `sourceKey`
  - `sourceScope: 'ingest' | 'research'`
  - `priority`
  - `schoolKey?`
  - `examCategory`
- 为 `NormalizedAdmissionRecord` 增加：
  - `recordIdentityKey`
  - `examCategory`
  - `isSyntheticParent?`
- 为 `NormalizedMajorRecord` 增加：
  - `majorIdentityKey`
  - `parentAdmissionLocator?`
  - `examCategory`

#### 修改 `prisma/schema.prisma`

What:

- 让 admission 与 major 的稳定 identity 落入数据库，并补来源层级字段。

Why:

- 当前 major 去重依赖 `rawRowHash`，这对“补专业”和“多来源协同”不够稳。

How:

- `SourceDocument` 增加：
  - `sourceLevel`
  - `sourceScope`
  - `examCategory`
  - `schoolKey?`
  - `institutionId?`
- `AdmissionRecord` 增加：
  - `examCategory`
  - `recordIdentityKey`
  - `isSyntheticParent`
- `MajorRecord` 增加：
  - `examCategory`
  - `majorIdentityKey`
  - `sourceLevel`
- 保留 `rawRowHash` 作为审计字段，但不再作为主去重依据。

#### 修改 `src/lib/import/upsert.ts`

What:

- 将 admission/major 的去重逻辑从“依赖原始行哈希”改成“依赖稳定业务 identity”。

Why:

- 这是保证国内已上传数据不重复、且允许后续学校官网补专业的核心。

How:

- admission 优先按 `recordIdentityKey` 命中。
- major 优先按 `majorIdentityKey` 命中。
- 学校官网来源写 major 时，先尝试：
  - `parentAdmissionRowHash`
  - 再 fallback 到 `parentAdmissionLocator`
- 当学校官网只补专业而省级父记录已存在时，只补 major，不生成新的并行 admission。
- 仅当无法命中父 admission 时，允许创建 `isSyntheticParent = true` 的兜底 admission。

#### 修改 `src/app/api/admin/import/csv/route.ts`

What:

- 让手工补录遵循和正式 ETL 相同的身份规则。

Why:

- 如果手工补录继续把 `rowNum` 混进 identity，重复数据会持续长出来。

How:

- 去掉 admission identity 对 `rowNum` 的依赖。
- 去掉 major identity 对位置型 parent hash 的依赖。
- 返回更细的统计口径：
  - `imported`
  - `updated`
  - `supplementedMajors`
  - `dedupedMajors`

#### 修改 `scripts/data/load-normalized.ts`

What:

- 在导入时记录“去重”和“补专业”的真实结果。

Why:

- 只有这样才能证明国内已上传数据确实没有重复、且新专业是补齐而不是重复插入。

How:

- 扩展导入统计：
  - `supplementedMajors`
  - `dedupedMajors`
  - `syntheticParentsCreated`
- 将这些统计写入 `ImportJob` 或导出到报告层。

### 二、继续扩国内更多省份专业线，但按来源形态管理，不再继续把 parser 堆在主流程里

#### 修改 `src/lib/import/source-registry.ts`

What:

- 把 registry 从“平铺的来源列表”升级成带分层属性的 registry。

Why:

- 后续不仅会有更多省，还会有学校官网和海外研究来源；没有统一字段就难管理优先级和范围。

How:

- 每个来源条目统一补：
  - `sourceId`
  - `examCategory`
  - `sourceScope`
  - `priority`
  - `status`
  - `family`
- `family` 示例：
  - `province-major-xls`
  - `province-major-zip`
  - `province-group-pdf`
  - `province-rank-ladder`

#### 修改 `src/lib/import/parser-registry.ts`

What:

- 将 parser registry 拆成“省级 parser registry”和“学校 adapter registry”的双命名空间。

Why:

- 学校官网适配器不能和省级 parser 混在一个平面上长期共存。

How:

- 保留现有省级 parser 注册逻辑。
- 额外预留学校官网 adapter registry 的注册函数或目录入口。

#### 修改 `scripts/data/parse-sources.ts`

What:

- 把主流程拆成 `reader -> parser -> post-processor` 三段。

Why:

- 继续把省级条件分支、梯表处理、zip 解压和学校适配器都堆在这个文件里，后续维护成本会急剧上升。

How:

- `reader` 负责按 `sourceType` 读出 `RawSourceRow[]`。
- `parser` 只按 `parserKey` 产出 `ParsedSourceDocument`。
- `post-processor` 负责：
  - 梯表回填
  - parent locator 补全
  - 来源优先级整理

### 三、正式开启具体高校官网“分专业录取线适配器”

#### 修改 `src/lib/import/parsers/schools/README.md`

What:

- 从目录约定文档升级为可落地的接口契约。

Why:

- 现在 README 只说明“能做什么”，还没有明确“怎么挂到已有 admission”。

How:

- 增加：
  - `SchoolSourceRegistryEntry` 建议结构
  - `parentAdmissionLocator` 规范
  - 支持的来源类型边界：
    - 静态 HTML
    - 直接文件下载
    - 公开 JSON
  - 不支持的来源：
    - 验证码型
    - 登录型
    - 只能在线单次查询、无法稳定抓取的页面

#### 新增 `src/lib/import/school-source-registry.ts`

What:

- 单独管理学校官网来源。

Why:

- 学校官网来源和省级官方来源不是一个生命周期，也不该共用一份平铺 registry。

How:

- 为每个学校来源登记：
  - `schoolKey`
  - `institutionId` 或 institution mapping 规则
  - 来源 URL
  - 来源类型
  - 对应 adapter key
  - 来源优先级

#### 新增 `src/lib/import/parsers/schools/index.ts`

What:

- 注册学校官网 adapter。

Why:

- 让后续每个高校适配器都是一个清晰的单元，而不是临时在主流程中硬编码。

How:

- 暴露 `getSchoolAdapterByKey()` 之类的方法。
- 每个 adapter 输出统一的 `ParsedSourceDocument`。

#### 修改 `scripts/data/fetch-official-sources.ts`

What:

- 支持学校官网静态页面或附件抓取。

Why:

- 学校官网不一定是单一文件下载，需要对静态 HTML 页面做快照式抓取。

How:

- 在不引入交互登录的前提下，支持：
  - 直接下载文件
  - 拉取静态 HTML 快照
- 查询型、验证码型页面不纳入 ETL，只记录到 review。

### 四、海外考试先做研究与建模，不直接并入高考 admission 主链路

#### 新增 `src/lib/import/overseas/types.ts`

What:

- 建立海外考试研究模型类型。

Why:

- 海外考试是“考试体系 + 高校要求”的双层结构，不能直接照搬国内投档线模型。

How:

- 定义：
  - `ExamFramework`
  - `ScoreMode`
  - `SubjectRequirementMode`
  - `OfficialSourceFeasibility`
  - `RequirementTemplate`

#### 新增 `src/lib/import/overseas/registry.ts`

What:

- 维护海外考试研究来源。

Why:

- 海外这一轮只做研究与建模，来源管理应与 ETL ingestion registry 分离。

How:

- 第一批仅纳入：
  - `SAT`
  - `ACT`
  - `AP`
  - `IB`
  - `A-Level`
  - `DSE`
- 为每类考试记录：
  - 官方组织来源
  - 成绩表达方式
  - 大学使用方式
  - 是否适合后续自动化抓取

#### 建议修改 `prisma/schema.prisma`

What:

- 为海外研究结果预留专门表，而不是直接塞进 `AdmissionRecord`。

Why:

- 现有 admission 表结构强依赖国内高考字段，不适合先期承载海外考试研究结果。

How:

- 新增研究型表，例如：
  - `ExamFramework`
  - `ExamRequirementTemplate`
  - `ResearchSourceDocument`
- 这批表只承担研究与展示，不进入现有省级 `load-normalized` 主链路。

#### 修改 `src/lib/constants.tsx`

What:

- 将现有海外考试配置从“唯一来源”降为“展示层兜底配置”。

Why:

- 真正的考试类别元数据应逐步来自后端 research model，而不是长期只靠前端硬编码。

How:

- 保留前端枚举供页面使用。
- 在后续接口准备好后，由后端 research data 驱动页面内容。

### 五、升级报告层，让三条线都可验收

#### 修改 `scripts/data/generate-coverage-report.ts`

What:

- 报告不再只统计“导入了多少”，而是同时统计“补了多少”“去重了多少”“学校官网补了多少”“海外研究做到哪一步”。

Why:

- 三条线一起推进时，必须能在报告层分辨来源、补齐效果和未完成项。

How:

- 给覆盖报告增加：
  - `sourceLevel`
  - `examCategory`
  - `schoolAdapterUsed`
  - `supplementedMajorCount`
  - `dedupedMajorCount`
  - `syntheticParentCount`
  - `researchStatus`

#### 修改 `data/reports/gap-summary.json` 的生成逻辑

What:

- 统一三条线的缺口表达。

Why:

- 让后续验收知道是“技术未做”还是“来源本身不可稳定抓取”。

How:

- 补充 gap 类型：
  - `school_adapter_pending`
  - `parent_admission_missing`
  - `duplicate_major_merged`
  - `overseas_research_manual_only`

## Assumptions & Decisions

1. 这次规划覆盖三条线，但不是三条线同时平推实现；实现顺序固定为：国内治理底座 -> 国内扩省 -> 学校适配器 -> 海外研究建模。
2. 国内已上传数据库的数据必须以稳定业务 identity 去重，`rawRowHash` 只保留为审计字段。
3. 学校官网适配器默认只给已有省级 admission 补 `major`，不默认生成并行 admission。
4. 只有当找不到父 admission 时，才允许创建 `synthetic parent admission`。
5. 海外考试这轮只做研究与建模，不做全面入库；尤其不直接塞进现有 `AdmissionRecord` 主链路。
6. 海外考试模型必须拆成“考试框架”和“高校要求”两层，因为官方成绩体系和大学录取政策属于不同来源主体 [$TRAE_REF](https://satsuite.collegeboard.org/scores)[$TRAE_REF](https://apstudents.collegeboard.org/about-ap-scores)[$TRAE_REF](https://ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/)[$TRAE_REF](https://www.cambridgeinternational.org/programmes-and-qualifications/recognition-and-acceptance/)[$TRAE_REF](https://www.act.org/content/act/en/products-and-services/the-act/scores/how-schools-use-the-act.html)。
7. 对需登录、验证码或查询交互的学校官网与海外来源，不强行纳入自动 ETL，而是明确列入 review 或研究状态。

## Verification steps

### 代码与模型验证

1. 检查 `types.ts`、`schema.prisma`、`upsert.ts` 是否已经形成稳定的：
   - `recordIdentityKey`
   - `majorIdentityKey`
   - `parentAdmissionLocator`
   - `examCategory`
2. 确认 major 去重逻辑不再依赖 `rawRowHash` 或 `rowNum`。

### 国内数据验证

1. 对现有国内来源重复跑一次完整导入链路。
2. 验证：
   - admission 不重复增长
   - 相同 major 不重复插入
   - 新补专业只增加 `supplementedMajors`
3. 检查手工补录同一批数据再次导入后，结果应表现为更新/去重，而不是重复新增。

### 学校适配器验证

1. 选择一个稳定高校官网样板源。
2. 验证 adapter 是否能：
   - 产出 majors
   - 正确定位 parent admission
   - 在父记录存在时只补 major
   - 在父记录缺失时创建 synthetic parent 并明确标记

### 海外研究验证

1. 对 `SAT`、`ACT`、`AP`、`IB`、`A-Level`、`DSE` 六类考试逐项验证：
   - 是否有官方来源
   - 成绩表达方式是否明确
   - 高校要求是否属于单独政策层
   - 是否适合自动抓取
2. 确认海外数据未污染现有 `AdmissionRecord` 国内主链路。

### 报告验证

1. 覆盖报告中应能区分：
   - 省级官方
   - 学校官网
   - 手工补录
   - 海外研究来源
2. 缺口报告中应能区分：
   - 来源不可抓取
   - 父 admission 未命中
   - 数据已去重合并
   - 海外仅完成研究未入库

### 工程验证

1. 对所有导入与 adapter 相关新增逻辑先写测试，再实现。
2. 至少执行：
   - 相关单元测试
   - `npm run lint`
   - `npm run build`
3. 确保新计划没有要求对验证码型、登录型或查询型来源做违规自动抓取。

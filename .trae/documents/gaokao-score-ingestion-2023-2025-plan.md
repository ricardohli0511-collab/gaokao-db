# 2023-2025 高考分数线入库实施计划

## Summary

目标是在现有 `Next.js 16 + Prisma + SQLite/libSQL` 项目中，补齐一套可追溯、可扩展的官方数据采集与入库链路，把 `2023`、`2024`、`2025` 三年普通高考录取数据尽量按全国范围接入数据库。实现时不再依赖单次 CSV 上传，而是改为“来源注册 -> 原始文件落盘 -> 解析标准化 -> 批量 upsert -> 质量报告 -> 前台查询适配”的离线 ETL 主链路。

核心决策有三点：

1. 以省级教育考试院公开的 `PDF/XLS/XLSX/HTML/ZIP` 为录取线主来源，阳光高考只作为院校主数据和政策底座。
2. 数据库必须明确区分 `院校线`、`院校专业组线`、`专业线` 三种粒度，不能把专业组线误当专业线。
3. “全国尽量全量”按统一架构扩省，不按一次性脚本硬抓；先把通用模型、来源溯源、去重规则、广东/江苏两类解析器跑通，再复用到其他省份。

## Current State Analysis

### 项目现状

- `package.json` 显示当前栈为 `next@16.2.9`、`react@19.2.4`、`prisma@7.8.0`、`xlsx`，当前没有任何数据抓取或批处理脚本。
- `prisma/schema.prisma` 目前只有 `Institution`、`AdmissionRecord`、`MajorRecord`、`AdminUser` 四个模型，适合手工维护，不适合承接全国三年官方数据。
- `src/app/api/admin/import/csv/route.ts` 已支持 CSV/XLSX 上传导入，但逻辑是“读表格即写库”，且按院校名 `findFirst`、专业记录直接 `create`，重复导入会累积脏数据。
- `src/lib/constants.tsx` 中 `SUBJECT_GROUPS`、`BATCHES`、`ADMISSION_TYPES` 大量写死，无法覆盖全国不同省份、不同年份、不同专业组口径。
- `src/app/api/institutions/[id]/route.ts` 会把某院校所有录取记录及其所有专业一次性全部返回；当全国数据入库后，这个接口会过重。

### 数据模型缺口

当前模型缺少以下能力：

- 来源文档溯源：没有文档表、下载哈希、页码、工作表、行号、解析器版本。
- 院校别名/外部映射：没有“院校代码优先 + 名称归一化 + 别名映射”机制。
- 专业组表达：没有 `groupCode`、`groupRequirement`、`programVariant`、`campusName` 等字段。
- 唯一键与索引：没有面向全国数据的复合唯一键和查询索引。
- 导入批次和质量报告：没有导入作业、覆盖率统计、人工复核清单。

### 已验证的外部来源事实

- 阳光高考/阳光志愿页面明确提供全国院校库、专业库和地方政策入口，适合做院校主数据底座，而不是全国录取线主源。[$TRAE_REF](https://gaokao.chsi.com.cn/zyck/)
- 广东省教育考试院 `2025` 本科普通类（物理）投档 PDF 可直接提取出 `院校代码 / 院校名称 / 专业组代码 / 计划数 / 投档人数 / 投档最低分 / 投档最低排位` 等结构化字段，说明广东适合作为“专业组线”解析器样板。[$TRAE_REF](https://eea.gd.gov.cn/attachment/0/585/585886/4746786.pdf)
- 江苏省教育考试院 `2025` 普通类本科批次投档 PDF 可直接提取 `院校、专业组（再选科目要求）` 以及投档最低分和同分排序项，说明江苏适合作为“专业组 + 再选要求”解析器样板。[$TRAE_REF](https://www.jseea.cn/webfile/upload/2025/07-18/09-33-5302461102655621.pdf)
- 浙江等省公开的是“高校+专业”或“平行投档分数线”口径，不同省份的公开粒度并不一致，因此“全国专业线全量”不能作为默认前提，系统必须保存粒度标签。[$TRAE_REF](https://www.zjzs.net/art/2025/7/21/art_45_11467.html)[$TRAE_REF](https://jyt.zj.gov.cn/art/2025/7/22/art_1532836_58944135.html)

## Proposed Changes

### 1. 扩展数据库模型与约束

#### 修改 `prisma/schema.prisma`

What:

- 扩展 `Institution`。
- 扩展 `AdmissionRecord`。
- 扩展 `MajorRecord`。
- 新增来源、别名、导入批次相关模型。

Why:

- 现有模型无法表达官方来源差异、院校专业组、名称归一和可追溯导入。

How:

- 为 `Institution` 增加标准化字段：`code` 唯一化、`normalizedName`、`level`、`ownership`、`website`、`sourceUpdatedAt`。
- 新增 `InstitutionAlias`：保存 `aliasName`、`institutionCode`、`sourceName`、`sourceUrl`，用于“代码优先，名称兜底”匹配。
- 新增 `SourceDocument`：保存 `province`、`year`、`sourceType`、`granularity`、`title`、`officialUrl`、`localPath`、`sha256`、`parserKey`、`parserVersion`、`fetchedAt`。
- 新增 `ImportJob`：保存导入状态、输入文档数、解析成功数、入库成功数、失败数、报告路径。
- 为 `AdmissionRecord` 增加：
  - `granularity`，值限定为 `institution | group`
  - `institutionCode`
  - `groupCode`
  - `groupName`
  - `groupRequirement`
  - `programVariant`
  - `campusName`
  - `planCount`
  - `admittedCount`
  - `sourceDocumentId`
  - `sourceUrl`
  - `rawInstitutionName`
  - `rawRowHash`
- 为 `MajorRecord` 增加：
  - `majorRequirement`
  - `majorMinRank`
  - `planCount`
  - `sourceDocumentId`
  - `sourceUrl`
  - `rawRowHash`
- 增加复合唯一键与索引：
  - `Institution.code`
  - `AdmissionRecord(year, province, subjectGroup, batch, admissionType, institutionId, groupCode, programVariant, campusName, granularity)`
  - `MajorRecord(admissionRecordId, majorCode, majorName, rawRowHash)`
  - 面向查询页的 `(province, year, subjectGroup, batch, minScore)` 索引

### 2. 新建离线 ETL 目录与统一导入库

#### 新增 `scripts/data/*`

What:

- 新增抓取、解析、入库、报表四类脚本。

Why:

- 全国三年数据不应通过 HTTP 请求或后台上传页直接处理，必须走可重跑、可追踪的离线管线。

How:

- 新增 `scripts/data/fetch-official-sources.ts`
  - 按来源注册表下载官方文档
  - 计算 `sha256`
  - 将原始文件保存到 `data/raw/<province>/<year>/`
- 新增 `scripts/data/parse-sources.ts`
  - 扫描 `SourceDocument`
  - 调用不同解析器输出统一 JSON
  - 将标准化结果写入 `data/normalized/`
- 新增 `scripts/data/load-normalized.ts`
  - 以批量事务方式 upsert `Institution / AdmissionRecord / MajorRecord`
  - 写回 `ImportJob`
- 新增 `scripts/data/generate-coverage-report.ts`
  - 生成 `coverage-summary.json`
  - 输出 `unmatched-institutions.csv`、`manual-review.csv`

#### 新增 `src/lib/import/*`

What:

- 把解析、标准化、匹配、upsert、校验逻辑集中到可复用库。

Why:

- 现有 `src/app/api/admin/import/csv/route.ts` 逻辑耦合在 Route Handler 里，无法被脚本与后台同时复用。

How:

- 新增 `src/lib/import/types.ts`
  - 定义 `RawSourceRow`、`NormalizedAdmissionRecord`、`NormalizedMajorRecord`、`Granularity`、`SourceLevel`
- 新增 `src/lib/import/source-registry.ts`
  - 维护省份、年份、来源 URL、文档类型、预期粒度、解析器 key
- 新增 `src/lib/import/normalize.ts`
  - 做字段标准化、院校名称拆解、数字清洗、批次与选科映射
- 新增 `src/lib/import/match-institution.ts`
  - 代码优先匹配院校，其次别名映射，最后人工复核
- 新增 `src/lib/import/upsert.ts`
  - 统一 Prisma `upsert` 和分批事务
- 新增 `src/lib/import/validators.ts`
  - 校验分数、位次、计划数、重复行和异常值

### 3. 实现首批解析器并固化省份扩展模板

#### 新增 `src/lib/import/parsers/guangdong.ts`

What:

- 解析广东 `2023/2024/2025` 公开附件。

Why:

- 广东官方文档结构清晰，适合作为首批“PDF/ZIP 家族”模板。

How:

- 支持 `2023/2024` ZIP 解压后文件扫描。
- 支持 `2025` PDF 文本解析。
- 标准输出字段：
  - `year`
  - `province = 广东`
  - `subjectGroup = 历史/物理`
  - `batch = 本科批`
  - `institutionCode`
  - `rawInstitutionName`
  - `groupCode`
  - `planCount`
  - `admittedCount`
  - `minScore`
  - `minRank`
  - `granularity = group`

#### 新增 `src/lib/import/parsers/jiangsu.ts`

What:

- 解析江苏 `2023/2024/2025` 的 `XLS/PDF`。

Why:

- 江苏文档含“专业组（再选科目要求）”，能验证系统是否真正支持专业组层表达。

How:

- `2023/2024` 优先按 XLS 表头解析。
- `2025` 按 PDF 文本块解析。
- 从 `院校、专业组(再选科目要求)` 中拆出：
  - `institutionCode`
  - `groupCode`
  - `groupRequirement`
  - `programVariant`
  - `campusName`
  - 同分排序项原始字段放入扩展 JSON 字段或原始层

#### 新增 `src/lib/import/parsers/chsi-institutions.ts`

What:

- 从阳光高考补齐院校基础信息。

Why:

- 解决省级投档线“只有代码/变体名称，没有标准院校实体”的匹配问题。

How:

- 采集院校名称、主管部门、所在地、层次、官网、章程链接。
- 首次导入时生成 `Institution` 和 `InstitutionAlias` 基础映射。
- 若阳光高考无法提供某字段，允许保留空值，不阻塞录取线入库。

### 4. 重构后台导入页和导入接口角色

#### 修改 `src/app/api/admin/import/csv/route.ts`

What:

- 从“主导入引擎”改成“小批量补录入口”。

Why:

- 大规模官方数据入库应由离线脚本负责，但人工修正和少量补录仍然需要后台入口。

How:

- 改为复用 `src/lib/import/normalize.ts` 与 `src/lib/import/upsert.ts`。
- `Institution` 匹配改成“代码 -> 别名 -> 名称兜底”。
- `MajorRecord` 改 `create` 为 `upsert`。
- 导入结果增加“新增/更新/跳过/待人工复核”四类统计。

#### 修改 `src/app/admin/import/page.tsx`

What:

- 调整后台导入页的信息架构。

Why:

- 当前页面只适合拖文件导入，无法体现 ETL 作业状态、覆盖率和错误清单。

How:

- 保留上传区，但文案明确为“手工补录/修正”。
- 新增“官方抓取批次”“覆盖率报告”“待人工复核下载”三个区块。
- 加入最近 `ImportJob` 列表和报告链接。

### 5. 改造查询 API 以支持全国数据与粒度差异

#### 修改 `src/app/api/records/route.ts`

What:

- 支持更细的动态过滤和粒度感知返回。

Why:

- 当前接口假设数据量小、字段固定，只适合单省简化查询。

How:

- 新增过滤参数：
  - `granularity`
  - `groupCode`
  - `groupRequirement`
  - `programVariant`
  - `hasMajors`
- 排序默认从“仅按分数降序”改成“同上下文下支持分数/位次/年份”。
- 响应增加 `sourceLabel`、`sourceUrl`、`granularity`、`groupCode`、`groupRequirement`。
- 查询语义始终基于 `province + year + subjectGroup + batch` 上下文，不允许“全国混排后直接推荐”。

#### 新增 `src/app/api/facets/route.ts`

What:

- 提供动态筛选项接口。

Why:

- `src/lib/constants.tsx` 的硬编码集合无法反映全国真实数据状态。

How:

- 根据当前 `province/year/examCategory` 返回可用：
  - `subjectGroups`
  - `batches`
  - `admissionTypes`
  - `groupRequirements`
  - `granularities`
  - `hasMajors`

#### 修改 `src/app/api/institutions/[id]/route.ts`

What:

- 把“全量院校详情”改成“上下文化详情”。

Why:

- 当前接口对全国数据会过重，且混合不同省份、年份和粒度。

How:

- 新增查询参数：`province`、`year`、`subjectGroup`、`page`。
- 顶层仅返回院校基础信息与当前上下文统计。
- 录取记录分页返回。
- 专业线改走单独接口。

#### 新增 `src/app/api/records/[id]/majors/route.ts`

What:

- 单独按录取记录拉取专业线。

Why:

- 专业线是最大的数据量热点，必须懒加载。

How:

- 支持分页、按专业名搜索、按最低分排序。
- 返回 `sourceUrl` 和 `granularity = major`。

### 6. 调整前台查询与院校详情页

#### 修改 `src/lib/constants.tsx`

What:

- 将硬编码枚举降为默认兜底，而非唯一来源。

Why:

- 全国项目需要“数据驱动筛选项”。

How:

- 保留已有 `EXAM_CATEGORIES` 用于高层分类。
- `SUBJECT_GROUPS`、`BATCHES` 仅作为无数据或首屏兜底值。
- 新增粒度标签和来源标签展示辅助方法。

#### 修改 `src/app/query/page.tsx`

What:

- 重构筛选和列表展示逻辑。

Why:

- 现在页面依赖固定选项，且会在结果页继续拉重详情，不适合全国数据规模。

How:

- 页面初始化先拉 `facets`，再拉记录。
- 列表卡片展示：
  - `年份 / 省份 / 选科 / 批次`
  - `院校线 / 专业组线 / 专业线` 粒度标签
  - `groupCode / groupRequirement`
  - 来源标识
- 删除对列表中每条记录的额外详情预抓取逻辑。
- 比较和推荐只在完整上下文下可用。

#### 修改 `src/app/school/[id]/page.tsx`

What:

- 让院校详情与查询上下文对齐。

Why:

- 当前页面把院校的所有记录和所有专业一起展示，后续会过慢且结论混杂。

How:

- 增加“省份 / 年份 / 选科 / 批次”切换。
- 录取记录按上下文分页。
- 展示趋势时仅对同省同类记录作图。
- 点击展开时再请求 `/api/records/[id]/majors`。

### 7. 修正推荐与对比逻辑

#### 修改 `src/app/api/recommend/route.ts`

What:

- 让推荐接口基于明确上下文。

Why:

- 全国数据下，“最新记录”不再等于“最相关记录”。

How:

- 强制要求 `province`、`year`、`subjectGroup`、`batch`。
- 仅在 `普通高考 -> 普通类` 条件下使用录取线推荐。
- 若只有专业组线而无专业线，推荐结果显示当前粒度并提示来源。

#### 修改 `src/app/api/compare/route.ts`

What:

- 改成同口径记录比较。

Why:

- 当前比较若混省、混年、混粒度，会给出错误结论。

How:

- 限制比较集合必须共享 `province/year/subjectGroup/batch/granularity`。
- 不满足时直接返回可理解错误，而非默认回退。

## Assumptions & Decisions

### 已定口径

- 目标考试类型固定为 `普通高考录取线`，不覆盖考研、IB、A-Level、DSE。
- 用户要求是 `2023/2024/2025` 三年。
- 用户希望范围做到“全国尽量全量”。
- 用户希望支持 `院校 + 专业` 粒度，但真实官方来源不一定都能提供专业线。

### 为避免后续再做选择，这里直接定下的实现决策

1. 第一版统一只采普通类主数据，不把艺体类、强基、综评、保送纳入主链路。
2. 若某省只公开院校线或专业组线，则照常入库，但必须保存 `granularity`，并在前台按真实粒度展示。
3. 院校实体按“标准校名”建模；`中外合作办学`、`联合培养`、`分校区` 默认作为记录级属性，不默认新建院校。
4. 官方来源优先级固定为：
   - 省级教育考试院 / 招生考试机构
   - 教育部阳光高考
   - 高校本科招生网
   - 后台人工补录
5. 主链路使用离线 ETL；后台上传页只做补录和纠错。
6. 继续保留当前 `SQLite/libSQL`，但通过索引、事务和分层接口先解决可用性，不在这次任务里强行切换数据库产品。
7. 省份扩展顺序固定为：
   - 先实现共性架构
   - 先打通广东、江苏
   - 再按来源形态相似度扩展浙江等其他省份

### 需要执行阶段坚持的约束

- 修改任何 `Next.js 16` 路由或数据接口前，先补读 `node_modules/next/dist/docs/` 中相关 Route Handler 文档，再动实现。
- 不允许把 PDF/XLS 解析逻辑直接塞进页面组件或 Route Handler。
- 不允许将专业组线自动推断成专业线。
- 不允许静默吞掉解析失败的行；所有失败都要进入报告或复核清单。

## Verification Steps

执行阶段完成后，按以下顺序验证：

1. 数据库验证
   - 生成并应用 Prisma migration。
   - 确认新模型、唯一键、索引存在。
   - 用测试数据验证重复导入不会重复插入相同 `AdmissionRecord` 和 `MajorRecord`。

2. 解析器验证
   - 用广东 `2025` PDF 样本跑解析，确认能提取 `院校代码 / 专业组代码 / 最低分 / 最低排位`。
   - 用江苏 `2025` PDF 样本跑解析，确认能提取 `专业组(再选科目要求)`。
   - 用广东或江苏旧年份 `XLS/ZIP` 样本跑解析，确认 parser registry 能按来源类型分流。

3. 标准化与匹配验证
   - 检查院校代码可直接匹配到 `Institution`。
   - 检查带 `中外合作办学`、`联合培养`、`校区` 的记录不会错误新建院校。
   - 检查解析失败和未匹配院校会进入 `manual-review.csv`。

4. API 验证
   - `src/app/api/records/route.ts` 能按 `province/year/subjectGroup/batch/granularity` 正确过滤。
   - `src/app/api/facets/route.ts` 返回的筛选项与数据库内真实数据一致。
   - `src/app/api/institutions/[id]/route.ts` 在指定上下文下不再全量返回所有专业。
   - `src/app/api/records/[id]/majors/route.ts` 支持懒加载和分页。

5. 页面验证
   - `src/app/query/page.tsx` 能显示粒度、专业组信息和来源标签。
   - `src/app/school/[id]/page.tsx` 在省份/年份切换后只显示对应上下文的数据。
   - 推荐与比较功能在上下文不完整时明确提示，而不是给出混杂结果。

6. 质量报告验证
   - 成功输出 `coverage-summary.json`、`unmatched-institutions.csv`、`manual-review.csv`。
   - 报告中能按 `province-year` 统计覆盖率和数据粒度。

7. 工程验证
   - 运行 `npm run lint`
   - 运行 `npm run build`
   - 至少使用一个广东样本和一个江苏样本完成端到端导入演练

## 执行顺序

为避免返工，执行时严格按下面顺序推进：

1. 先改 `prisma/schema.prisma` 和迁移。
2. 再建 `src/lib/import/*` 统一库。
3. 再建 `scripts/data/*` 离线管线。
4. 再实现广东、江苏解析器并跑通样本。
5. 再重构后台导入页与导入接口。
6. 再改查询 API、详情 API、facets API。
7. 最后改查询页、院校详情页、推荐、比较。

只有当前一步验证通过，才进入下一步。

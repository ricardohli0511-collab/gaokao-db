# 继续推进国内省级专业线与学校补齐计划

## Summary

这轮目标不是泛泛地“再加几个省”，而是把国内数据继续沿两条线同步往前推：

1. 继续补更多省级官方专业线来源。
2. 推进“学校官网补齐专业线”这条第二通道。

基于当前仓库结构和官方来源调研，这轮最优先的组合不是随便扩一批省，而是：

- 省级专业线优先接 `贵州`
- 省级父记录/交叉验证优先接 `陕西`
- 学校官网样板优先推进 `北京理工大学`
- 学校官网候选优先纳入 `南京大学`

这样做的原因是：

- 贵州已经有官方 PDF 直接给到“院校代码 + 专业代码 + 专业名称 + 最低分 + 最低位次”，最适合新增一个 `major + pdf` 家族 [$TRAE_REF](http://zsksy.guizhou.gov.cn/ygpt/tdqk/202507/P020250719501527579567.pdf)。
- 陕西当前公开的更稳定的是院校级历年投档统计表，更适合作为“父 admission + 学校挂载底座 + 交叉验证”，不应误报成专业线 [$TRAE_REF](https://www.sneac.com/zt/xgkxsfwpt/lnsj.htm)[$TRAE_REF](https://www.sneac.com/htm/2023/2023YBZS-LG.html)[$TRAE_REF](https://www.sneac.com/htm/2024/1BZS-LG.html)。
- 学校侧目前已有 `BIT` 样板骨架，但还只是首页/占位态，需要从真实“历年分数”页验证开始推进 [$TRAE_REF](https://admission.bit.edu.cn/html/1/m/168/172/index.html)。
- `南京大学` 有官方信息公开入口和静态历史分数页，适合作为第二个学校候选，但是否能稳定拿全量结果仍需先做可抓取性验证 [$TRAE_REF](https://xxgk.nju.edu.cn/15509/list.htm)[$TRAE_REF](https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html)。

这份计划遵循 `research-guide` 的约束：

- 优先使用官方来源
- 对来源做交叉验证
- 对抓取不稳定、默认页不全、需要额外筛选或查询的页面明确声明缺口，而不是默默当作已完成

## Current State Analysis

### 当前已具备的能力

- `src/lib/import/source-registry.ts` 已接广东、江苏、浙江、山东、辽宁、湖南，且已经有 `major` 粒度来源。
- `scripts/data/fetch-official-sources.ts`、`parse-sources.ts`、`load-normalized.ts`、`generate-coverage-report.ts` 已形成省级 ETL 主链路。
- `src/lib/import/school-source-registry.ts`、`src/lib/import/parsers/schools/index.ts`、`src/lib/import/parsers/schools/README.md` 已有学校适配器入口和规范。
- `upsert.ts` 已具备：
  - `majorIdentityKey`
  - `parentAdmissionLocator`
  - `supplementedMajors`
  - `dedupedMajors`
  这些学校补齐所需的关键能力。

### 当前最关键的缺口

#### 1. 省级 family 表达不够准确

涉及文件：

- `src/lib/import/source-registry.ts`

现状：

- 当前 family 推导会把大多数 `major` 来源统一归到 `province-major-xls`。
- 这对贵州这类 `major + pdf` 来源不准确。

影响：

- 新增省级来源后，reader/parser/report 很难准确识别来源家族。

#### 2. 学校来源 registry 过粗

涉及文件：

- `src/lib/import/school-source-registry.ts`

现状：

- 当前只有：
  - `schoolKey`
  - `institutionName`
  - `adapterKey`
  - `sourceType`
  - `officialUrl`
  - `priority`
- 没有：
  - `status`
  - `pageMode`
  - `coverageYears`
  - `coverageProvinces`
  - `crossCheckUrls`

影响：

- 无法表达“已接入样板”和“已验证可稳定补齐”的区别。
- 无法把学校候选来源纳入规范的推进流程。

#### 3. 学校 HTML 目前仍以整页快照为主

涉及文件：

- `scripts/data/parse-sources.ts`
- `src/lib/import/parsers/schools/bit-undergrad-html.ts`

现状：

- HTML 来源目前只会把整页快照作为 `RawSourceRow` 交给 adapter。
- BIT adapter 仍是 `school_adapter_pending` 占位实现。

影响：

- 学校样板已经“接通入口”，但还没有真正产出 majors。
- 缺少“学校页面默认态是否全量”“是否需要筛选枚举”的显式判断。

#### 4. 报告层还不能清楚区分“省级原生 major”和“学校补齐 major”

涉及文件：

- `scripts/data/load-normalized.ts`
- `scripts/data/generate-coverage-report.ts`

现状：

- loader 已有 `supplementedMajors` 和 `dedupedMajors` 统计。
- 但这些统计还没有完整结构化进入最终报告输出。

影响：

- 后续即使学校补齐开始生效，coverage 也很难准确说明效果。

### 已验证的外部依据

- 贵州省官方 PDF 已直接给出专业级投档信息，字段粒度足以生成 `major` 记录 [$TRAE_REF](http://zsksy.guizhou.gov.cn/ygpt/tdqk/202507/P020250719501527579567.pdf)。
- 陕西官方历年数据页与 2023/2024 静态投档表更适合院校级 parent source，而不是专业线 [$TRAE_REF](https://www.sneac.com/zt/xgkxsfwpt/lnsj.htm)[$TRAE_REF](https://www.sneac.com/htm/2023/2023YBZS-LG.html)[$TRAE_REF](https://www.sneac.com/htm/2024/1BZS-LG.html)。
- 南京大学与北京理工大学都存在官方历史分数或招生静态页，但当前默认抓取结果并不能直接证明“全量可稳定导入”，因此必须保留验证步骤和缺口声明 [$TRAE_REF](https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html)[$TRAE_REF](https://admission.bit.edu.cn/html/1/m/168/172/index.html)。

## Proposed Changes

### 一、继续扩省：新增贵州专业线与陕西父记录源

#### 修改 `src/lib/import/source-registry.ts`

What:

- 新增贵州与陕西条目，并修正省级 family 的表达能力。

Why:

- 这轮省级扩容不能只按“省份个数”推进，而要按“来源家族是否值得接”推进。

How:

- 为 `贵州` 新增条目：
  - `sourceLevel: 'province-official'`
  - `granularity: 'major'`
  - `sourceType: 'pdf'`
  - `family: 'province-major-pdf'`
  - `expectedGranularity: 'major'`
  - `crossCheckUrls` 指向投档情况栏目页
- 为 `陕西` 新增条目：
  - `sourceLevel: 'province-official'`
  - `granularity: 'institution'`
  - `sourceType: 'html'`
  - `family: 'province-institution-html'`
  - `expectedGranularity: 'institution'`
  - `gapPolicy: 'institution_only_waiting_school_majors'`
  - `crossCheckUrls` 指向历年数据总入口和正文页
- 调整 family 推导逻辑：
  - `major + pdf` 不再落到 `province-major-xls`
  - `institution + html` 不再落到泛化 `province-general`

#### 修改 `scripts/data/parse-sources.ts`

What:

- 为贵州和陕西补对应的 reader/parser 分支。

Why:

- 只有把 reader family 真正补出来，新的省级来源才能稳定进入主链路。

How:

- 新增 `贵州` 的 `province-major-pdf` 解析流程：
  - 从 PDF 文本中提取：
    - 院校代码
    - 院校名称
    - 专业代码
    - 专业名称
    - 招考类型
    - 投档最低分
    - 投档最低位次
  - 输出：
    - admission：按院校聚合
    - majors：逐专业输出
  - 对跨页断裂、列错位、专业名换行写入 `gaps`
- 新增 `陕西` 的 `province-institution-html` 解析流程：
  - 从静态 HTML 表中提取：
    - 院校名
    - 最低分
    - 批次/科类
  - 输出 `institution` granularity admission
  - 不伪造 majors
  - 明确在 `gaps` 中标记 `institution_only_waiting_school_majors`

#### 新增 `src/lib/import/parsers/guizhou.ts`

What:

- 新建贵州专业线 parser。

Why:

- 需要一个新的 `major + pdf` 省级样板，而不应继续把 PDF 逻辑堆进广东/江苏分支里。

How:

- 独立封装行切分、列识别、专业信息抽取。
- 统一产出 `recordIdentityKey` / `majorIdentityKey`。
- 对解析失败行保留 `issues` 和 `gaps`。

#### 新增 `src/lib/import/parsers/shaanxi.ts`

What:

- 新建陕西院校级 parser。

Why:

- 陕西这轮的价值是补父记录与交叉验证，不是专业线。

How:

- 只输出 admission，不输出 majors。
- 在 `verificationNotes` 中标记该来源可用于学校补齐挂载。

### 二、学校补齐：从 BIT 样板推进到真实分数页验证，并纳入南京大学候选

#### 修改 `src/lib/import/school-source-registry.ts`

What:

- 把学校来源 registry 从“简单列表”升级成“候选/激活/评审”体系。

Why:

- 学校官网的最大难点不是是否有页面，而是能否稳定抓到全量专业线，因此必须把“候选”和“已激活”区分开。

How:

- 扩展 `SchoolSourceRegistryEntry` 字段：
  - `status: 'active' | 'candidate' | 'review'`
  - `pageMode: 'static-table' | 'filter-page' | 'article-list' | 'query-only'`
  - `coverageYears`
  - `coverageProvinces`
  - `crossCheckUrls`
- 保留 `BIT`，但把它明确标为：
  - `status: 'candidate'` 或 `review`
  - `pageMode: 'filter-page'`
- 新增 `南京大学` 条目：
  - 初始状态为 `candidate`
  - `pageMode: 'filter-page'`
  - `crossCheckUrls` 指向信息公开页和静态分数页

#### 修改 `src/lib/import/parsers/schools/README.md`

What:

- 把学校页面的“可抓取性分类”写成规范。

Why:

- 下一轮学校扩展不能只看“官网上有这个页面”，而要看它属于哪种页面模式。

How:

- 补充三类页面模式定义：
  - `static-table`
  - `filter-page`
  - `query-only`
- 明确：
  - `filter-page` 在未验证全量可抓前不能直接标 active
  - `query-only` 不纳入 ETL，只留缺口声明
- 继续保留“学校官网只补 major、不默认新建并行 admission”的硬规则

#### 修改 `src/lib/import/parsers/schools/bit-undergrad-html.ts`

What:

- 把 BIT adapter 从“首页占位样板”推进成“分数页验证样板”。

Why:

- 当前 BIT 条目已经在 registry 里，但如果继续停留在首页快照，它不能真正带动学校补齐这条线往前走。

How:

- 调整它的输入目标，从首页切到真实“历年分数”页或等价分数页。
- 在 adapter 中显式判断：
  - 页面默认态是否全量
  - 是否只返回默认示例行
  - 是否需要筛选枚举才能拿全
- 在未确认全量抓取前：
  - 不输出 majors
  - 继续输出 `school_adapter_pending`
  - 新增更细 gap，如：
    - `school_page_default_state_incomplete`
    - `school_page_filter_enumeration_unverified`

#### 新增 `src/lib/import/parsers/schools/nju-undergrad-html.ts`

What:

- 新建南京大学学校 adapter 样板。

Why:

- 需要第二个学校候选来验证“学校补齐”不是只对 BIT 一家特化。

How:

- 先以“分数页验证 adapter”起步，而不是直接承诺 major 产出。
- 读取历史分数页默认态内容，判断它是否适合：
  - 直接静态抓取
  - 需要筛选参数
  - 只能保留为 candidate/review
- 未确认全量前不直接产出 majors。

### 三、强化学校补齐的挂载与可观测性

#### 修改 `scripts/data/load-normalized.ts`

What:

- 把学校补齐与去重相关统计结构化输出。

Why:

- 省级扩容和学校补齐一起推进后，必须能直接看到“补了多少专业”“合并了多少重复项”。

How:

- 不改变现有 `upsert` 去重逻辑。
- 把这些统计从字符串摘要提升为结构化结果：
  - `supplementedMajors`
  - `dedupedMajors`
  - `syntheticParentsCreated`
- 按来源输出 source-level summary，供 report 直接消费。

#### 修改 `scripts/data/generate-coverage-report.ts`

What:

- 报表明确区分“省级原生专业线”和“学校补齐专业线”。

Why:

- 否则学校侧工作即使生效，也只会被混进总数，无法判断效果。

How:

- 在 coverage 中增加：
  - `schoolSupplementCount`
  - `nativeMajorCount`
  - `sourceStatus`
  - `pageMode`
  - `schoolGapState`
- 对学校来源不要只用 `province: '全国'` 的粗粒度表达，而要结合：
  - `coverageYears`
  - `coverageProvinces`
  - 或 majors 自身的 `parentAdmissionLocator`

### 四、把 parse / registry 结构进一步对齐到“来源家族”

#### 修改 `src/lib/import/parser-registry.ts`

What:

- 把新省份与学校 adapter 的命名和 family 对齐。

Why:

- 接下来来源会越来越多，命名与 family 不一致会让 parse/report 更难维护。

How:

- 注册：
  - `guizhou`
  - `shaanxi`
  - `nju-undergrad-html`
- 让 parserKey 与来源家族语义保持一致。

#### 修改 `scripts/data/fetch-official-sources.ts`

What:

- 让学校来源按状态受控进入抓取。

Why:

- 学校侧存在大量候选页，不应全部默认按 active 源抓取。

How:

- 仅抓取 `status = active` 或显式允许的 `candidate` 条目。
- 对 `review` / `query-only` 来源：
  - 不自动抓取
  - 或只在专门模式下抓取并保留缺口声明

## Assumptions & Decisions

1. 这轮优先级固定为：
   - 贵州专业线
   - 陕西父记录源
   - BIT 学校样板升级
   - 南京大学学校候选
2. 贵州这轮视为真正新增的省级专业线来源。
3. 陕西这轮不计入“已补专业线省份”，只计入“已补父记录/可供学校挂载”的省份。
4. 学校官网继续遵循“只补 major，不默认新建并行 admission”的规则。
5. `BIT` 和 `南京大学` 在确认可稳定拿到全量数据之前，不直接标记为“学校专业线已完成”。
6. 所有默认态不全、需筛选或查询的学校页面，都必须保留缺口声明，而不是静默视为可导入 [$TRAE_REF](https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html)[$TRAE_REF](https://admission.bit.edu.cn/html/1/m/168/172/index.html)。
7. 这轮只继续推进国内，不触碰海外考试主线。

## Verification steps

### 省级来源验证

1. 贵州 parser
   - 使用官方 PDF 样本运行测试
   - 验证能稳定提取：
     - 院校代码/名称
     - 专业代码/名称
     - 最低分
     - 最低位次
   - 验证能输出 admission + majors
2. 陕西 parser
   - 使用静态 HTML 历年投档页运行测试
   - 验证只输出 admission，不输出 majors
   - 验证 `gaps` 正确标记为父记录型来源

### 学校来源验证

1. BIT adapter
   - 验证分数页默认态是否全量
   - 若不全量，必须输出：
     - `school_page_default_state_incomplete`
     - 或 `school_page_filter_enumeration_unverified`
2. 南京大学 adapter
   - 验证静态分数页是否可直接拿到全量
   - 若不能，保留 `candidate/review` 状态，不强行激活

### 去重与补齐验证

1. 重复导入同一来源，确认：
   - 不重复新增 major
   - `dedupedMajors` 增加
2. 对学校来源样板，确认：
   - 若 parser 产出 majors，能挂到已有省级 parent admission
   - 若 parent admission 不存在，缺口被记录而不是静默失败

### 报告验证

1. `coverage-summary.json` 中应能区分：
   - 省级原生专业线
   - 省级父记录源
   - 学校补齐候选源
   - 已激活学校源
2. `gap-summary.json` 中应能出现：
   - `province_major_pdf_pending`
   - `institution_only_waiting_school_majors`
   - `school_page_default_state_incomplete`
   - `school_page_filter_enumeration_unverified`
   - `parent_admission_unmatched`

### 工程验证

1. 对贵州、陕西、BIT、南大的新增逻辑先写测试再实现。
2. 至少执行：
   - 相关 parser / adapter 测试
   - `npm run lint`
   - `npm run build`
3. 若某官方页面需交互查询、无法稳定枚举条件，不把它强行纳入 active ETL。

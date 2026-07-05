# 高校专业线适配器约定

本目录用于放置“高校本科招生网”的专业线适配器，不与省级考试院 parser 混放。

## 目录结构

- `src/lib/import/parsers/schools/<school-key>.ts`
- `src/lib/import/parsers/schools/index.ts`
- `src/lib/import/school-source-registry.ts`

## 适用前提

只有当学校官网满足以下任一条件时才创建适配器：

1. 提供稳定的静态 HTML 表格
2. 提供可直接下载的 `xls` / `xlsx` / `csv`
3. 提供可稳定调用的公开 JSON 接口

## 来源注册要求

每个高校官网来源都需要在 `school-source-registry.ts` 中定义：

- `schoolKey`
- `institutionName`
- `institutionCode?`
- `adapterKey`
- `sourceType`
- `officialUrl`
- `priority`
- `status`
- `pageMode`
- `coverageYears`
- `coverageProvinces`
- `crossCheckUrls`

## 输出要求

学校适配器必须输出与省级 parser 一致的 `ParsedSourceDocument`：

- `admissions`
- `majors`
- `issues`
- `gaps`
- `verificationNotes`

其中 `majors` 必须带：

- `parentAdmissionRowHash`
- `parentAdmissionLocator`
- `majorName`
- `majorCode`
- `minScore` 或 `majorMinRank`

如果学校官网只提供专业线，不要默认新建并行 admission。应优先通过 `parentAdmissionLocator` 挂到已有省级 admission；只有父记录不存在时，才允许 loader 创建 `synthetic parent admission`。

## 支持的来源类型边界

- 支持：
  - 稳定静态 HTML
  - 直接下载文件
  - 公开 JSON 接口
- 不支持：
  - 验证码型页面
  - 登录型页面
  - 只能在线单次查询、无法稳定抓取的页面

## 页面模式

- `static-table`
  - 默认态即可读到完整表格，可直接作为 active 候选
- `filter-page`
  - 默认态可能只展示部分结果或空表，需要先验证筛选条件是否可稳定枚举
- `article-list`
  - 适合“按年份/省份文章列表”型学校站点
- `query-only`
  - 只支持在线查询或交互查询，不纳入自动 ETL

## 状态使用规则

- `active`
  - 已确认可稳定抓取与解析，可进入默认抓取流程
- `candidate`
  - 来源有价值但尚未验证全量可抓，允许进入验证型抓取
- `review`
  - 已知存在页面，但暂不适合自动抓取，只保留缺口声明

## 约束

- 官方学校来源优先，不用第三方聚合站替代。
- 如果页面只能查询、不能稳定抓取，则不要接入，改记为待人工复核。
- 如果学校官网只有院校线，没有专业线，不在本目录实现。
- `filter-page` 在未验证全量抓取前，不应直接标记为学校专业线已完成。

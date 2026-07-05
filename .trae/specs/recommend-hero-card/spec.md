# Phase 2：首页流程简化 + 智能推荐突出 Spec

## Why

Phase1 完成后，用户从首页到看到推荐结果最少需要 7 步操作（选轨道→选省份→选年份→输分数→点推荐按钮→等结果）。智能推荐按钮在首页作为次级 CTA 展示，在查询页作为次选 Tab，完全被埋在筛选流程中。

## What Changes

- 首页改为"智能推荐大卡片"为主、普通查询为次的布局
- 考试轨道选择内嵌到推荐卡片内部
- 新建 `/recommend` 独立路由，直接展示三栏推荐结果
- 提取 `RecommendSection` 为共享组件供 `/query` 和 `/recommend` 复用

## Impact

- Affected specs: `fix-query-overlap-exam-types`（Phase1，无冲突）
- Affected code: `src/app/page.tsx`, `src/app/recommend/page.tsx`, `src/app/recommend/layout.tsx`, `src/components/RecommendSection.tsx`

## ADDED Requirements

### Requirement: 首页智能推荐英雄卡片

系统 SHALL 在首页头图下方展示一个醒目的智能推荐卡片，包含考试轨道选择、省份/年份/分数三个必填字段，以及一个主 CTA 按钮"查看推荐结果"。

#### Scenario: 用户访问首页
- **WHEN** 用户访问 `/`
- **THEN** 头图下方展示大尺寸推荐卡片，内置"国内高考 | 国际升学"双 Tab、省份下拉、年份下拉、分数输入框、"查看推荐结果"主按钮

#### Scenario: 用户点击推荐按钮
- **WHEN** 用户填写省份/年份/分数后点击"查看推荐结果"
- **THEN** 跳转到 `/recommend?exam=gaokao&province=...&year=...&score=...&examCategory=gaokao`

### Requirement: 推荐独立路由

系统 SHALL 提供 `/recommend` 路由，接收 `exam`、`examCategory`、`province`、`year`、`score` 参数，直接展示三栏推荐结果（冲刺/稳妥/保底）。

#### Scenario: 推荐结果展示
- **WHEN** 用户访问 `/recommend?exam=gaokao&province=广东&year=2024&score=600`
- **THEN** 展示头图（标题"智能推荐"）、顶部分数摘要、三栏推荐结果

#### Scenario: 参数不足
- **WHEN** 用户访问 `/recommend` 但缺少 `year` 或 `score`
- **THEN** 展示引导提示"请输入分数开始智能推荐"并重定向回首页

### Requirement: RecommendSection 共享组件

系统 SHALL 将 RecommendSection 及其依赖的 RecommendCard、SkeletonColumn、SkeletonCard 从 query/page.tsx 提取为独立的共享组件，供 `/recommend` 和 `/query` 页面复用。

#### Scenario: /recommend 页使用 RecommendSection
- **WHEN** /recommend 页请求完成推荐数据
- **THEN** 使用共享的 RecommendSection 组件渲染三栏结果

#### Scenario: /query 页继续使用 RecommendSection
- **WHEN** /query?mode=recommend 被访问
- **THEN** 使用同一共享组件渲染推荐结果，行为与 Phase1 一致

## MODIFIED Requirements

### Requirement: 首页布局（修改 Phase1）

首页原有的"考试轨道二选一 + 筛选表单"模式替换为"推荐英雄卡片 + 普通查询入口"。

#### Scenario: 首页新布局
- **WHEN** 用户访问 `/`
- **THEN** 不显示两个大轨道选择卡片，改为：
  1. 头图"升学数据库"
  2. 推荐英雄卡片（内置轨道切换 + 省份/年份/分数）
  3. "普通查询"次级入口链接 `/query`
  4. 上传数据入口（保持）

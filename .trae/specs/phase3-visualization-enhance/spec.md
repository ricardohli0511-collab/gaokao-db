# Phase 3：数据可视化增强 Spec

## Why

Phase2 完成后，推荐功能已提升为首页主入口。但查询结果的趋势图需要 2 步操作才能看到（点开卡片→等待加载），对比功能藏在 FAB 悬浮按钮中无人注意，推荐卡片缺少个体化分析（分数差值、录取概率）。

## What Changes

- 查询结果卡片**默认展示缩略趋势图**，无需点击展开
- 推荐卡片增加**分数差值标签**（高于/低于录取线 XX 分）
- 对比功能加强：结果区上方增加**对比状态栏**，对比抽屉增加**多校趋势折线图**
- 推荐栏的阈值说明改为动态值

## Impact

- Affected specs: `recommend-hero-card`（Phase2，RecommendSection 已提取为共享组件）
- Affected code: `src/components/RecommendSection.tsx`, `src/app/query/page.tsx`, `src/app/recommend/page.tsx`, `src/components/CompareDrawer.tsx`, `src/app/school/[id]/page.tsx`

## ADDED Requirements

### Requirement: 结果卡片默认展示缩略趋势图

query 页的 ResultCard 组件 SHALL 在卡片闭合状态下直接展示缩略折线图（高度 h-36），无需用户点击展开。

#### Scenario: 查询结果展示
- **WHEN** 用户在 /query 执行普通查询
- **THEN** 每张 ResultCard 默认展示院校名、统计三格（最低分/平均分/位次）、缩略趋势图、操作按钮

### Requirement: 推荐卡片分数差值标签

推荐结果中的每个 RecommendCard SHALL 展示用户分数与院校最低分的差值，格式为"高于录取线 XX 分"或"低于录取线 XX 分"。

#### Scenario: 分数高于录取线
- **WHEN** 用户分数 620，院校最低分 608
- **THEN** 卡片内展示绿色标签"🏷️ 高于录取线 12 分"

#### Scenario: 分数低于录取线
- **WHEN** 用户分数 600，院校最低分 615
- **THEN** 卡片内展示橙色标签"⚠️ 还差 15 分"

### Requirement: 对比状态栏

在 /recommend 和 /query 结果区域上方 SHALL 展示一个固定宽度的对比状态栏，显示"已选 N 所院校"和"开始对比"按钮，以及一个对比入口始终可见。

### Requirement: 对比抽屉多校趋势图

CompareDrawer 的对比面板 SHALL 在对比表格上方展示多校历年最低分趋势折线图（需额外请求数据）。

## MODIFIED Requirements

### Requirement: 推荐阈值动态化（修改 RecommendSection）

推荐栏的副标题（如 `+15分内` / `0~40分内`）SHALL 从 `config` 动态读取实际阈值，而非硬编码。

### Requirement: 详情页图表联动（修改 school/[id]/page.tsx）

院校详情页的趋势图 SHALL 响应年份筛选，选择特定年份后折线图仅展示对应年份的数据点。

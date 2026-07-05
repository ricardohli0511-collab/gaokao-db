# 国内/国际考试分离 Spec

## Why

当前系统将国内高考（统招/艺考/强基等满分750）与国际考试（IB满分45、A-Level字母等级、DSE等级分）的所有数据混杂在同一张表、同一套表单、同一套推荐逻辑中。导致：IB 45分和统招750分共用同一个`minScore`字段比较、推荐引擎对IB使用+15分阈值（相当于满分33%）、A-Level字母成绩无法存入Int字段。

## What Changes

- 在 `constants.tsx` 新增 `EXAM_CATEGORIES` 考试分组定义和工具函数
- 首页改为两个考试轨道卡片选择（国内高考 / 国际升学）
- 推荐 API 从固定阈值改为按满分百分比动态计算
- Records API 支持 `examCategory` 参数批量过滤
- 查询页支持 `exam` 路由参数，国际考试隐藏位次/批次列
- 院校详情页根据 `admissionType` 隐藏不适用列

## Impact

- Affected specs: 无（无现有 spec）
- Affected code: `src/lib/constants.tsx`, `src/app/page.tsx`, `src/app/query/page.tsx`, `src/app/school/[id]/page.tsx`, `src/app/api/recommend/route.ts`, `src/app/api/records/route.ts`

## ADDED Requirements

### Requirement: EXAM_CATEGORIES 考试分组定义

系统 SHALL 提供 `EXAM_CATEGORIES` 常量，包含 gaokao、ib、alevel、dse 四个分组，每个分组定义所属 admissionType 列表、满分值、可用字段、科目选项等。

#### Scenario: 查询国内高考分组
- **WHEN** 代码引用 `EXAM_CATEGORIES.gaokao`
- **THEN** 返回包含 types: ['统招','艺考','体育','强基','综评','保送']、scoreMax: 750、rankLabel: '最低位次' 等完整配置

#### Scenario: 查询 IB 分组
- **WHEN** 代码引用 `EXAM_CATEGORIES.ib`
- **THEN** 返回 scoreMax: 45, scoreMin: 24, rankLabel: null

### Requirement: 首页考试轨道选择

系统 SHALL 在首页提供两个考试轨道选择卡片：国内高考和国际升学。用户选择后展示对应的专属查询表单。

#### Scenario: 用户首次访问首页
- **WHEN** 用户访问 `/`
- **THEN** 显示"选择考试类型"标题，以及"国内高考"和"国际升学"两个卡片

#### Scenario: 用户选择国内高考
- **WHEN** 用户点击"国内高考"卡片
- **THEN** 显示省份/年份/分数/选科组合/批次表单

#### Scenario: 用户选择国际升学
- **WHEN** 用户点击"国际升学"卡片
- **THEN** 显示 IB/A-Level/DSE 子类型切换按钮，以及年份+分数/等级表单

### Requirement: 推荐引擎动态阈值

推荐 API（`/api/recommend`）SHALL 根据 `examCategory` 参数动态计算冲刺/稳妥/保底阈值，而非使用固定分值。

#### Scenario: 国内高考推荐
- **WHEN** examCategory=gaokao, score=600
- **THEN** 冲刺区间为 (600, 615]，稳妥区间为 [555, 600]

#### Scenario: IB 推荐
- **WHEN** examCategory=ib, score=38
- **THEN** 冲刺区间为 (38, 39]，稳妥区间为 [35, 38]

### Requirement: 国际考试结果隐藏不适用列

系统 SHALL 在国际考试（IB/A-Level/DSE）结果展示中隐藏"最低位次"列。

#### Scenario: 查询 IB 录取数据
- **WHEN** examCategory=ib 时展示结果卡
- **THEN** 不显示"最低位次"指标

#### Scenario: 院校详情页国际考试记录
- **WHEN** 院校的 admissionType 为 IB/A-Level/DSE
- **THEN** 历年录取表格不显示"最低位次"列

# Phase 1：国内/国际考试分离设计文档

## 概述

将当前混杂在一起的国内高考（统招/艺考/强基等）与国际考试（IB/A-Level/DSE）彻底分离，让用户从首页第一步就明确自己查的是哪种考试。两种考试使用独立的查询表单、独立的推荐逻辑、独立的分数格式。

## 目标用户

- 高考考生及家长：查询统招/艺考/体育/强基/综评/保送录取数据
- 国际课程学生及家长：查询 IB/A-Level/DSE 院校录取要求
- 数据管理员：导入和管理不同类型考试的数据

## 当前问题

### 1. 分数语义混乱
- 统招 750 分满分和 IB 45 分满分存在同一个 `minScore` 字段
- A-Level 成绩是字母等级（A*/A/B/C/D/E），无法存入 Int 类型字段
- DSE 使用等级分制（5**=7, 5*=6, 5=5...），与统招分数不可直接比较

### 2. 推荐引擎不合理
- 对 IB 45 分满分使用 +15 分冲刺阈值（相当于满分的 33%）
- 对所有考试类型一刀切，没有按满分比例计算

### 3. 字段共用导致混乱
- `subjectGroup` 字段被复用：国内高考是"物理类/历史类"，国际考试需要的是"HL 数学"这样的选课信息
- `batch` 批次字段对国际考试无意义
- `minRank` 排名字段对全球统考无意义
- `province` 省份字段对国际考试语义不同

## 设计方案

### 1. 首页入口：考试轨道选择

首页改为两步式体验：

**第一步：选择考试轨道**
- 左侧卡片：国内高考（统招·艺考·体育·强基·综评·保送）
- 右侧卡片：国际升学（IB·A-Level·DSE）

**第二步：专属查询表单**

国内高考表单（保持现有逻辑）：
- 省份（必填） / 年份（必填） / 分数 / 选科组合 / 批次

IB 表单：
- 年份（必填） / IB 总分滑块 24-45 / 科目方向（可选）

A-Level 表单：
- 年份（必填） / 成绩等级下拉（A*/A/B/C/D/E） / 科目（可选）

DSE 表单：
- 年份（必填） / Best 5 总分滑块 0-35 / 科目（可选）

### 2. 考试分组定义（constants.tsx）

```typescript
export const EXAM_CATEGORIES = {
  gaokao: {
    key: 'gaokao',
    label: '国内高考',
    types: ['统招', '艺考', '体育', '强基', '综评', '保送'],
    scoreMax: 750,
    fields: ['province', 'subjectGroup', 'batch', 'score', 'rank'],
    rankLabel: '位次',
    batchLabel: '批次',
    subjectLabel: '选科组合',
  },
  ib: {
    key: 'ib',
    label: 'IB 国际文凭',
    types: ['IB'],
    scoreMax: 45,
    scoreMin: 24,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: '科目方向',
    subjects: ['HL 数学 AA', 'HL 数学 AI', 'HL 物理', 'HL 化学', 'HL 生物', 'HL 经济', 'SL 数学 AA', 'SL 物理'],
  },
  alevel: {
    key: 'alevel',
    label: 'A-Level',
    types: ['A-Level'],
    scoreMax: null, // 字母等级制
    fields: ['score'],
    gradeOptions: ['A*', 'A', 'B', 'C', 'D', 'E'],
    gradeMap: { 'A*': 56, 'A': 48, 'B': 40, 'C': 32, 'D': 24, 'E': 16 },
  },
  dse: {
    key: 'dse',
    label: 'DSE 香港中学文凭',
    types: ['DSE'],
    scoreMax: 35,
    fields: ['score'],
    subjects: ['中文', '英文', '数学', '通识/公民', '物理', '化学', '生物', '经济', '历史', '地理', 'ICT'],
  },
};
```

### 3. 推荐引擎改造

API `/api/recommend` 增加 `examCategory` 参数，按考试类型动态计算阈值：

```
冲刺距离 = 满分 × 0.02（统招≈+15分, IB≈+1分）
稳妥区间 = [用户分 - 满分×0.04, 用户分]
推荐距离 = 满分 × 0.08

A-Level: 按 gradeMap 映射后进行数值比较
DSE: 直接在 0-35 范围内按比例计算
```

### 4. 数据模型：软隔离

不改动数据库 schema。不同考试类型通过 `admissionType` 区分，读取时根据 `examCategory` 做不同解析：

| 字段 | 国内高考 | IB | A-Level | DSE |
|------|:---:|:---:|:---:|:---:|
| minScore | 高考分（0-750） | IB总分（24-45） | 等级映射值（16-56） | Best 5 总分（5-35） |
| subjectGroup | 物理类/历史类/综合 | HL/SL 科目组合 | A-Level 科目组合 | DSE 科目列表 |
| batch | 本科批/提前批等 | 不使用（显示"-"） | 不使用（显示"-"） | 不使用（显示"-"） |
| minRank | 省排名 | 不使用 | 不使用 | 不使用 |
| province | 招生省份 | 国家/地区 | 国家/地区 | 国家/地区 |

### 5. 后台导入

按照考试类别提供独立模板和独立导入入口：
- 国内高考模板（所有字段）—— 保持现有
- IB 模板（年份、IB总分要求）—— 新增
- A-Level 模板（年份、A-Level最低等级）—— 新增
- DSE 模板（年份、DSE最低等级）—— 新增

### 6. 路由变化

查询页支持考试分类的路由参数：
- `/query?exam=gaokao&province=广东&year=2024&score=600` — 国内高考
- `/query?exam=ib&year=2024&score=38` — IB
- `/query?exam=alevel&year=2024&grade=A*AA` — A-Level
- `/query?exam=dse&year=2024&score=25` — DSE

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/lib/constants.tsx` | 新增 `EXAM_CATEGORIES` 定义 |
| `src/app/page.tsx` | 首页改为考试轨道选择 + 专属表单 |
| `src/app/query/page.tsx` | 支持 `exam` 参数，按考试分类切换界面 |
| `src/app/api/recommend/route.ts` | 增加 `examCategory` 参数，动态阈值计算 |
| `src/app/api/records/route.ts` | 增加 `examCategory` 过滤支持 |
| `src/components/PageHeader.tsx` | 可选：头图标题支持轨道切换显示 |
| `src/app/admin/import/page.tsx` | 按考试类别拆分导入模板 |
| `src/app/school/[id]/page.tsx` | 国际考试结果隐藏不适用字段（位次/批次） |

## 不在本次范围

- Phase 2（首页流程简化 + 智能推荐突出）
- Phase 3（趋势图/对比/推荐结果增强）
- 数据库 schema 改动（保持现有表结构，应用层软隔离）

## 验证步骤

1. 首页选择「国内高考」，表单显示省份/年份/分数/选科/批次，查询跳转带 `exam=gaokao` 参数
2. 首页选择「国际升学 → IB」，表单显示年份/IB总分滑块，查询跳转带 `exam=ib` 参数
3. IB 查询输入 38 分，推荐引擎按 +1/-2 计算冲刺/稳妥区间
4. 国内高考查询输入 600 分，推荐引擎按 +15/-30 计算（保持历史行为）
5. 国际考试结果页不显示「位次」和「批次」列（显示"-"或隐藏）
6. 后台导入页支持按考试类别选择不同模板
7. `npm run build` 通过，`npm run lint` 无新增错误

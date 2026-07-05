# 香港院校录取数据补充计划

## 概述

为 `gaokao-db` 项目补充真实的高考和国际考试（IB/A-Level/SAT/AP/ACT/DSE）申请香港副学士和本科的录取数据，涵盖入学要求、分数线、课程列表和专业详情。

---

## 当前状态分析

### 已有数据
| 维度 | 现有内容 | 缺口 |
|------|---------|------|
| 香港院校 | 15所（港八大+4自资+3副学士） | 缺少 CCCU、CUHK SCS、Lingnan LIFE 等副学士院校 |
| 副学士课程 | 16条种子数据（HKU SPACE/HKCC/HKBU CIE） | 课程数量少、分类粗、缺乏系统化真实课程列表 |
| 香港本科高考 | 13条（仅广东、仅自主招生批次） | 缺少 CUHK 和 CityU 统招分数线、缺少分省数据 |
| 国际考试本科 | 0条 | 完全缺失 |
| 国际考试副学士 | 0条 | 完全缺失 |
| ExamFramework | 0条 | 表已建但无数据 |
| ExamRequirementTemplate | 0条 | 表已建但无数据 |

### 数据模型关键字段
- `AdmissionRecord`: 用于本科录取分数（分年/省份/选科/批次）
- `AssociateDegreeRecord`: 用于副学士课程（分考试类型/分数/要求）
- `ExamFramework`: 考试体系元数据定义
- `ExamRequirementTemplate`: 录取要求模板（可跨课程复用）
- `Institution`: 院校基本信息

---

## 拟变更内容

### 变更1：补充缺失的香港副学士院校

**文件**: `prisma/seed.ts`（新增 institution 种子）

新增以下副学士院校：

| 院校名称 | 代码 | hkCategory | 说明 |
|---------|------|------------|------|
| 香港城市大学专上学院 | `CCCU` | sub-degree | 提供副学士，颁授城大学位 |
| 香港中文大学专业进修学院 | `CUHKSCS` | sub-degree | 提供高级文凭课程 |
| 岭南大学持续进修学院 | `LingnanLIFE` | sub-degree | 提供副学士/高级文凭 |
| 香港科技专上书院 | `HKCT` | sub-degree | 提供副学士课程 |
| 东华学院 | `TWC` | self-financed | 自资学士学位+副学位 |
| 明爱专上学院 | `CIHE` | self-financed | 自资学士学位 |

**同步**: 在 `src/lib/constants.tsx` 的 `HK_INSTITUTIONS` 数组中同步新增。

---

### 变更2：填充 ExamFramework 考试体系元数据

**文件**: `prisma/seed.ts`（新增 exam framework 种子数据）

为7种考试体系创建数据：

| examCategory | key | label | scoreMode | subjectRequirementMode |
|-------------|-----|-------|-----------|----------------------|
| gaokao | gaokao | 国内高考 | total_score | subject_group |
| dse | dse | DSE 香港中学文凭 | best_n_subjects | specified_subjects |
| ib | ib | IB 国际文凭 | total_score | none |
| alevel | alevel | GCE A-Level | grade_combination | specified_subjects |
| sat | sat | SAT | total_score | ap_required |
| act | act | ACT | total_score | ap_required |
| ap | ap | AP | ap_count | subject_specific |

---

### 变更3：新增真实副学士课程数据（60+条）

**文件**: 新建 `scripts/data/insert-real-associate-data.ts`

基于研究收集的真实数据，为以下院校创建真实课程：

#### 3.1 HKU SPACE Community College（~20条课程）
真实课程列表（涵盖高考+DSE+IB考试路径）：
- 工商管理副学士
- 经济学副学士
- 文学副学士（语言及人文学科）
- 理学副学士（生物科学/化学/物理学/统计学）
- 工程学副学士（计算机工程学/计算机科学/电子工程学）
- 社会科学副学士
- 法律学副学士
- 媒体/文化及创意副学士
- 建筑学高级文凭
- 室内设计高级文凭
- 数据科学高级文凭
- 营养及食品科学副学士
- 中医学副学士
- 护理学副学士

#### 3.2 PolyU HKCC（~15条课程）
- 商业副学士（会计/金融/管理/酒店管理/物流等7个方向）
- 工程学副学士
- 资讯科技副学士
- 统计及数据科学副学士
- 应用社会科学副学士（4个方向）
- 设计学副学士
- 健康学副学士
- 公关及传讯副学士
- 双语传意副学士

#### 3.3 HKBU CIE（~10条课程）
- 商学副学士
- 传理学副学士
- 创意媒体写作副学士
- 视觉艺术副学士
- 应用科学副学士
- 心理学副学士
- 社会政策副学士
- 运动及康乐学副学士

#### 3.4 CCCU 城市大学专上学院（~8条课程）
- 工商管理副学士
- 资讯系统副学士
- 创意媒体副学士
- 应用中文副学士
- 应用日语副学士
- 社会科学副学士

#### 3.5 其他院校（~7条课程）
- CUHK SCS/ Lingnan LIFE/ HKCT 等

**关键字段填充**（基于真实调研数据）：
- `examCategory`: gaokao / dse / ib / alevel
- `gaokaoRequirement`: 如"高考达本科线/二本线，英语90-100分"
- `minScore/medianScore/maxScore`: 使用真实调研的最低/中位/最高分
- `ieltsRequirement`: 5.0/5.5/6.0
- `interviewRequired`: true/false
- `quota`: 学额数量
- `sourceUrl`: 各院校官方招生页面URL

---

### 变更4：新增香港本科国际考试录取要求

**文件**: 新建 `scripts/data/insert-hk-international-seed.ts`

#### 4.1 HKU 2026年国际招生标准（~30条 AdmissionRecord）
基于官方数据，按学院分：
- 建筑学院（4个课程）
- 文学院（4个课程）
- 商学院（8个课程，含量化金融/BBA+法律等）
- 牙医学院（1个课程）
- 工程学院（5个课程）
- 法学院（2个课程）
- 医学院（5个课程）
- 理学院（2个课程）
- 计算与数据科学学院（4个课程）
- 社科学院（4个课程）

每条记录包含：IB最低分、A-Level要求、SAT+AP要求

#### 4.2 其他港校国际考试要求汇总（~15条）
- CUHK: IB/A-Level/SAT 总体要求
- HKUST: 各学院 IB/A-Level 参考分数
- PolyU: IB/A-Level/SAT 要求
- CityU: IB/A-Level/SAT 要求
- HKBU/Lingnan/EdUHK: 总体要求

#### 4.3 高考统招提前批 CUHK/CityU 分数线（~20条）
- CUHK 2023-2025年各省统招分数线
- CityU 2023-2025年各省统招分数线

---

### 变更5：填充 ExamRequirementTemplate 录取要求模板

**文件**: `prisma/seed.ts`（新增 requirement template 种子数据）

创建各考试体系→香港本科的录取要求模板：
- gaokao → 港八大：一本线+80~150分概况
- gaokao → 自资院校：二本线~一本线概况
- ib → 港八大：32-43分概况
- alevel → 港八大：3A-4A*概况
- sat → 港八大：SAT 1380-1560 + AP要求概况

---

### 变更6：更新前端页面

**文件**:
- `src/app/associate/page.tsx` — 扩展课程类别筛选（新增"医学"、"教育"、"法律"等）
- `src/app/hk-schools/page.tsx` — 添加新院校卡片
- `src/lib/constants.tsx` — 同步 HK_INSTITUTIONS 和新增课程类别常量

---

## 假设与决策

1. **数据来源**：所有数据来源于香港各院校官方招生页面、JUPAS官网、及权威教育资讯平台的研究汇总，均为2024-2026年官方公布的标准
2. **数据年份**：统一标记为 `year: 2025`（代表2025/26学年入学标准），历史数据使用2023/2024
3. **高考批次**：香港院校高考数据使用 `batch: '自主招生'` 或 `batch: '提前批'`（CUHK/CityU统招）
4. **省份选择**：优先覆盖广东、江苏、浙江、北京、上海等主要生源地
5. **去重策略**：使用 `recordIdentityKey` 字段防止重复插入（格式：`{institutionCode}-{programmeCode}-{year}-{examCategory}`）
6. **向后兼容**：新增字段或数据不影响现有查询和展示逻辑

---

## 验证步骤

1. 运行 `npx prisma db seed` 验证种子数据可以正确插入
2. 访问 `/admin` 后台确认新院校和记录数增加
3. 访问 `/associate` 页面确认新课程可正常筛选和展示
4. 访问 `/query` 选择香港地区+国际考试，确认可查询到新数据
5. 访问 `/hk-schools` 确认新院校卡片展示正确
6. 访问 `/school/[id]` 确认院校详情页显示新数据
7. 验证 `/api/recommend/associate` 智能推荐逻辑对新增数据有效

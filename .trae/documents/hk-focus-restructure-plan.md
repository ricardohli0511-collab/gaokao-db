# 香港本科+副学士 分数匹配平台 —— 结构调整计划

## 一、当前状态分析

### 项目定位偏离的核心问题

| 问题 | 现状 | 期望 |
|------|------|------|
| 首页品牌定位 | "升学数据库 — 历年全国高校录取分数线查询" | 面向香港本科/副学士的分数匹配平台 |
| 核心流程 | 选省份 → 选年 → 输分数 → 查全国院校 | 选考试类型 → 输分数 → 匹配香港院校及专业 |
| 数据模型 | 无香港院校区分、无副学士概念 | 需要 HK 院校标识 + 独立副学士模型 |
| 用户入口 | 省份卡片导航（33省） | 香港院校列表导航 + 学位层级切换 |
| 考试体系 | 全7种考试但内容偏高考 | 全部保留但聚焦 HK 申请场景 |
| 分级体系 | 985/211/双一流/C9 | 港八大/自资院校/副学士院校 |
| 导航结构 | 首页→推荐/查询→院校详情 | 首页→香港本科/副学士→分数匹配→院校详情 |

### 现有可复用资源
- ✅ JUPAS DSE 数据解析脚本 (`scripts/data/parse-jupas-dse.ts`)
- ✅ DSE 历年录取 PDF 数据源 (`data/raw/香港/JUPAS/`)
- ✅ 海外数据源注册表 (`overseas-source-registry.ts`) 已记录 HK 院校数据源
- ✅ 7种考试框架配置完整
- ✅ 智能推荐算法（冲刺/稳妥/保底）
- ✅ Prisma + SQLite 数据层
- ✅ 院校详情页（含趋势图）
- ✅ 院校对比功能

### 现有需要调整的内容
- ❌ 首页：省份卡片导航 → 改为 HK 院校导航
- ❌ 数据模型：无 region 字段、无副学士模型
- ❌ 分类体系：985/211 对 HK 无意义
- ❌ 查询页：省份/批次/选科 对 HK 申请不适用
- ❌ 种子数据：全是内地院校

---

## 二、调整目标与范围

### 目标定位
一个面向**高考生和国际考生**申请**香港本科和副学士**的分数匹配与专业查询平台。

### 目标用户
- 内地高考生 → 用高考成绩申请香港本科/副学士
- 国际课程学生 → 用 IB/A-Level/SAT/AP 成绩申请香港本科
- 香港本地生 → 用 DSE 成绩申请港校本科/副学士

### 范围
- **包含**：香港 9 所公立大学 + 自资院校的本科/副学士录取数据查询
- **保留**：内地高校查询功能（香港优先+其他保留策略）
- **新增**：副学士独立数据模型和查询入口

---

## 三、数据模型调整

### 3.1 Institution 表新增字段

```prisma
model Institution {
  // ... 现有字段 ...
  region        String?   // 新增: "mainland" | "hongkong" | "macau" | "overseas"
  hkCategory    String?   // 新增: "ugc-funded" | "self-financed" | "sub-degree" (香港院校分类)
  // 香港院校分类：ugc-funded(教资会资助/港八大), self-financed(自资院校), sub-degree(副学士院校)
}
```

### 3.2 新增 AssociateDegreeRecord 表

```prisma
model AssociateDegreeRecord {
  id               Int               @id @default(autoincrement())
  examCategory     ExamCategory      @default(gaokao)
  recordIdentityKey String?          @unique
  year             Int
  institutionId    Int
  programmeName    String            // 副学士课程名称
  programmeCode    String?           // 课程编号
  programmeCategory String?          // 课程类别：艺术/商科/社科/理工等
  admissionRequirement String?       // 入学门槛（如：DSE 5科Level 2）
  minScore         Float?            // 最低录取分数（可能非整数，如DSE加权）
  medianScore      Float?            // 中位数分数
  maxScore         Float?            // 最高分数
  gaokaoRequirement String?          // 高考门槛（如：一本线+英语120）
  ieltsRequirement  Float?           // 雅思要求
  interviewRequired Boolean?         // 是否需要面试
  quota            Int?              // 学额
  remarks          String?           // 备注
  sourceUrl        String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  institution      Institution       @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  @@index([institutionId, year])
  @@index([examCategory, year])
}
```

### 3.3 AdmissionRecord 扩展（可选）

用于香港本科录取场景下更精确的匹配：

```prisma
model AdmissionRecord {
  // ... 现有字段 ...
  degreeLevel     String?   // 新增: "undergraduate" | "associate" | "higher-diploma"
  programmeName   String?   // 新增: 香港课程名称（如 "BBA Accounting"）
  facultyName     String?   // 新增: 所属学院
  weightFormula   String?   // 新增: 加权计分公式说明（DSE 常用）
  uqScore         Float?    // 新增: UQ (上四分位)
  medianScore     Float?    // 新增: Median (中位数)
  lqScore         Float?    // 新增: LQ (下四分位)
}
```

**注意**：以上 AdmissionRecord 扩展需要数据库迁移，考虑到 SQLite 的限制（不支持 ALTER TABLE 的某些操作），将采用 Prisma migrate 方式处理。

---

## 四、页面结构调整

### 4.1 首页 `src/app/page.tsx` 重构

**调整前**：
- 标题：升学数据库 / 历年全国高校录取分数线查询
- 省份卡片导航（全国33省）
- 上传数据入口

**调整后**：
- 标题：香港升学分数匹配 / 香港本科·副学士录取查询平台
- **考试轨道**：高考 / DSE / IB / A-Level / SAT / ACT / AP（全7种保留）
- **学位层级切换**：本科 / 副学士
- **香港院校展示区**：港八大卡片 + 自资院校入口
- **智能推荐入口**：输入分数 → 匹配香港院校
- **内地高校查询入口**（次要位置）
- **移除**：省份卡片导航
- **移除**：上传数据入口（移到后台内部链接）

### 4.2 新增香港院校列表页 `src/app/hk-schools/page.tsx`

- 按分类展示香港院校：
  - 教资会资助（港八大）：港大/中大/科大/城大/理大/浸大/岭大/教大
  - 自资院校：都会大学/树仁/恒生/珠海学院等
  - 副学士院校：HKU SPACE/HKCC/HKBU CIE/UOWCHK等
- 每所院校显示：名称/类别/可选学位层级/可选考试类型

### 4.3 新增副学士查询页 `src/app/associate/page.tsx`

- 按考试类型筛选副学士课程
- 显示课程名称/所属院校/入学要求/最低分数
- 与本科查询共用 API 但数据源分离

### 4.4 查询页 `src/app/query/page.tsx` 调整

**调整前**：省份/年份/批次/选科组合筛选
**调整后**：
- 增加"地区"筛选：香港/内地/澳门（默认香港优先）
- 增加"学位层级"筛选：本科/副学士
- 对于香港查询，隐藏不相关的内地字段（如批次、选科组合）

### 4.5 推荐页 `src/app/recommend/page.tsx` 调整

- 默认抓取香港院校数据
- 支持副学士推荐（独立 Tab 或参数）
- 增加考试类型到香港院校的映射提示

### 4.6 院校详情页 `src/app/school/[id]/page.tsx` 调整

- 增加学位层级切换：本科数据 / 副学士数据
- 香港院校显示 UQ/Median/LQ 趋势图
- 显示课程列表（含专业名称）

---

## 五、导航结构调整

### 公共导航（Header/Footer）

新增主导航栏：
```
[Logo] 香港升学  |  本科  |  副学士  |  院校库  |  分数查询  |  管理后台
```

### 路由重组织

```
/                        → 首页（HK聚焦）
/hk-schools              → 香港院校库（新增）
/hk-schools/[id]         → 可复用 school/[id]
/associate               → 副学士查询（新增）
/associate/[id]          → 副学士详情（新增）
/query                   → 录取查询（调整，HK优先）
/recommend               → 智能推荐（调整，HK优先）
/school/[id]             → 院校详情（调整，支持副学士数据）
/admin/*                 → 管理后台（不变）
```

---

## 六、API 调整

### 新增 API
| 路由 | 方法 | 功能 |
|------|------|------|
| `api/hk-institutions` | GET | 香港院校列表（按分类） |
| `api/associate` | GET | 副学士课程查询 |
| `api/associate/[id]` | GET | 副学士课程详情 |
| `api/recommend/hk` | GET | 香港院校智能推荐（本科+副学士） |

### 修改 API
| 路由 | 变更 |
|------|------|
| `api/recommend` | 增加 `region` 参数，默认 `hongkong` |
| `api/records` | 增加 `region`/`degreeLevel` 筛选 |
| `api/institutions` | 增加 `region` 筛选参数 |

---

## 七、常量与配置调整

### `src/lib/constants.tsx` 新增

```typescript
// 香港院校分类
export const HK_CATEGORIES = {
  'ugc-funded': { label: '教资会资助', description: '港八大公立大学' },
  'self-financed': { label: '自资院校', description: '自资学士学位课程院校' },
  'sub-degree': { label: '副学士院校', description: '提供副学士/高级文凭课程' },
};

// 香港院校列表
export const HK_INSTITUTIONS = [
  { name: '香港大学', code: 'HKU', category: 'ugc-funded' },
  { name: '香港中文大学', code: 'CUHK', category: 'ugc-funded' },
  { name: '香港科技大学', code: 'HKUST', category: 'ugc-funded' },
  { name: '香港城市大学', code: 'CityU', category: 'ugc-funded' },
  { name: '香港理工大学', code: 'PolyU', category: 'ugc-funded' },
  { name: '香港浸会大学', code: 'HKBU', category: 'ugc-funded' },
  { name: '岭南大学', code: 'Lingnan', category: 'ugc-funded' },
  { name: '香港教育大学', code: 'EdUHK', category: 'ugc-funded' },
  { name: '香港都会大学', code: 'HKMU', category: 'self-financed' },
  // ... 更多
];

// 学位层级
export const DEGREE_LEVELS = [
  { value: 'undergraduate', label: '本科' },
  { value: 'associate', label: '副学士' },
  { value: 'higher-diploma', label: '高级文凭' },
];
```

---

## 八、种子数据更新

### 新增香港院校种子数据

在 `prisma/seed.ts` 中新增 8-15 所香港院校，包含：
- 港八大基本信息
- 自资院校基本信息
- 每所院校标记 `region: "hongkong"` 和对应的 `hkCategory`

---

## 九、实施步骤（共7个阶段）

### 阶段1：数据模型（Schema）
1. Institution 表新增 `region`、`hkCategory` 字段
2. 创建 AssociateDegreeRecord 表
3. AdmissionRecord 表新增 `degreeLevel`、`uqScore`、`medianScore`、`lqScore` 字段
4. 运行 `prisma migrate dev` 生成迁移

### 阶段2：种子数据
1. 更新 seed.ts，添加香港院校
2. 运行 seed

### 阶段3：常量与类型
1. 更新 constants.tsx 添加香港相关常量
2. 更新 Prisma 生成的类型

### 阶段4：首页重构
1. 重写 `src/app/page.tsx`，HK 主题定位
2. 考试轨道保持7种但优化 UI
3. 新增学位层级切换
4. 香港院校展示区
5. 移除省份导航

### 阶段5：新增页面
1. `src/app/hk-schools/page.tsx` 香港院校列表
2. `src/app/associate/page.tsx` 副学士查询
3. `src/app/associate/[id]/page.tsx` 副学士详情

### 阶段6：API 层
1. 新增 `/api/hk-institutions` 
2. 新增 `/api/associate` + `/api/associate/[id]`
3. 修改 `/api/recommend`（增加 region/degreeLevel）
4. 修改 `/api/records`（增加 region/degreeLevel）
5. 修改 `/api/institutions`（增加 region）

### 阶段7：现有页面适配
1. 查询页增加 HK 优先筛选
2. 推荐页默认 HK 范围
3. 院校详情页支持副学士 Tab
4. 管理后台扩展（副学士 CRUD）

---

## 十、风险与注意事项

1. **SQLite ALTER TABLE 限制**：不支持直接 ADD COLUMN 带默认值，Prisma migrate 会自动处理，但需要在 dev.db 上测试。
2. **向后兼容**：现有内地查询功能保持不变，只是默认优先级改为香港。
3. **JUPAS 数据导入**：已有解析脚本，需要在管理后台中提供 HK 数据专用导入入口。
4. **副学士分数格式**：DSE 副学士分数通常是浮点数（如 15.5），现有 `minScore: Int` 需要调整为 Float。
5. **权限不受影响**：管理后台认证逻辑不变。

---

## 十一、验证步骤

1. 运行 `prisma migrate dev`，确认新表创建无报错
2. 运行 `npm run seed`，确认香港院校数据写入
3. 启动 `npm run dev`，访问首页确认 UI 变更
4. 输入 DSE 分数测试推荐功能是否返回香港院校
5. 访问 `/hk-schools` 确认院校列表
6. 访问 `/associate` 确认副学士查询
7. 运行 `npx tsc --noEmit` 确认无类型错误

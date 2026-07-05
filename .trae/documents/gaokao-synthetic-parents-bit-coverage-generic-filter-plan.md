# BIT 枚举收敛 + Synthetic Parents 实现 + Filter-Page 通用化专项计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解决 BIT 全量枚举耗时过长（545 请求）、学校 majors 因缺父 admission 被跳过（`sk:34`）、以及 BIT 抓取模式无法复用到 NJU 等同类 filter-page 的三个卡点。

**Architecture:** `fetchBitAllProvinces` 接收 `coverageYears` 约束，`upsert.ts` 在 majors 无父 admission 时自动创建 synthetic parent，`fetchFilterPageByAjax` 抽取为按学校差异化配置的通用函数，NJU/BIT 各自提供 `paramEndpoint`、`dataEndpoint`、字段映射等参数。

**Tech Stack:** Node.js、TypeScript、原生 `fetch`

---

## Summary

本轮三个卡点互相关联：

1. **BIT 枚举爆炸**：`fetchBitAllProvinces` 从 AJAX 返回的筛选列表里提取年份时没有用 `coverageYears` 过滤，导致所有可用年份（2018-2025，共 8 年 × 31 省 = 545 组合）都被枚举。实际只需要 3 年（`[2025, 2024, 2023]`）= 93 次请求。

2. **学校 majors 被静默跳过**：HIT 解析出 34 条 majors，但 `upsert.ts` 第 301-338 行在 `locatedAdmissionsByIdentity` 中查找不到父 admission（因为黑龙江没有省级 `institution` 级记录），直接设 `parentAdmission: null`，第 363 行 `if (!parentAdmission)` 跳过，`syntheticParentsCreated` 计数器从未增长。

3. **Filter-page 模式不可复用**：BIT 的 `fetchBitAllProvinces` 和即将需要同样处理的 NJU（同为 `pageMode: 'filter-page'`、默认态只展示单行）没有共享代码。NJU 的 AJAX 路径与 BIT 不同（BIT 用 `/f/ajax_lnfs_param`，NJU 该路径 404），需要参数化。

---

## Current State Analysis

### 卡点 1：BIT 年份枚举未收敛

**根因**：`fetch-official-sources.ts` 第 112-124 行的 `fetchBitAllProvinces` 从 AJAX 返回的 `ssmc_nf_klmc_sex_campus_zslx_list` 数组中提取所有年份，未与 `school-source-registry.ts` 中 BIT 的 `coverageYears: [2025, 2024, 2023]` 做交集。

```typescript
// 当前代码（第 122-124 行）
const provinces = [...provinceSet].filter(Boolean);
const years = [...yearSet].filter(Boolean);
// years 包含 2018-2025 全部 8 个年份
```

**影响**：545 次请求 × 200ms 延迟 ≈ 110 秒，且拉入了大量老数据（2018-2022）不在 `coverageYears` 范围内。

**修复方向**：在提取 `yearSet` 后，与 `(entry as any).coverageYears` 或从 `SCHOOL_SOURCE_REGISTRY` 查找的 `coverageYears` 做交集。

### 卡点 2：synthetic parent 未实现

**根因**：`upsert.ts` 第 301-338 行的 `preparedMajors` 已经做了 full 查找（`locatorIdentities` → `locatedAdmissionsByIdentity`），但当查不到时仅设 `parentAdmission: null`（第 337 行），后续第 363 行直接跳过。`syntheticParentsCreated` 计数器（第 109 行）虽已声明但从未递增。

**流转**：
```
parser → majors[].parentAdmissionLocator = {...}
  ↓
upsert → 查找 locatedAdmissionsByIdentity → 未命中
  ↓
preparedMajors → parentAdmission: null
  ↓
skip（sk:34） ← 应在这里创建 synthetic parent
```

**修复方向**：在 `preparedMajors` 循环中，当 `located` 为 null 时：
1. 用 `parentAdmissionLocator` 的信息构造一个 `NormalizedAdmissionRecord`
2. 走 `ensureInstitution`（或 batch institution cache）→ `prisma.admissionRecord.create`（带 `isSyntheticParent: true`）
3. 把新创建的 admission 加入 `locatedAdmissionsByIdentity`
4. `syntheticParentsCreated += 1`

### 卡点 3：filter-page 抓取不可复用

**当前状态**：
- BIT 已确认可用：`/f/ajax_lnfs_param` 返回筛选选项数组 → 省/年枚举 → `/f/ajax_lnfs` POST 返回 `sszygradeList`
- NJU 已确认不可直接复用：`/f/ajax_lnfs_param` 返回 404，说明 NJU 的 AJAX 路径或返回格式不同

**NJU 页面结构分析**（基于 WebFetch 结果）：
- 页面有省份/年份/科类/类型四个筛选维度
- 默认态只展示 "2025 | 江苏 | 物理类 | 普通批次 | 最低分 661"
- 存在类似的 filter 机制但 AJAX 端点路径未被确认

**修复方向**：
1. 把 BIT 的模式抽取为 `fetchFilterPageByAjax(config)` 通用函数
2. 先只对 BIT 做限定年份 + 函数化
3. NJU 需要通过浏览器抓包确认实际 AJAX 端点路径后，再提供独立配置接入

---

## Proposed Changes

### 一、BIT 年份收敛：`coverageYears` 约束枚举范围

#### 修改 `scripts/data/fetch-official-sources.ts`

What：让 `fetchBitAllProvinces` 接收 `coverageYears` 参数，只枚举限定年份。

Why：当前枚举全 8 年 545 请求，实际只需 3 年 93 请求，节省 ~80% 抓取时间。

How：

```typescript
// 修改函数签名
async function fetchBitAllProvinces(
  entry: SourceRegistryEntry,
  coverageYears: number[] = [2025, 2024, 2023]
): Promise<Buffer> {
  const baseUrl = new URL(entry.officialUrl).origin;

  // ... paramResponse 获取筛选选项（不变）...

  // 提取所有年份后做交集
  const yearSet = new Set<string>();
  // ... 从 paramData 提取 yearSet（不变）...

  const allRows: string[] = [];
  const provinces = [...provinceSet].filter(Boolean);
  const allYears = [...yearSet].filter(Boolean);
  const years = allYears.filter((y) => coverageYears.includes(Number.parseInt(y, 10)));

  if (provinces.length === 0 || years.length === 0) {
    console.warn('[BIT] 省份/年份列表为空，保存原始 HTML');
    const shellResponse = await fetch(entry.officialUrl);
    return Buffer.from(await shellResponse.arrayBuffer());
  }

  console.log(`[BIT] 限定枚举范围：${provinces.length}省 × ${years.length}年 = ${provinces.length * years.length} 请求`);

  // ... 后续枚举逻辑不变 ...
}
```

**调用侧修改**（`fetchOne` 中）：

```typescript
if (entry.schoolKey === 'bit-undergrad' && entry.sourceType === 'html') {
  const schoolMeta = SCHOOL_SOURCE_REGISTRY.find((s) => s.schoolKey === 'bit-undergrad');
  buffer = await fetchBitAllProvinces(entry, schoolMeta?.coverageYears ?? [2025, 2024, 2023]);
}
```

需要补充 `SCHOOL_SOURCE_REGISTRY` 导入：
```typescript
import { SCHOOL_SOURCE_REGISTRY } from '@/lib/import/school-source-registry';
```

### 二、Synthetic Parent：自动创建缺失的父 admission

#### 修改 `src/lib/import/upsert.ts`

What：在 `preparedMajors` 生成后，对 `parentAdmission: null` 的 majors 自动创建 synthetic parent admission。

Why：HIT 的 34 条黑龙江 majors 因缺少黑龙江的 `institution` 级省级父 admission 而被全部跳过。synthetic parent 机制就是为这种场景设计的。

How：

在现有的 `majors` 遍历之前插入 synthetic parent 创建逻辑（第 339 行之后）：

```typescript
// 为无父 admission 的 school majors 创建 synthetic parent
const syntheticPrepared = preparedMajors.map((item) => item);
const syntheticParentBatch: Array<{ major: NormalizedMajorRecord; parentIdentityKey: string }> = [];

for (const { major, parentAdmission } of preparedMajors) {
  if (parentAdmission || !major.parentAdmissionLocator) continue;

  const locatorIdentityKey = buildAdmissionIdentityKey({
    examCategory: major.parentAdmissionLocator.examCategory,
    year: major.parentAdmissionLocator.year,
    province: major.parentAdmissionLocator.province,
    subjectGroup: major.parentAdmissionLocator.subjectGroup,
    batch: major.parentAdmissionLocator.batch,
    admissionType: major.parentAdmissionLocator.admissionType ?? '统招',
    institutionName: major.parentAdmissionLocator.institutionName,
    institutionCode: major.parentAdmissionLocator.institutionCode ?? null,
    granularity: major.parentAdmissionLocator.granularity ?? 'institution',
    programVariant: null,
    campusName: null,
    groupCode: major.parentAdmissionLocator.groupCode ?? null,
  });

  // 检查是否已在本批次内创建过相同 identity 的 synthetic parent
  const alreadyCreated = syntheticParentBatch.find((s) => s.parentIdentityKey === locatorIdentityKey);
  if (alreadyCreated) {
    // 直接复用
    syntheticPrepared.push({
      major,
      parentAdmission: { id: 0, recordIdentityKey: locatorIdentityKey }, // id 后续替换
    });
    continue;
  }

  // 1. match institution
  const institutionKey = `${major.parentAdmissionLocator.institutionCode ?? ''}::${major.parentAdmissionLocator.institutionName}`;
  let institutionResult = institutionCache.get(institutionKey);

  if (!institutionResult) {
    const matched = await matchInstitution({
      institutionCode: major.parentAdmissionLocator.institutionCode ?? undefined,
      rawInstitutionName: major.parentAdmissionLocator.institutionName,
    });

    if (matched.institutionId) {
      institutionResult = matched;
    } else {
      const created = await prisma.institution.create({
        data: {
          name: major.parentAdmissionLocator.institutionName,
          normalizedName: major.parentAdmissionLocator.institutionName,
          code: major.parentAdmissionLocator.institutionCode ?? undefined,
          category: '普通本科',
          province: major.parentAdmissionLocator.province,
          website: null,
        },
        select: { id: true, code: true, name: true },
      });

      await prisma.institutionAlias.upsert({
        where: { institutionId_aliasName: { institutionId: created.id, aliasName: major.parentAdmissionLocator.institutionName } },
        update: { normalizedAlias: major.parentAdmissionLocator.institutionName },
        create: { institutionId: created.id, aliasName: major.parentAdmissionLocator.institutionName, normalizedAlias: major.parentAdmissionLocator.institutionName, sourceName: '官方导入', sourceUrl: major.sourceUrl },
      });

      institutionResult = { institutionId: created.id, institutionCode: created.code, matchedName: created.name };
    }

    institutionCache.set(institutionKey, institutionResult);
  }

  // 2. create synthetic parent admission
  const syntheticAdmission = await prisma.admissionRecord.create({
    data: {
      examCategory: major.parentAdmissionLocator.examCategory,
      recordIdentityKey: locatorIdentityKey,
      isSyntheticParent: true,
      year: major.parentAdmissionLocator.year,
      province: major.parentAdmissionLocator.province,
      subjectGroup: major.parentAdmissionLocator.subjectGroup,
      batch: major.parentAdmissionLocator.batch,
      institutionId: institutionResult.institutionId,
      institutionCode: major.parentAdmissionLocator.institutionCode ?? undefined,
      rawInstitutionName: major.parentAdmissionLocator.institutionName,
      granularity: major.parentAdmissionLocator.granularity ?? 'institution',
      admissionType: major.parentAdmissionLocator.admissionType ?? '统招',
      sourceDocumentId: params.sourceDocumentId ?? null,
      sourceUrl: major.sourceUrl,
      rawRowHash: '',
    },
    select: { id: true, recordIdentityKey: true },
  });

  locatedAdmissionsByIdentity.set(locatorIdentityKey, syntheticAdmission);
  counters.syntheticParentsCreated = (counters.syntheticParentsCreated ?? 0) + 1;
  syntheticParentBatch.push({ major, parentIdentityKey: locatorIdentityKey });

  syntheticPrepared.push({
    major,
    parentAdmission: { id: syntheticAdmission.id, recordIdentityKey: locatorIdentityKey },
  });
}

// 将原有 preparedMajors 替换为包含 synthetic 版本的数组
// 后续 major upsert 循环使用 syntheticPrepared
```

然后将后续的 `majorIdentityKeys` 提取和第 361 行的 `for (const { major, parentAdmission } of preparedMajors)` 改为使用 `syntheticPrepared`：

```typescript
const majorIdentityKeys = syntheticPrepared
  .filter((item) => item.parentAdmission)
  .map((item) => resolveMajorIdentity(item.major, item.parentAdmission!.recordIdentityKey));

// ... existingMajorsByIdentity 批量查询（不变）...

for (const { major, parentAdmission } of syntheticPrepared) {
  if (!parentAdmission) {
    counters.skipped += 1;
    continue;
  }
  // ... 后续逻辑不变 ...
}
```

### 三、Filter-Page 通用化：抽取 `fetchFilterPageByAjax`

#### 修改 `scripts/data/fetch-official-sources.ts`

What：把 BIT 的筛选 → 枚举 → 合成 HTML 流程抽成可配置的通用函数，NJU 等同类页面通过提供不同参数接入。

Why：BIT 和 NJU 同属 `pageMode: 'filter-page'`，且都有 AJAX 筛选接口。通用化后 NJU 只需提供 `paramEndpoint`、`dataEndpoint`、字段映射和年份提取逻辑。

How：

```typescript
interface FilterPageAjaxConfig {
  /** 学校标识，用于日志 */
  schoolKey: string;
  /** 获取筛选选项的 AJAX 端点（相对于 baseOrigin 的路径） */
  paramEndpoint: string;
  /** 获取数据的 AJAX 端点 */
  dataEndpoint: string;
  /** 省份在 POST body 中的字段名 */
  provinceParamName: string;
  /** 年份在 POST body 中的字段名 */
  yearParamName: string;
  /** 从 paramResponse JSON 中提取省份+年份集合 */
  extractDimensionKeys: (paramData: Record<string, unknown>) => {
    provinces: string[];
    years: string[];
  };
  /** 从 dataResponse 单行中提取单元格数组 */
  extractRowCells: (row: Record<string, string>) => string[];
  /** 合成 HTML 的前缀（<thead> 等） */
  buildTableHead: (provinces: string[], years: string[]) => string;
}

async function fetchFilterPageByAjax(
  entry: SourceRegistryEntry,
  config: FilterPageAjaxConfig
): Promise<Buffer> {
  const baseUrl = new URL(entry.officialUrl).origin;

  // Step 1: 获取筛选选项
  const paramResponse = await fetch(`${baseUrl}${config.paramEndpoint}`, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'x-requested-with': 'XMLHttpRequest',
      referer: entry.officialUrl,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  if (!paramResponse.ok) {
    console.error(`[${config.schoolKey}] param endpoint 失败 (${paramResponse.status})`);
    const shellResponse = await fetch(entry.officialUrl);
    return Buffer.from(await shellResponse.arrayBuffer());
  }

  const paramData = (await paramResponse.json()) as Record<string, unknown>;
  const { provinces, years } = config.extractDimensionKeys(paramData);

  if (provinces.length === 0 || years.length === 0) {
    console.warn(`[${config.schoolKey}] 筛选维度为空，保存原始 HTML`);
    const shellResponse = await fetch(entry.officialUrl);
    return Buffer.from(await shellResponse.arrayBuffer());
  }

  console.log(`[${config.schoolKey}] 枚举范围：${provinces.length}省 × ${years.length}年 = ${provinces.length * years.length} 请求`);

  // Step 2: 遍历枚举
  const allRows: string[] = [];
  for (const province of provinces) {
    for (const year of years) {
      const dataResponse = await fetch(`${baseUrl}${config.dataEndpoint}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          accept: 'application/json,text/plain,*/*',
          'x-requested-with': 'XMLHttpRequest',
          referer: entry.officialUrl,
        },
        body: new URLSearchParams({
          [config.provinceParamName]: province,
          [config.yearParamName]: year,
        }),
      });

      if (!dataResponse.ok) {
        console.warn(`[${config.schoolKey}] data endpoint 失败 ${province}/${year} (${dataResponse.status})`);
        continue;
      }

      const data = (await dataResponse.json()) as { state?: number; data?: { sszygradeList?: Array<Record<string, string>> } };

      if (data.state === 1 && data.data?.sszygradeList?.length) {
        for (const row of data.data.sszygradeList) {
          const cells = config.extractRowCells(row).join('</td><td>');
          allRows.push(`<tr data-ajax-nf="${row.nf ?? ''}" data-ajax-ssmc="${row.ssmc ?? ''}"><td>${cells}</td></tr>`);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Step 3: 构造合成 HTML
  const head = config.buildTableHead(provinces, years);
  const shellHtml = `<html><body>
    <table id="score-list" data-ajax-fetched="true" data-ajax-school="${config.schoolKey}" data-ajax-provinces="${provinces.length}" data-ajax-years="${years.length}">
      ${head}
      <tbody>${allRows.join('\n')}</tbody>
    </table>
  </body></html>`;

  return Buffer.from(shellHtml, 'utf8');
}
```

**BIT 专用配置**（替换 `fetchBitAllProvinces`）：

```typescript
async function fetchBitAllProvinces(entry: SourceRegistryEntry): Promise<Buffer> {
  const schoolMeta = SCHOOL_SOURCE_REGISTRY.find((s) => s.schoolKey === 'bit-undergrad');
  const coverageYears = schoolMeta?.coverageYears ?? [2025, 2024, 2023];

  return fetchFilterPageByAjax(entry, {
    schoolKey: 'bit-undergrad',
    paramEndpoint: '/f/ajax_lnfs_param',
    dataEndpoint: '/f/ajax_lnfs',
    provinceParamName: 'ssmc',
    yearParamName: 'nf',
    extractDimensionKeys: (paramData) => {
      const list = (paramData as { data?: { ssmc_nf_klmc_sex_campus_zslx_list?: Array<Record<string, string[]>> } }).data?.ssmc_nf_klmc_sex_campus_zslx_list ?? [];
      const provinceSet = new Set<string>();
      const yearSet = new Set<string>();
      for (const item of list) {
        const key = Object.keys(item)[0];
        const parts = key.split('_');
        if (parts.length >= 2) {
          provinceSet.add(parts[0]);
          yearSet.add(parts[1]);
        }
      }
      const allYears = [...yearSet].filter(Boolean);
      return {
        provinces: [...provinceSet].filter(Boolean),
        years: allYears.filter((y) => coverageYears.includes(Number.parseInt(y, 10))),
      };
    },
    extractRowCells: (row) => [
      row.nf ?? '', row.ssmc ?? '', row.klmc ?? '', row.sex ?? '',
      row.campus ?? '', row.zymc ?? '', row.minScore ?? '',
      row.maskAvgScore ?? row.avgScore ?? '', row.maskMaxScore ?? row.maxScore ?? '',
      row.zylx ?? '', row.zylqrs ?? '',
    ],
    buildTableHead: (provinces, years) =>
      `<thead><tr><th>年份</th><th>省份</th><th>科类</th><th>性别</th><th>校区</th><th>专业名称</th><th>最低分</th><th>平均分</th><th>最高分</th><th>类型</th><th>人数</th></tr></thead>`,
  });
}
```

#### 修改 `src/lib/import/parsers/schools/bit-undergrad-html.ts`

What：把合成 HTML 的标识从 `data-bit-fetched` 改为通用的 `data-ajax-fetched`。

Why：通用化后合成 HTML 的标记也应通用化，方便所有 filter-page parser 共用判断逻辑。

How：

```typescript
// 检测标记改为通用
const isFetched = html.includes('data-ajax-fetched="true"');
```

行正则也更新：
```typescript
const rowRegex = /<tr\s+data-ajax-nf="([^"]*)"\s+data-ajax-ssmc="([^"]*)"><td>(.*?)<\/td><\/tr>/gi;
```

### 四、NJU 的 filter-page 接入预置

#### 仅建配置，本轮不运行

What：基于通用 `fetchFilterPageByAjax`，为 NJU 预置配置结构，但暂不接入 fetch 分发。

Why：NJU 的 AJAX 端点路径尚未确认（`/f/ajax_lnfs_param` 返回 404），需要在浏览器中抓包确认后再激活。

How：在 `fetch-official-sources.ts` 中预置 NJU 配置骨架，加注释 `// TODO: NJU AJAX 端点待确认`。

```typescript
// NJU filter-page 配置骨架（待 AJAX 端点确认）
// async function fetchNjuAllProvinces(entry: SourceRegistryEntry): Promise<Buffer> {
//   const schoolMeta = SCHOOL_SOURCE_REGISTRY.find((s) => s.schoolKey === 'nju-undergrad');
//   const coverageYears = schoolMeta?.coverageYears ?? [2025, 2024, 2023];
//
//   return fetchFilterPageByAjax(entry, {
//     schoolKey: 'nju-undergrad',
//     paramEndpoint: 'TODO: NJU AJAX 端点待浏览器抓包确认',
//     dataEndpoint: 'TODO',
//     // ...
//   });
// }
```

---

## Assumptions & Decisions

1. BIT 的 `coverageYears` 从 `SCHOOL_SOURCE_REGISTRY` 查找，默认 `[2025, 2024, 2023]`，不从 `SourceRegistryEntry` 本身取（因为学校源通过 `getSchoolIngestSources` 生成）。
2. Synthetic parent admission 用 `isSyntheticParent: true` 标记，不设分数字段（`minScore: null`、`minRank: null`），因为它仅是 majors 挂载的占位记录。
3. Synthetic parent 的 institution 信息从 `major.parentAdmissionLocator.institutionName` 提取，沿用已有 batch institution cache。
4. 同一次 `upsertAdmissionBundle` 调用内，相同 identity 的 synthetic parent 只创建一次（`syntheticParentBatch` 去重）。
5. NJU 本轮不运行：仅预置配置骨架，等浏览器抓包确认 AJAX 端点路径后再激活。

## Verification steps

### BIT 年份收敛验证

1. 运行 `npm run import:fetch -- --province=全国 --year=2025`
2. 确认日志输出 `[BIT] 限定枚举范围：31省 × 3年 = 93 请求`
3. 确认 `data-bit-provinces` / `data-bit-years` 的数量为实际枚举值

### Synthetic parent 验证

1. 运行 `npm run import:parse`（需先确保已有含黑龙江 majors 的 HIT normalized）
2. 运行 `npm run import:load`
3. 确认日志中 HIT majors 的 `sk:` 列从 34 降为 0
4. 确认 `syntheticParentsCreated` 计数 > 0
5. 查询数据库确认 `AdmissionRecord` 中存在 `isSyntheticParent = true` 的记录

### Filter-page 通用化验证

1. 运行 `npm run import:fetch -- --province=全国 --year=2025`
2. 确认 BIT 合成 HTML 标记为 `data-ajax-fetched="true"`（非 `data-bit-fetched`）
3. 运行 `npm run import:parse`
4. 确认 BIT parser 仍能正确解析 majors
5. 运行现有 `bit-undergrad-html.test.ts`，确认测试通过

---

## 文件变更清单

| 文件 | 改动类型 | 改动内容 |
|------|----------|----------|
| `scripts/data/fetch-official-sources.ts` | 重构 | 新增 `fetchFilterPageByAjax` 通用函数；`fetchBitAllProvinces` 改为调用通用函数+注入 BIT 专用配置+限定 `coverageYears`；预置 NJU 配置骨架 |
| `src/lib/import/upsert.ts` | 新增逻辑 | `preparedMajors` 后插入 synthetic parent 创建逻辑；`syntheticPrepared` 替代原有循环 |
| `src/lib/import/parsers/schools/bit-undergrad-html.ts` | 微调 | HTML 标记从 `data-bit-fetched` 改为 `data-ajax-fetched`；行正则同步更新 |


# Fetch 公开接口页稳定抓取 + Load 远端库解耦专项计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解决 HIT/BIT 公开接口页抓取不稳定和 `import:load` 远端库长时间停滞两个卡点，让新增河北/山东数据稳定落库并生成 `source-load-summary.json`，同时为后续学校线扩展提供可复用的 fetch+load 基础设施。

**Architecture:** `fetch-official-sources.ts` 按学校 key 分派不同的抓取策略（两阶段 AJAX token 复用 / filter-page 枚举查询），`load-normalized.ts` 改为并发文件处理 + 批量 institution 预加载，两者均保持向后兼容，不改变现有省级 parser 的行为。

**Tech Stack:** Node.js、TypeScript、Prisma、libsql/Turso、原生 `fetch`

---

## Summary

本轮聚焦两个卡点：

1. **Fetch 层**：HIT 的 `score-list` 接口因 token 时效问题返回"token校验失败"，BIT 的 `lnfs.html` 只是 filter shell 没有真实数据。解决方案是让 fetch 阶段在同一次会话中完成 token 提取与接口调用，对 BIT 则在 fetch 层遍历省份/年份枚举所有筛选组合，把完整数据回填进合成 HTML。

2. **Load 层**：24+ 个 normalized 文件逐个通过远程 Turso 做 DB 操作，每个文件都有 admission 批量身份查询 → institution 匹配 → major 身份查询，远程延迟累积导致长时间无输出。解决方案是：批量 institution 预加载（去重后一次查完）+ 文件级并行处理（可配置并发数）+ 并发安全的 institution 创建。

3. **后续步骤**：做完以上两项后，下一步是验证河北/山东真正落库、跑通完整 ETL 链路、产出 `source-load-summary.json`，然后根据 BIT 抓取的实际返回格式调整 parser，最终将 fetch 策略抽取为通用的 `filter-page` 接口枚举模式。

---

## Current State Analysis

### 抓取层的两个卡点

#### HIT：token 会话失效

当前 `fetch-official-sources.ts` 第 21-64 行的 `enrichHitScoreHtml()`：

- 从已落盘的静态 HTML 中提取 `<input id="token">` 的 `name/value`
- POST `/information/score-list` 时携带这些 token
- 实测返回 `{"success":0,"errmsg":"token校验失败"}`

根因：token 是服务端 session 绑定的，页面下载到本地后 session 已过期。当前静默失败逻辑（第 47-49 行）不产生任何告警，导致永远只能保存空 HTML shell。

#### BIT：只有 filter shell，从未调用 AJAX

当前 `school-source-registry.ts` 将 BIT 注册为 `pageMode: 'filter-page'`、`status: 'candidate'`。`fetch-official-sources.ts` 对 BIT 只是下载 `lnfs.html` 并保存，parser `bit-undergrad-html.ts` 虽然检测到了 `f/ajax_lnfs` / `f/ajax_lnfs_param` 的存在性，但从未实际调用这些端点抓取数据。

BIT 页面的实际数据流是：
1. 页面加载 → `$.ajax` 同步请求 `f/ajax_lnfs_param` 获取省份/年份/科类筛选选项
2. 用户选择省份+年份 → `getFormData()` 调用 `f/ajax_lnfs` 获取表格数据
3. 数据通过模板引擎 `sszygradeList` 渲染到 `#sszygradeListPlace`

目前这些步骤都未在 ETL 中实现。

### Load 层的卡点

#### 远端远程延迟累积

- `load-normalized.ts` 第 55 行 `for (const file of files)` 逐个串行处理
- `upsert.ts` 中每个 admission 都做 `ensureInstitution()`（含 `matchInstitution` DB 查询 + 可能 create + alias upsert）
- `upsert.ts` 中 admission identity 查询分块（每 500 条一块），但块之间串行
- 每个 major 都是单独的 create/update
- 对远程 Turso，每次 DB 操作都有 100-300ms HTTP 往返延迟

24+ 个文件 × 每个文件数百到数千条 admissions × 多次 DB 操作 = 数万次远程请求，累积延迟可达数十分钟。

#### 上一次执行停滞的位置

```
loaded .../全国/2026/bit-undergrad-html-all-ccd34f769383.html.json
```
之后卡在下一个文件（可能是河北的大文件）的 admission upsert 循环中，长时间无输出导致终端看起来像是"卡死"。

---

## Proposed Changes

### 一、Fetch 改造：A.1 HIT 两阶段 token 复用抓取

#### 修改 `scripts/data/fetch-official-sources.ts`

What：新增 `fetchHitWithFreshToken()` 函数，在一次请求生命周期内完成 HTML 下载 → token 提取 → score-list POST → 数据回填。

Why：当前先落盘再读取的流程导致 token 过期。需要把 token 提取和接口调用合并到同一次 HTTP 会话中。

How：

在 `fetchOne()` 之前新增：

```typescript
async function fetchHitWithFreshToken(entry: SourceRegistryEntry): Promise<Buffer> {
  // 第 1 阶段：获取页面 HTML，同时记住 Set-Cookie
  const pageResponse = await fetch(entry.officialUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  const html = await pageResponse.text();

  const tokenMatch = html.match(/<input[^>]*id="token"[^>]*name="([^"]+)"[^>]*value="([^"]+)"/i);
  const filterMatch = html.match(/id="filter-info"[^>]*data-province="([^"]+)"[^>]*data-year="([^"]+)"/i);

  if (!tokenMatch || !filterMatch) {
    console.warn(`[HIT] 未提取到 token 或 filter-info，保存原始 HTML：${entry.officialUrl}`);
    return Buffer.from(html, 'utf8');
  }

  const [, tokenKey, tokenValue] = tokenMatch;
  const [, province, year] = filterMatch;
  const setCookieHeader = pageResponse.headers.get('set-cookie');

  // 第 2 阶段：用同一会话的 token 立即 POST
  const scoreResponse = await fetch(new URL('/information/score-list', entry.officialUrl).toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      accept: 'application/json,text/plain,*/*',
      'x-requested-with': 'XMLHttpRequest',
      referer: entry.officialUrl,
      ...(setCookieHeader ? { cookie: setCookieHeader.split(';')[0] } : {}),
    },
    body: new URLSearchParams({ year, province, token_key: tokenKey, token_value: tokenValue }),
  });

  if (!scoreResponse.ok) {
    console.error(`[HIT] score-list POST 返回 ${scoreResponse.status}`);
    return Buffer.from(html, 'utf8');
  }

  const payload = (await scoreResponse.json().catch(() => null)) as {
    success?: number;
    data?: { score?: Array<{ campus?: string; speciality?: string; category?: string; max?: string; avg?: string; min?: string }> };
  } | null;

  if (!payload || payload.success !== 1 || !payload.data?.score?.length) {
    console.error(`[HIT] score-list 返回空数据，success=${payload?.success}`);
    return Buffer.from(html, 'utf8');
  }

  // 把 AJAX 行回填到 HTML 内，替换空 <tbody>
  const rows = payload.data.score
    .map((item) =>
      `<tr><td>${item.campus ?? ''}</td><td>${item.speciality ?? ''}</td><td>${item.category ?? ''}</td><td>${item.max ?? ''}</td><td>${item.avg ?? ''}</td><td>${item.min ?? ''}</td></tr>`
    )
    .join('');

  return Buffer.from(html.replace(/<tbody id="score-list">/i, `<tbody id="score-list">${rows}`), 'utf8');
}
```

替换 `fetchOne()` 第 82-85 行：

```typescript
// 替换原有的 enrichHitScoreHtml 调用
if (entry.schoolKey === 'hit-undergrad' && entry.sourceType === 'html') {
  buffer = await fetchHitWithFreshToken(entry);
}
```

同时删除旧的 `enrichHitScoreHtml()` 函数（第 21-64 行）。

#### 修改 `src/lib/import/parsers/schools/hit-undergrad-html.test.ts`

What：补一个测试，确保回填成功后的 HTML 能被 parser 正确解析出 majors。

Why：当前 parser 的单元测试只测了静态表格场景，需要覆盖 AJAX 数据回填后的 HTML 格式。

How：

```typescript
test('HIT adapter 能从回填后的 AJAX 数据中提取 majors', () => {
  const source = makeHitSource();
  const rows: RawSourceRow[] = [{
    ...makeRawRow(),
    rawText: '<tbody id="score-list"><tr><td>校本部</td><td>工科试验班</td><td>物理+化学</td><td>681</td><td>681</td><td>681</td></tr></tbody>',
    rawFields: { html: '<tbody id="score-list"><tr><td>校本部</td><td>工科试验班</td><td>物理+化学</td><td>681</td><td>681</td><td>681</td></tr></tbody>' },
  }];

  const parsed = parseHitUndergradHtml(source, rows);
  assert.ok(parsed.majors.length > 0);
  assert.ok(parsed.majors[0].majorName === '工科试验班');
  assert.ok(parsed.majors[0].parentAdmissionLocator != null);
});
```

### 二、Fetch 改造：A.2 BIT 完整 AJAX 枚举抓取

#### 修改 `scripts/data/fetch-official-sources.ts`

What：新增 `fetchBitAllProvinces()` 函数，在 fetch 阶段枚举 BIT 的省份/年份筛选，把所有数据汇总成一张合成 HTML。

Why：BIT 是 filter-page 类型，默认页永远是"没有找到匹配的记录"。必须主动遍历所有筛选组合才能拿到数据。把这项工作放在 fetch 阶段，parser 只需从合成 HTML 中提取。

How：

```typescript
async function fetchBitAllProvinces(entry: SourceRegistryEntry): Promise<Buffer> {
  const baseUrl = new URL(entry.officialUrl).origin;

  // Step 1: 获取筛选选项
  const paramResponse = await fetch(`${baseUrl}/static/front/bit/basic/html_web/f/ajax_lnfs_param`, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'x-requested-with': 'XMLHttpRequest',
      referer: entry.officialUrl,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  if (!paramResponse.ok) {
    console.error(`[BIT] f/ajax_lnfs_param 失败 (${paramResponse.status})`);
    const shellResponse = await fetch(entry.officialUrl);
    return Buffer.from(await shellResponse.arrayBuffer());
  }

  const paramData = (await paramResponse.json()) as {
    state?: number;
    data?: {
      ssmc_nf_klmc_sex_campus_zslx_list?: Record<string, Record<string, string[]>>;
    };
  };

  if (paramData.state !== 1 || !paramData.data?.ssmc_nf_klmc_sex_campus_zslx_list) {
    console.warn('[BIT] 筛选参数列表为空');
    const shellResponse = await fetch(entry.officialUrl);
    return Buffer.from(await shellResponse.arrayBuffer());
  }

  // 从筛选选项里提取省份列表（key 格式为 "ssmc" 的值集合）
  const filterLists = paramData.data.ssmc_nf_klmc_sex_campus_zslx_list;
  const provinceList = new Set<string>();
  const yearList = new Set<string>();
  for (const [dimKey, dimValues] of Object.entries(filterLists)) {
    if (dimKey === 'ssmc') {
      for (const v of Object.values(dimValues)) {
        if (Array.isArray(v)) v.forEach((x) => provinceList.add(x));
      }
    }
    if (dimKey === 'nf') {
      for (const v of Object.values(dimValues)) {
        if (Array.isArray(v)) v.forEach((x) => yearList.add(x));
      }
    }
  }

  const allRows: string[] = [];
  const provinces = [...provinceList].filter(Boolean);
  const years = [...yearList].filter(Boolean);

  if (provinces.length === 0 || years.length === 0) {
    console.warn('[BIT] 省份/年份列表为空，保存原始 HTML');
    const shellResponse = await fetch(entry.officialUrl);
    return Buffer.from(await shellResponse.arrayBuffer());
  }

  // Step 2: 遍历所有省/年组合
  for (const province of provinces) {
    for (const year of years) {
      const dataResponse = await fetch(`${baseUrl}/static/front/bit/basic/html_web/f/ajax_lnfs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          accept: 'application/json,text/plain,*/*',
          'x-requested-with': 'XMLHttpRequest',
          referer: entry.officialUrl,
        },
        body: new URLSearchParams({ ssmc: province, nf: year, klmc: '', zslx: '' }),
      });

      if (!dataResponse.ok) {
        console.warn(`[BIT] f/ajax_lnfs 失败 province=${province} year=${year} (${dataResponse.status})`);
        continue;
      }

      const data = (await dataResponse.json()) as {
        state?: number;
        data?: { sszygradeList?: Array<Record<string, string>> };
      };

      if (data.state === 1 && data.data?.sszygradeList?.length) {
        for (const row of data.data.sszygradeList) {
          const cells = [
            row.nf ?? '', row.ssmc ?? '', row.klmc ?? '', row.sex ?? '',
            row.campus ?? '', row.zyname ?? '', row.zyminScore ?? '', row.zyavgScore ?? '', row.zymaxScore ?? '',
            row.zylqrs ?? '', row.zypc ?? ''
          ].join('</td><td>');
          allRows.push(`<tr data-bit-nf="${row.nf ?? ''}" data-bit-ssmc="${row.ssmc ?? ''}"><td>${cells}</td></tr>`);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200)); // 限流
    }
  }

  // Step 3: 构造合成 HTML
  const shellHtml = `<html><body>
    <table id="score-list" data-bit-fetched="true" data-bit-provinces="${provinces.length}" data-bit-years="${years.length}">
      <thead><tr><th>年份</th><th>省份</th><th>科类</th><th>性别</th><th>校区</th><th>专业名称</th><th>最低分</th><th>平均分</th><th>最高分</th><th>录取人数</th><th>批次</th></tr></thead>
      <<tbody>>${allRows.join('\n')}</tbody>
    </table>
  </body></html>`;

  return Buffer.from(shellHtml, 'utf8');
}
```

在 `fetchOne()` 中新增 BIT 分支：

```typescript
// 在现有 hit-undergrad 分支之后
if (entry.schoolKey === 'bit-undergrad' && entry.sourceType === 'html') {
  buffer = await fetchBitAllProvinces(entry);
}
```

#### 修改 `src/lib/import/parsers/schools/bit-undergrad-html.ts`

What：当 HTML 标记 `data-bit-fetched="true"` 时，直接解析 `<tbody>` 里的 `<tr>` 行。

Why：当前 parser 只检测"前台空壳"并输出 gap。现在 fetch 层已经把数据回填，parser 需要能消费这种合成格式。

How：

```typescript
export function parseBitUndergradHtml(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const html = String(rows[0]?.rawFields?.html ?? '');
  const htmlKind = String(rows[0]?.rawFields?.htmlKind ?? '');

  // 新增：检测是否为 fetch 层已成功枚举的完整数据
  const isFetched = html.includes('data-bit-fetched="true"');

  if (isFetched) {
    const trMatches = html.match(/<tr\s+data-bit-/gi);
    if (!trMatches || trMatches.length === 0) {
      return { source, admissions: [], majors: [], issues: [], gaps: ['school_adapter_pending'], verificationNotes: ['school_ajax_fetch_no_rows'] };
    }

    const majors: NormalizedMajorRecord[] = [];
    const rowRegex = /<tr\s+data-bit-nf="([^"]*)"\s+data-bit-ssmc="([^"]*)"><td>(.*?)<\/td><\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const [, yearStr, province, cellsText] = match;
      const cells = cellsText.split('</td><td>');
      // 列序：年份, 省份, 科类, 性别, 校区, 专业名称, 最低分, 平均分, 最高分, 录取人数, 批次
      const nf = cells[0] ?? yearStr;
      const ssmc = cells[1] ?? province;
      const klmc = cells[2] ?? '';
      const campus = cells[4] ?? '';
      const majorName = cells[5] ?? '';
      const minScoreStr = cells[6] ?? '';
      const minScore = Number.parseInt(minScoreStr, 10);
      if (!majorName || Number.isNaN(minScore)) continue;

      const year = Number.parseInt(nf, 10);
      const parentLocator = {
        examCategory: 'gaokao' as const,
        year,
        province: ssmc,
        subjectGroup: klmc || undefined,
        batch: '本科批',
        admissionType: '统招' as const,
        institutionName: '北京理工大学',
        institutionCode: null as string | null,
        granularity: 'institution' as const,
        campusName: campus || undefined,
        groupCode: null as string | null,
      };

      majors.push({
        examCategory: 'gaokao',
        granularity: 'major',
        majorName,
        majorCode: null,
        minScore,
        majorMinRank: null,
        parentAdmissionRowHash: '',
        parentAdmissionLocator: parentLocator,
        sourceUrl: source.officialUrl,
        rawRowHash: '',
      });
    }

    return {
      source,
      admissions: [],
      majors,
      issues: [],
      gaps: [],
      verificationNotes: ['school_ajax_fully_fetched'],
    };
  }

  // 原有逻辑保持不变（HTML shell 检测）
  const hasEmptyState = html.includes('没有找到匹配的记录');
  const hasFilterHooks = html.includes('f/ajax_lnfs') || html.includes('filterCache_copy.js') || html.includes('data-param="');

  return {
    source,
    admissions: [],
    majors: [],
    issues: rows[0] ? [] : ['未读取到北京理工大学官网静态页面内容'],
    gaps:
      htmlKind === 'home-shell'
        ? ['school_page_home_shell_fallback', 'school_page_filter_enumeration_unverified']
        : hasEmptyState
          ? ['school_page_default_state_incomplete', 'school_page_filter_enumeration_unverified']
          : hasFilterHooks
            ? ['school_page_filter_enumeration_unverified']
            : ['school_adapter_pending'],
    verificationNotes: rows[0]
      ? [`captured_html_snapshot:${createRowHash([source.officialUrl, rows[0].rawText.slice(0, 80)])}`]
      : [],
  };
}
```

### 三、Load 改造：B.2 批量 institution 预加载

#### 修改 `src/lib/import/upsert.ts`

What：在 `upsertAdmissionBundle()` 主循环之前，把涉及的所有 unique institution 一次性 match/create，后续 admission 循环直接从缓存取值。

Why：当前每个 admission 都单独调用 `ensureInstitution()`，每个调用都有 `matchInstitution` 查询 + 可能的 create + alias upsert。对有数千条 admission 的文件来说，大部分 institution 是重复的，批量预加载可大幅减少 DB 往返。

How：

在 `upsertAdmissionBundle()` 的 counter 初始化之后、admission identity 查询之前插入：

```typescript
// 批量预加载：收集所有唯一 institution
const uniqueInstitutionKeys = new Set<string>();
const institutionMap = new Map<string, { code: string | null; rawName: string; normalizedName: string }>();

for (const record of params.admissions) {
  const key = `${record.institutionCode ?? ''}::${record.rawInstitutionName}`;
  if (!uniqueInstitutionKeys.has(key)) {
    uniqueInstitutionKeys.add(key);
    institutionMap.set(key, {
      code: record.institutionCode ?? null,
      rawName: record.rawInstitutionName,
      normalizedName: record.institutionName,
    });
  }
}

// 批量匹配 institution
const institutionCache = new Map<string, { institutionId: number; institutionCode: string | null; matchedName: string }>();

for (const [key, info] of institutionMap) {
  // 先尝试 match
  let matched = await matchInstitution({
    institutionCode: info.code ?? undefined,
    rawInstitutionName: info.rawName,
  });

  if (!matched.institutionId) {
    // 新建 institution
    const created = await prisma.institution.create({
      data: {
        name: info.normalizedName,
        normalizedName: info.normalizedName,
        code: info.code ?? undefined,
        category: '普通本科',
        province: '全国',
        website: null,
      },
      select: { id: true, code: true, name: true },
    });

    // 创建 alias
    await prisma.institutionAlias.upsert({
      where: { institutionId_aliasName: { institutionId: created.id, aliasName: info.rawName } },
      update: { normalizedAlias: info.normalizedName, institutionCode: info.code ?? undefined },
      create: { institutionId: created.id, aliasName: info.rawName, normalizedAlias: info.normalizedName, institutionCode: info.code ?? undefined, sourceName: '官方导入', sourceUrl: params.admissions.find((a) => `${a.institutionCode ?? ''}::${a.rawInstitutionName}` === key)?.sourceUrl },
    });

    matched = { institutionId: created.id, institutionCode: created.code, matchedName: created.name };
  }

  institutionCache.set(key, matched);
}
```

然后在 admission 循环中将原有的 `const institution = await ensureInstitution(record)` 替换为：

```typescript
const cacheKey = `${record.institutionCode ?? ''}::${record.rawInstitutionName}`;
const institution = institutionCache.get(cacheKey);
if (!institution || !institution.institutionId) {
  counters.skipped += 1;
  counters.unresolvedInstitutions.push({
    institutionCode: record.institutionCode,
    rawInstitutionName: record.rawInstitutionName,
    sourceUrl: record.sourceUrl,
  });
  continue;
}
```

旧的 `ensureInstitution()` 函数可以保留不删（如果其他地方引用），但 `upsertAdmissionBundle` 内部不再调用它。

### 四、Load 改造：B.1 文件级并行处理

#### 修改 `scripts/data/load-normalized.ts`

What：将 `main()` 中的串行 `for` 循环改为并发控制器，默认 4 个文件并行处理。

Why：当前 24+ 个文件串行处理，每个文件内的 batch 查询虽有并行，但文件之间完全串行。在远端库延迟稳定在 100-300ms 时，并行 4 个文件可带来接近 4 倍的速度提升。

How：

在文件顶部新增并发工具函数：

```typescript
async function withConcurrency<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  concurrency: number = 4
): Promise<void> {
  const queue = [...items];
  const total = items.length;
  const workers: Promise<void>[] = [];

  for (let w = 0; w < concurrency; w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift()!;
          const idx = total - queue.length - 1;
          try {
            await fn(item, idx);
          } catch (error) {
            console.error(`[CONCURRENT] 文件处理失败: ${error instanceof Error ? error.message : String(error)}`);
            // 不中断其他 worker
          }
        }
      })()
    );
  }

  await Promise.all(workers);
}
```

改造 `main()` 中的文件处理循环：

```typescript
const targetFiles = files.filter((f) => {
  // 先用同步方式快速检查是否需要跳过
  // 注意：这里改为在并行处理器内做 skip 判断
  return true;
});

await withConcurrency(
  targetFiles,
  async (file, idx) => {
    const content = JSON.parse(await fs.readFile(file, 'utf8')) as ParsedSourceDocument;
    if (content.verificationNotes?.includes('score_ladder_only')) return;

    const sourceDocument = await prisma.sourceDocument.findFirst({
      where: { officialUrl: content.source.officialUrl },
      orderBy: { id: 'desc' },
    });

    const counters = await upsertAdmissionBundle({
      admissions: content.admissions,
      majors: content.majors,
      sourceDocumentId: sourceDocument?.id,
    });

    // 注意：这些计数器更新在 Node.js 单线程异步的同一微任务内是安全的
    parsedCount += content.admissions.length;
    importedCount += counters.importedAdmissions + counters.importedMajors;
    updatedCount += counters.updatedAdmissions + counters.updatedMajors;
    supplementedMajorCount += counters.supplementedMajors ?? 0;
    dedupedMajorCount += counters.dedupedMajors ?? 0;
    syntheticParentsCreated += counters.syntheticParentsCreated ?? 0;
    skippedCount += counters.skipped;
    unresolved.push(
      ...counters.unresolvedInstitutions.map(
        (item) => `${item.rawInstitutionName},${item.institutionCode ?? ''},${item.sourceUrl}`
      )
    );
    gapSummary.push(buildGapSummaryEntry(file, content));
    sourceLoadSummary.push(buildSourceLoadSummaryEntry(file, content, counters));

    const progress = `[${String(idx + 1).padStart(3, ' ')}/${targetFiles.length}]`;
    const detail = `adm: +${counters.importedAdmissions}/~${counters.updatedAdmissions} maj: +${counters.importedMajors}/~${counters.updatedMajors} sk:${counters.skipped}`;
    console.log(`${progress} ${detail} ${path.basename(file, '.json')}`);
  },
  process.env.LOAD_CONCURRENCY ? Number.parseInt(process.env.LOAD_CONCURRENCY, 10) : 4
);
```

### 五、后续整体步骤规划

做完以上四项后的推进顺序：

#### 步骤 5：验证 HIT/BIT fetch + parse + load 全链路

- 运行 `npm run import:fetch -- --province=全国 --year=2025`
- 检查 HIT HTML 是否包含实际表格行、BIT HTML 是否标记 `data-bit-fetched="true"`
- 运行 `npm run import:parse` 检查 normalized 产物是否有 majors
- 运行 `npm run import:load` 确认新版 batch institution + 并发处理正常完成
- 运行 `npm run import:report` 生成最新 coverage/source-load-summary/gap-summary

#### 步骤 6：验证河北/山东新省份落库

- 运行 `npm run import:fetch -- --province=河北 --year=2025 && npm run import:fetch -- --province=山东 --year=2025`
- 检查 `source-load-summary.json` 里河北/山东条目有非零的 `importedMajors`
- 检查 `coverage-summary.json` 里河北/山东 source 有正确的 `nativeMajorCount`

#### 步骤 7：根据 BIT 实际返回格式调整 parser

- BIT 的 `f/ajax_lnfs` 返回的 `sszygradeList` 数组对象字段名需要首次抓取后确认
- 如有 `zylqrs` / `zypc` 等额外字段，同步更新 bit-undergrad-html.ts 的列映射
- 确认 BIT 的 `ssmc_nf_klmc_sex_campus_zslx_list` 各维度 key 名的实际拼写

#### 步骤 8：抽取通用的 filter-page 抓取模式

- 把 `fetchBitAllProvinces()` 中的核心逻辑（获取筛选选项 → 枚举组合 → 限流请求 → 合成 HTML）抽成可复用函数 `fetchFilterPageByAjax()`
- 参数：`baseUrl`、`paramEndpoint`、`dataEndpoint`、枚举维度 map
- 南京大学（NJU）同属 filter-page，可复用此模式

#### 步骤 9：继续国内省级扩线

- 评估贵州同结构历史类 PDF URL 清单
- 评估下一批有稳定公开下载源的新省份（天津、福建等，需先验证 URL 稳定性）

---

## Assumptions & Decisions

1. HIT 的 `score-list` 接口依赖的 token 不需要其他复杂认证（如 CSRF header），只依赖 cookie/session 绑定。如果 token 方案仍然失败，HIT 降级为 candidate+filter-page，不阻塞主链路。
2. BIT 的 AJAX 接口不需要 CSRF token，且各省份/年份枚举总数在可控范围内（~31省×3年≈93次请求，每次 200ms 延迟≈20秒完成）。
3. 文件级并行数默认 4，可通过 `LOAD_CONCURRENCY` 环境变量调整，不会硬编码。
4. Node.js 单线程模型下，`parsedCount += ...` 这类同文件内的变量更新天然安全，不会出现竞态条件——因为每个 `await` 后的代码恢复执行时仍在同一线程中。
5. 批量 institution 预加载中的 `prisma.institution.create` 在同一次 `upsertAdmissionBundle` 调用内不会产生重复的 institution（因为先做了 `uniqueInstitutionKeys` 去重）。
6. 本轮不改动 Prisma schema、不改动 identity/去重逻辑。

## Verification steps

### Fetch 验证

1. 运行 `npm run import:fetch -- --province=全国 --year=2025`
2. 确认 HIT 的 raw HTML 文件大小 > 5KB（原来只有 2-3KB 的骨架）
3. `grep` 确认 HIT HTML 包含 `<tr><td>校本部</td>`
4. 确认 BIT 的 raw HTML 包含 `data-bit-fetched="true"`
5. 运行 `npm run import:parse`
6. 确认 `data/normalized/全国/2025/hit-undergrad-*-*.html.json` 中 `majors: []` 变成非空
7. 确认 `data/normalized/全国/2025/bit-undergrad-*-*.html.json` 中 `majors: []` 变成非空

### Load 验证

1. 运行 `npm run import:load`
2. 确认每个文件的输出是 `[1/24] adm: +.. /~.. maj: +.. /~.. sk:..` 格式
3. 确认不会长时间无输出
4. 确认 `data/reports/source-load-summary.json` 被重新生成
5. 检查河北/山东条目有非零 `importedMajors`

### 报告验证

1. `data/reports/coverage-summary.json` 中 BIT 的 `schoolGapState` 从 `school_page_filter_enumeration_unverified` 变为 `null`（因为 `majorImportedCount > 0`）
2. `data/reports/coverage-summary.json` 中 HIT 的 `schoolGapState` 同理
3. 河北 sourceStatus 为 `active`，`nativeMajorCount > 0`


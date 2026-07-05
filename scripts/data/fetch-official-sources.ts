import 'dotenv/config';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '@/lib/prisma';
import { getAllIngestSources, SOURCE_REGISTRY } from '@/lib/import/source-registry';
import { SCHOOL_SOURCE_REGISTRY } from '@/lib/import/school-source-registry';
import type { SourceRegistryEntry } from '@/lib/import/types';

const ROOT = process.cwd();
const RAW_ROOT = path.join(ROOT, 'data', 'raw');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function fetchHitWithFreshToken(entry: SourceRegistryEntry): Promise<Buffer> {
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

  const rows = payload.data.score
    .map((item) =>
      `<tr><td>${item.campus ?? ''}</td><td>${item.speciality ?? ''}</td><td>${item.category ?? ''}</td><td>${item.max ?? ''}</td><td>${item.avg ?? ''}</td><td>${item.min ?? ''}</td></tr>`
    )
    .join('');

  return Buffer.from(html.replace(/<tbody id="score-list">/i, `<tbody id="score-list">${rows}`), 'utf8');
}

interface FilterPageAjaxConfig {
  schoolKey: string;
  paramEndpoint: string;
  dataEndpoint: string;
  provinceParamName: string;
  yearParamName: string;
  extractDimensionKeys: (paramData: Record<string, unknown>) => { provinces: string[]; years: string[] };
  extractRowCells: (row: Record<string, string>) => string[];
  buildTableHead: (provinces: string[], years: string[]) => string;
}

async function fetchFilterPageByAjax(
  entry: SourceRegistryEntry,
  config: FilterPageAjaxConfig
): Promise<Buffer> {
  const baseUrl = new URL(entry.officialUrl).origin;

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

  const head = config.buildTableHead(provinces, years);
  const shellHtml = `<html><body>
    <table id="score-list" data-ajax-fetched="true" data-ajax-school="${config.schoolKey}" data-ajax-provinces="${provinces.length}" data-ajax-years="${years.length}">
      ${head}
      <tbody>${allRows.join('\n')}</tbody>
    </table>
  </body></html>`;

  return Buffer.from(shellHtml, 'utf8');
}

// BIT 专用：通过 AJAX 枚举所有 province×year 筛选组合
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
    buildTableHead: (_p, _y) =>
      '<thead><tr><th>年份</th><th>省份</th><th>科类</th><th>性别</th><th>校区</th><th>专业名称</th><th>最低分</th><th>平均分</th><th>最高分</th><th>类型</th><th>人数</th></tr></thead>',
  });
}

// NJU filter-page 配置（同 BIT CMS 系统，AJAX 端点路径推断。站点维护期间未验证实际返回格式）
// 激活条件：确认 f/ajax_lnfs_param 和 f/ajax_lnfs 返回结构，并验证字段映射
// async function fetchNjuAllProvinces(entry: SourceRegistryEntry): Promise<Buffer> {
//   const schoolMeta = SCHOOL_SOURCE_REGISTRY.find((s) => s.schoolKey === 'nju-undergrad');
//   return fetchFilterPageByAjax(entry, {
//     schoolKey: 'nju-undergrad',
//     paramEndpoint: '/f/ajax_lnfs_param',
//     dataEndpoint: '/f/ajax_lnfs',
//     provinceParamName: 'ssmc',
//     yearParamName: 'nf',
//     extractDimensionKeys: (paramData) => {
//       const list = (paramData as { data?: { ssmc_nf_klmc_sex_campus_zslx_list?: Array<Record<string, string[]>> } }).data?.ssmc_nf_klmc_sex_campus_zslx_list ?? [];
//       const provinceSet = new Set<string>();
//       const yearSet = new Set<string>();
//       for (const item of list) {
//         const key = Object.keys(item)[0];
//         const parts = key.split('_');
//         if (parts.length >= 2) { provinceSet.add(parts[0]); yearSet.add(parts[1]); }
//       }
//       const coverageYears = schoolMeta?.coverageYears ?? [2025, 2024, 2023];
//       const allYears = [...yearSet].filter(Boolean);
//       return { provinces: [...provinceSet].filter(Boolean), years: allYears.filter((y) => coverageYears.includes(Number.parseInt(y, 10))) };
//     },
//     extractRowCells: (row) => [
//       row.nf ?? '', row.ssmc ?? '', row.klmc ?? '', row.sex ?? '',
//       row.campus ?? '', row.zymc ?? row.zyname ?? '', row.minScore ?? '',
//       row.maskAvgScore ?? row.avgScore ?? '', row.maskMaxScore ?? row.maxScore ?? '',
//       row.zylx ?? '', row.zylqrs ?? '',
//     ],
//     buildTableHead: (_p, _y) => '<thead><tr><th>年份</th><th>省份</th><th>科类</th><th>性别</th><th>校区</th><th>专业名称</th><th>最低分</th><th>平均分</th><th>最高分</th><th>类型</th><th>人数</th></tr></thead>',
//   });
// }

async function fetchOne(entry = SOURCE_REGISTRY[0]) {
  let response = await fetch(entry.officialUrl);
  if (!response.ok && entry.sourceLevel === 'school-official' && entry.sourceType === 'html') {
    response = await fetch(entry.officialUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        referer: entry.officialUrl.split('/html/')[0] + '/',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  }
  if (!response.ok) {
    throw new Error(`下载失败: ${entry.officialUrl} (${response.status})`);
  }

  let buffer = Buffer.from(await response.arrayBuffer());
  if (entry.schoolKey === 'hit-undergrad' && entry.sourceType === 'html') {
    buffer = await fetchHitWithFreshToken(entry);
  }
  if (entry.schoolKey === 'bit-undergrad' && entry.sourceType === 'html') {
    buffer = await fetchBitAllProvinces(entry);
  }
  const hash = await sha256(buffer);
  const extension = entry.sourceType === 'html'
    ? 'html'
    : entry.officialUrl.split('.').pop()?.split('?')[0] ?? entry.sourceType;
  const targetDir = path.join(RAW_ROOT, entry.province, String(entry.year));
  await ensureDir(targetDir);
  const fileName = `${entry.parserKey}-${entry.subjectGroup || 'all'}-${hash.slice(0, 12)}.${extension}`;
  const localPath = path.join(targetDir, fileName);

  await fs.writeFile(localPath, buffer);

  await prisma.sourceDocument.upsert({
    where: {
      officialUrl_sha256: {
        officialUrl: entry.officialUrl,
        sha256: hash,
      },
    },
    update: {
      localPath,
      fetchedAt: new Date(),
      parserKey: entry.parserKey,
      parserVersion: entry.parserVersion,
      sourceId: entry.sourceId,
      examCategory: entry.examCategory ?? 'gaokao',
      sourceScope: entry.sourceScope ?? 'ingest',
      sourceLevel: entry.sourceLevel ?? null,
      schoolKey: entry.schoolKey ?? null,
    },
    create: {
      sourceId: entry.sourceId,
      examCategory: entry.examCategory ?? 'gaokao',
      sourceScope: entry.sourceScope ?? 'ingest',
      sourceLevel: entry.sourceLevel ?? null,
      schoolKey: entry.schoolKey ?? null,
      province: entry.province,
      year: entry.year,
      title: entry.title,
      sourceType: entry.sourceType,
      granularity: entry.granularity,
      officialUrl: entry.officialUrl,
      localPath,
      sha256: hash,
      parserKey: entry.parserKey,
      parserVersion: entry.parserVersion,
      fetchedAt: new Date(),
    },
  });

  return { localPath, hash, title: entry.title };
}

async function main() {
  const provinceArg = process.argv.find((item) => item.startsWith('--province='))?.split('=')[1];
  const yearArg = process.argv.find((item) => item.startsWith('--year='))?.split('=')[1];

  const entries = getAllIngestSources().filter((entry) => {
    if (provinceArg && entry.province !== provinceArg) return false;
    if (yearArg && entry.year !== Number.parseInt(yearArg, 10)) return false;
    if (entry.sourceLevel === 'school-official' && entry.status === 'review') return false;
    return true;
  });

  await ensureDir(RAW_ROOT);

  for (const entry of entries) {
    const result = await fetchOne(entry);
    console.log(`fetched ${entry.province}-${entry.year}: ${result.localPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

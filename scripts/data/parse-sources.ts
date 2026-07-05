import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';

import AdmZip from 'adm-zip';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

import { prisma } from '@/lib/prisma';
import { getParserByKey } from '@/lib/import/parser-registry';
import { parseShandongRows } from '@/lib/import/parsers/shandong';
import { getAllIngestSources } from '@/lib/import/source-registry';
import type { ScoreRankPoint } from '@/lib/import/score-rank';
import type { ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const ROOT = process.cwd();
const NORMALIZED_ROOT = path.join(ROOT, 'data', 'normalized');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function normalizeRawFields(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim(), value == null ? '' : String(value).trim()])
  );
}

function detectSchoolHtmlKind(html: string): 'home-shell' | 'filtered-single-row' | 'unknown-html' {
  if (
    /首页/.test(html) &&
    /历年分数/.test(html) &&
    !/没有找到匹配的记录/.test(html) &&
    !/<tr>\s*<td>\s*\d{4}\s*<\/td>/i.test(html)
  ) {
    return 'home-shell';
  }

  if (/<tr>\s*<td>\s*2025\s*<\/td>\s*<td>\s*江苏\s*<\/td>/i.test(html)) {
    return 'filtered-single-row';
  }

  return 'unknown-html';
}

function rowsFromWorkbook(localPath: string, source: SourceRegistryEntry): RawSourceRow[] {
  const workbook = XLSX.readFile(localPath, { cellDates: false });
  const rows: RawSourceRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (source.parserKey === 'jiangsu') {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { defval: '', header: 1 });
      matrix.slice(5).forEach((row, index) => {
        const institutionCode = String(row[0] ?? '').trim();
        const groupText = String(row[1] ?? '').trim();
        const minScore = String(row[2] ?? '').trim();
        if (!institutionCode || !groupText || !minScore) return;

        rows.push({
          province: source.province,
          year: source.year,
          sourceUrl: source.officialUrl,
          sourceTitle: source.title,
          sourceType: source.sourceType,
          parserKey: source.parserKey,
          parserVersion: source.parserVersion,
          sheetName,
          rowNumber: index + 6,
          rawText: row.join(' ').trim(),
          rawFields: {
            groupText: `${institutionCode} ${groupText}`,
            投档最低分: minScore,
          },
        });
      });
      continue;
    }

    if (source.parserKey === 'zhejiang') {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { defval: '', header: 1 });
      matrix.slice(1).forEach((row, index) => {
        const institutionCode = String(row[0] ?? '').trim();
        const institutionName = String(row[1] ?? '').trim();
        const majorCode = String(row[2] ?? '').trim();
        const majorName = String(row[3] ?? '').trim();
        const planCount = String(row[4] ?? '').trim();
        const scoreText = String(row[5] ?? '').trim();
        const rankText = String(row[6] ?? '').trim();
        if (!institutionCode || !institutionName || !majorCode || !majorName || !scoreText) return;

        rows.push({
          province: source.province,
          year: source.year,
          sourceUrl: source.officialUrl,
          sourceTitle: source.title,
          sourceType: source.sourceType,
          parserKey: source.parserKey,
          parserVersion: source.parserVersion,
          sheetName,
          rowNumber: index + 2,
          rawText: row.join(' ').trim(),
          rawFields: {
            专业代号及名称: `${majorCode} ${majorName}`,
            院校代号及名称: `${institutionCode} ${institutionName}`,
            计划数: planCount,
            投档分: scoreText,
            位次: rankText,
          },
        });
      });
      continue;
    }

    if (source.parserKey === 'shandong') {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { defval: '', header: 1 });
      matrix.slice(2).forEach((row, index) => {
        const majorText = String(row[0] ?? '').trim();
        const institutionText = String(row[1] ?? '').trim();
        const planCount = String(row[2] ?? '').trim();
        const rankText = String(row[3] ?? '').trim();
        if (!majorText || !institutionText || !rankText) return;

        rows.push({
          province: source.province,
          year: source.year,
          sourceUrl: source.officialUrl,
          sourceTitle: source.title,
          sourceType: source.sourceType,
          parserKey: source.parserKey,
          parserVersion: source.parserVersion,
          sheetName,
          rowNumber: index + 3,
          rawText: row.join(' ').trim(),
          rawFields: {
            专业代号及名称: majorText,
            院校代号及名称: institutionText,
            投档计划数: planCount,
            最低位次: rankText,
          },
        });
      });
      continue;
    }

    if (source.parserKey === 'shandong-score-ladder') {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { defval: '', header: 1 });
      matrix.slice(1).forEach((row, index) => {
        const score = String(row[0] ?? '').trim();
        const cumulativeCount = String(row[2] ?? row[1] ?? '').trim();
        if (!score || !cumulativeCount) return;

        rows.push({
          province: source.province,
          year: source.year,
          sourceUrl: source.officialUrl,
          sourceTitle: source.title,
          sourceType: source.sourceType,
          parserKey: source.parserKey,
          parserVersion: source.parserVersion,
          sheetName,
          rowNumber: index + 2,
          rawText: row.join(' ').trim(),
          rawFields: {
            分数: score,
            累计人数: cumulativeCount,
          },
        });
      });
      continue;
    }

    if (source.parserKey === 'hebei') {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { defval: '', header: 1 });
      matrix.forEach((row, index) => {
        const institutionCode = String(row[0] ?? '').trim();
        const institutionName = String(row[1] ?? '').trim();
        const majorCode = String(row[2] ?? '').trim();
        const majorName = String(row[3] ?? '').trim();
        const scoreText = String(row[4] ?? '').trim();
        if (!/^\d{4}$/.test(institutionCode) || !majorName || !scoreText) return;

        rows.push({
          province: source.province,
          year: source.year,
          sourceUrl: source.officialUrl,
          sourceTitle: source.title,
          sourceType: source.sourceType,
          parserKey: source.parserKey,
          parserVersion: source.parserVersion,
          sheetName,
          rowNumber: index + 1,
          rawText: row.join(' ').trim(),
          rawFields: {
            院校代号: institutionCode,
            院校名称: institutionName,
            专业代号: majorCode,
            专业名称: majorName,
            投档最低分: scoreText,
            志愿号: String(row[11] ?? '').trim(),
          },
        });
      });
      continue;
    }

    if (source.parserKey === 'hunan') {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { defval: '', header: 1 });
      matrix.slice(3).forEach((row, index) => {
        const planType = String(row[0] ?? '').trim();
        const subjectType = String(row[1] ?? '').trim();
        const institutionName = String(row[3] ?? '').trim();
        const groupCode = String(row[4] ?? '').trim();
        const groupName = String(row[5] ?? '').trim();
        const score = String(row[6] ?? '').trim();
        const note = String(row[14] ?? '').trim();
        const actualInstitutionCode = String(row[2] ?? '').trim();
        if (!actualInstitutionCode || !institutionName || !score) return;

        rows.push({
          province: source.province,
          year: source.year,
          sourceUrl: source.officialUrl,
          sourceTitle: source.title,
          sourceType: source.sourceType,
          parserKey: source.parserKey,
          parserVersion: source.parserVersion,
          sheetName,
          rowNumber: index + 4,
          rawText: row.join(' ').trim(),
          rawFields: {
            计划类别: planType,
            科类: subjectType,
            院校代号: actualInstitutionCode,
            院校名称: institutionName,
            专业组编号: groupCode,
            专业组名称: groupName,
            投档线: score,
            备注: note,
          },
        });
      });
      continue;
    }

    if (source.parserKey === 'liaoning') {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { defval: '', header: 1 });
      matrix.slice(5).forEach((row, index) => {
        const institutionCode = String(row[0] ?? '').trim();
        const institutionName = String(row[1] ?? '').trim();
        const majorCode = String(row[2] ?? '').trim();
        const majorName = String(row[3] ?? '').trim();
        const score = String(row[4] ?? '').trim();
        if (!institutionCode || !institutionName || !majorCode || !majorName || !score) return;

        rows.push({
          province: source.province,
          year: source.year,
          sourceUrl: source.officialUrl,
          sourceTitle: source.title,
          sourceType: source.sourceType,
          parserKey: source.parserKey,
          parserVersion: source.parserVersion,
          sheetName,
          rowNumber: index + 6,
          rawText: row.join(' ').trim(),
          rawFields: {
            院校编号: institutionCode,
            招生院校: institutionName,
            专业编号: majorCode,
            招生专业: majorName,
            投档最低分: score,
          },
        });
      });
      continue;
    }

    const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    sheetRows.forEach((row, index) => {
      rows.push({
        province: source.province,
        year: source.year,
        sourceUrl: source.officialUrl,
        sourceTitle: source.title,
        sourceType: source.sourceType,
        parserKey: source.parserKey,
        parserVersion: source.parserVersion,
        sheetName,
        rowNumber: index + 2,
        rawText: Object.values(row).join(' ').trim(),
        rawFields: normalizeRawFields(row),
      });
    });
  }

  return rows;
}

function ladderFromRows(rows: RawSourceRow[]): ScoreRankPoint[] {
  return rows
    .map((row) => ({
      score: Number.parseInt(String(row.rawFields['分数'] ?? ''), 10),
      cumulativeCount: Number.parseInt(String(row.rawFields['累计人数'] ?? ''), 10),
    }))
    .filter((item) => Number.isFinite(item.score) && Number.isFinite(item.cumulativeCount));
}

function parseGuangdongPdfLines(text: string, source: SourceRegistryEntry): RawSourceRow[] {
  const rows: RawSourceRow[] = [];
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const detectedSubjectGroup = /普通类.*历史/.test(text)
    ? '历史类'
    : /普通类.*物理/.test(text)
      ? '物理类'
      : source.subjectGroup ?? '';

  if (!detectedSubjectGroup) {
    return [];
  }

  for (const line of lines) {
    if (
      line.startsWith('广东省') ||
      line.startsWith('第 ') ||
      line.includes('院校代码') ||
      line.startsWith('|')
    ) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 6) continue;
    const institutionCode = tokens[0];
    const maybeMinScore = Number.parseInt(tokens[tokens.length - 2] ?? '', 10);
    const maybeMinRank = Number.parseInt(tokens[tokens.length - 1] ?? '', 10);
    if (!/^[A-Z0-9]+$/.test(institutionCode) || Number.isNaN(maybeMinScore) || Number.isNaN(maybeMinRank)) {
      continue;
    }

    const groupCode = tokens[tokens.length - 5] ?? '';
    const planCount = tokens[tokens.length - 4] ?? '';
    const admittedCount = tokens[tokens.length - 3] ?? '';
    const institutionName = tokens.slice(1, tokens.length - 5).join(' ');
    if (!institutionName) continue;

    rows.push({
      province: source.province,
      year: source.year,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: source.sourceType,
      parserKey: source.parserKey,
      parserVersion: source.parserVersion,
      rawText: line,
      rawFields: {
        subjectGroup: detectedSubjectGroup,
        院校代码: institutionCode,
        院校名称: institutionName,
        专业组代码: groupCode,
        计划数: planCount,
        投档人数: admittedCount,
        投档最低分: String(maybeMinScore),
        投档最低排位: String(maybeMinRank),
      },
    });
  }

  return rows;
}

function parseJiangsuPdfLines(text: string, source: SourceRegistryEntry): RawSourceRow[] {
  const rows: RawSourceRow[] = [];
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    if (
      line.startsWith('江苏省') ||
      line.startsWith('第 ') ||
      line.includes('院校 代号') ||
      line.includes('投档 最低分') ||
      line.includes('语数 成绩')
    ) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 3) continue;
    if (!/^[A-Z0-9]+$/.test(tokens[0] ?? '')) continue;

    const scoreIndex = tokens.findIndex((token, index) => index > 0 && /^\d{3}$/.test(token));
    if (scoreIndex < 0) continue;

    const groupLabel = tokens.slice(0, scoreIndex).join(' ');
    const minScore = tokens[scoreIndex];
    if (!groupLabel.includes('专业组')) continue;

    rows.push({
      province: source.province,
      year: source.year,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: source.sourceType,
      parserKey: source.parserKey,
      parserVersion: source.parserVersion,
      rawText: line,
      rawFields: {
        groupText: groupLabel,
        投档最低分: minScore,
      },
    });
  }

  return rows;
}

function parseGuizhouPdfLines(text: string, source: SourceRegistryEntry): RawSourceRow[] {
  const rows: RawSourceRow[] = [];
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/第\s*\d+\s*页[,，]共\s*\d+\s*页/g, '\n')
    .replace(/序号院校[\s\S]*?投档最\s*低位次/g, '\n');
  const lines = normalized.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(\d{4})\s+(.+?)\s+(\d{3})\s+(.+?)\s+(一般统考生|中外合作办学)\s+(\d+)\s+(\d+)(?:\s+(\d+)\s+(\d+))?$/);
    if (!match) continue;

    rows.push({
      province: source.province,
      year: source.year,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: source.sourceType,
      parserKey: source.parserKey,
      parserVersion: source.parserVersion,
      rawText: line,
      rawFields: {
        院校代码: match[2],
        院校名称: match[3],
        专业代码: match[4],
        专业名称: match[5],
        招考类型: match[6],
        计划数: match[7],
        投档人数: match[8],
        投档最低分: match[9] ?? '',
        投档最低位次: match[10] ?? '',
      },
    });
  }

  return rows;
}

function parseShaanxiHtmlRows(html: string, source: SourceRegistryEntry): RawSourceRow[] {
  const rows: RawSourceRow[] = [];
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const tr of trMatches) {
    const cells = Array.from(tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
      .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (cells.length < 8 || cells[0] === '序号' || !/^\d+$/.test(cells[2] ?? '')) continue;

    rows.push({
      province: source.province,
      year: source.year,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: source.sourceType,
      parserKey: source.parserKey,
      parserVersion: source.parserVersion,
      rawText: cells.join(' '),
      rawFields: {
        科类: cells[1],
        院校代码: cells[2],
        院校名称: cells[3],
        计划数: cells[4],
        投档人数: cells[5],
        最低分: cells[6],
        最低位次: cells[7],
      },
    });
  }

  return rows;
}

async function rowsFromPdf(localPath: string, source: SourceRegistryEntry): Promise<RawSourceRow[]> {
  const buffer = await fs.readFile(localPath);
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();

  if (source.parserKey === 'guangdong') {
    return parseGuangdongPdfLines(parsed.text, source);
  }

  if (source.parserKey === 'jiangsu') {
    return parseJiangsuPdfLines(parsed.text, source);
  }

  if (source.parserKey === 'guizhou') {
    return parseGuizhouPdfLines(parsed.text, source);
  }

  return [];
}

async function rowsFromHtml(localPath: string, source: SourceRegistryEntry): Promise<RawSourceRow[]> {
  const html = await fs.readFile(localPath, 'utf8');

  if (source.parserKey === 'shaanxi') {
    return parseShaanxiHtmlRows(html, source);
  }

  return [{
    province: source.province,
    year: source.year,
    sourceUrl: source.officialUrl,
    sourceTitle: source.title,
    sourceType: source.sourceType,
    parserKey: source.parserKey,
    parserVersion: source.parserVersion,
    rowNumber: 1,
    rawText: html.replace(/\s+/g, ' ').trim(),
    rawFields: {
      html,
      htmlKind: source.sourceLevel === 'school-official' ? detectSchoolHtmlKind(html) : 'unknown-html',
    },
  }];
}

async function rowsFromZip(localPath: string, source: SourceRegistryEntry): Promise<RawSourceRow[]> {
  const extractDir = path.join(ROOT, '.tmp-import', source.province, String(source.year), path.basename(localPath, path.extname(localPath)));
  await ensureDir(extractDir);

  const zip = new AdmZip(localPath);
  zip.extractAllTo(extractDir, true);

  const entries = await fs.readdir(extractDir, { recursive: true });
  const files = entries
    .map((entry) => path.join(extractDir, String(entry)))
    .filter((file) => /\.(xlsx?|pdf)$/i.test(file));

  const rows: RawSourceRow[] = [];
  for (const file of files) {
    if (/\.pdf$/i.test(file)) {
      rows.push(...(await rowsFromPdf(file, source)));
      continue;
    }

    rows.push(...rowsFromWorkbook(file, source));
  }

  return rows;
}

async function parseDocument(sourceDoc: {
  localPath: string;
  officialUrl: string;
  province: string;
  year: number;
  parserKey: string;
}) {
  const source = getAllIngestSources(sourceDoc.year).find((item) => item.officialUrl === sourceDoc.officialUrl);
  if (!source) {
    return null;
  }

  let rows: RawSourceRow[] = [];
  if (/\.zip$/i.test(sourceDoc.localPath)) {
    rows = await rowsFromZip(sourceDoc.localPath, source);
  } else if (/\.pdf$/i.test(sourceDoc.localPath)) {
    rows = await rowsFromPdf(sourceDoc.localPath, source);
  } else if (/\.html$/i.test(sourceDoc.localPath)) {
    rows = await rowsFromHtml(sourceDoc.localPath, source);
  } else if (/\.(xlsx|xls)$/i.test(sourceDoc.localPath)) {
    rows = rowsFromWorkbook(sourceDoc.localPath, source);
  }

  if (source.parserKey === 'shandong-score-ladder') {
    const outputPath = path.join(NORMALIZED_ROOT, source.province, String(source.year), `${path.basename(sourceDoc.localPath)}.json`);
    await ensureDir(path.dirname(outputPath));
    await fs.writeFile(
      outputPath,
      JSON.stringify({
        source,
        admissions: [],
        majors: [],
        issues: [],
        gaps: [],
        verificationNotes: ['score_ladder_only'],
        ladder: ladderFromRows(rows),
      }, null, 2),
      'utf8'
    );
    return outputPath;
  }

  let parsed: ParsedSourceDocument;
  if (source.parserKey === 'shandong') {
    const ladderDoc = await prisma.sourceDocument.findFirst({
      where: {
        province: source.province,
        year: source.year,
        parserKey: 'shandong-score-ladder',
      },
      orderBy: { id: 'desc' },
    });

    let ladder: ScoreRankPoint[] = [];
    if (ladderDoc && /\.(xlsx|xls)$/i.test(ladderDoc.localPath)) {
      ladder = ladderFromRows(rowsFromWorkbook(ladderDoc.localPath, {
        ...source,
        parserKey: 'shandong-score-ladder',
        officialUrl: ladderDoc.officialUrl,
        title: ladderDoc.title,
        sourceType: ladderDoc.sourceType as SourceRegistryEntry['sourceType'],
      }));
    }

    parsed = parseShandongRows(source, rows, ladder);
  } else {
    parsed = getParserByKey(source.parserKey)(source, rows);
  }

  const outDir = path.join(NORMALIZED_ROOT, source.province, String(source.year));
  await ensureDir(outDir);
  const outputPath = path.join(outDir, `${path.basename(sourceDoc.localPath)}.json`);
  await fs.writeFile(outputPath, JSON.stringify(parsed, null, 2), 'utf8');
  return outputPath;
}

async function main() {
  const docs = await prisma.sourceDocument.findMany({
    orderBy: [{ province: 'asc' }, { year: 'asc' }],
  });

  await ensureDir(NORMALIZED_ROOT);

  for (const doc of docs) {
    const outputPath = await parseDocument(doc);
    if (!outputPath) {
      console.log(`skip stale source ${doc.officialUrl}`);
      continue;
    }
    console.log(`parsed ${doc.officialUrl} -> ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

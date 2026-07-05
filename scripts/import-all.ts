import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { upsertAdmissionBundle } from '../src/lib/import/upsert';
import { parseShandongRows } from '../src/lib/import/parsers/shandong';
import { parseZhejiangRows } from '../src/lib/import/parsers/zhejiang';
import { parseJiangsuRows } from '../src/lib/import/parsers/jiangsu';
import { parseHunanRows } from '../src/lib/import/parsers/hunan';
import { parseLiaoningRows } from '../src/lib/import/parsers/liaoning';
import type { NormalizedAdmissionRecord, RawSourceRow, SourceRegistryEntry, SupportedSourceType } from '../src/lib/import/types';
import type { ScoreRankPoint } from '../src/lib/import/score-rank';

const PROVINCE_CN: Record<string, string> = {
  shandong: '山东',
  zhejiang: '浙江',
  jiangsu: '江苏',
  hunan: '湖南',
  liaoning: '辽宁',
};

type ParserId = 'shandong' | 'zhejiang' | 'jiangsu' | 'hunan' | 'liaoning';

const FILE_PATTERN = /^(shandong|zhejiang|jiangsu|hunan|liaoning)-(.+?)-[a-f0-9]{12,}\.(xlsx?|xls)$/;
const SCORE_LADDER_PATTERN = /^shandong-score-ladder-(.+?)-[a-f0-9]{12,}\.xls$/;

interface FileEntry {
  fullPath: string;
  basename: string;
  parserId: ParserId;
  subjectGroup: string;
  year: number;
}

function collectExcelFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(xlsx?|xls)$/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

function extractYear(filePath: string): number | null {
  const parts = filePath.split(path.sep);
  for (let i = parts.length - 1; i >= 0; i--) {
    const match = parts[i].match(/^(\d{4})$/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

function getExt(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

function makeSourceType(ext: string): SupportedSourceType {
  if (ext === '.xlsx') return 'xlsx';
  if (ext === '.xls') return 'xls';
  return 'xls';
}

function loadScoreLadder(filePath: string): ScoreRankPoint[] {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const ladder: ScoreRankPoint[] = [];
  for (const row of rows) {
    const score = Number(row['分数'] ?? row['score'] ?? row['总分'] ?? row['高考分'] ?? row['综合分']);
    const cumulativeCount = Number(row['累计人数'] ?? row['cumulativeCount'] ?? row['累计'] ?? row['人数'] ?? row['位次']);

    if (!isNaN(score) && !isNaN(cumulativeCount) && score > 0) {
      ladder.push({ score, cumulativeCount });
    }
  }

  return ladder;
}

function readExcelAsRows(filePath: string): { sheetName: string; rows: Record<string, unknown>[] } {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return { sheetName, rows };
}

function toRawSourceRows(
  rows: Record<string, unknown>[],
  source: SourceRegistryEntry,
  sheetName: string,
): RawSourceRow[] {
  return rows.map((row, index) => ({
    province: source.province,
    year: source.year,
    sourceUrl: `file://${source.officialUrl}`,
    sourceTitle: source.title,
    sourceType: source.sourceType,
    parserKey: source.parserKey,
    parserVersion: source.parserVersion,
    page: null,
    sheetName,
    rowNumber: index + 2,
    rawText: JSON.stringify(row),
    rawFields: row as Record<string, string | number | null | undefined>,
  }));
}

async function importFile(
  entry: FileEntry,
  scoreLadderMap: Map<string, ScoreRankPoint[]>,
): Promise<{ file: string; imported: number; updated: number; skipped: number }> {
  const { fullPath, basename, parserId, subjectGroup, year } = entry;
  const ext = getExt(fullPath);

  const source: SourceRegistryEntry = {
    province: PROVINCE_CN[parserId],
    year,
    title: basename,
    officialUrl: fullPath,
    sourceType: makeSourceType(ext),
    granularity: 'institution',
    parserKey: parserId,
    parserVersion: '1.0',
    subjectGroup,
    batch: '本科批',
  };

  const { sheetName, rows } = readExcelAsRows(fullPath);
  const rawRows = toRawSourceRows(rows, source, sheetName);

  let admissions: NormalizedAdmissionRecord[];

  if (parserId === 'shandong') {
    const scoreLadder = scoreLadderMap.get(subjectGroup) ?? [];
    const doc = parseShandongRows(source, rawRows, scoreLadder);
    admissions = doc.admissions;
  } else if (parserId === 'zhejiang') {
    const doc = parseZhejiangRows(source, rawRows);
    admissions = doc.admissions;
  } else if (parserId === 'jiangsu') {
    const doc = parseJiangsuRows(source, rawRows);
    admissions = doc.admissions;
  } else if (parserId === 'hunan') {
    const doc = parseHunanRows(source, rawRows);
    admissions = doc.admissions;
  } else if (parserId === 'liaoning') {
    const doc = parseLiaoningRows(source, rawRows);
    admissions = doc.admissions;
  } else {
    throw new Error(`未知解析器: ${parserId}`);
  }

  if (admissions.length === 0) {
    console.log(`  ⚠ 无有效数据行`);
    return { file: fullPath, imported: 0, updated: 0, skipped: rows.length };
  }

  const result = await upsertAdmissionBundle({ admissions });
  return {
    file: fullPath,
    imported: result.importedAdmissions,
    updated: result.updatedAdmissions,
    skipped: result.skipped,
  };
}

async function main() {
  const dataDir = path.resolve(process.cwd(), 'data/raw');

  if (!fs.existsSync(dataDir)) {
    console.log('data/raw/ 目录不存在，跳过导入');
    process.exit(0);
  }

  const allFiles = collectExcelFiles(dataDir);

  const scoreLadderFiles: string[] = [];
  const admissionEntries: FileEntry[] = [];

  for (const filePath of allFiles) {
    const basename = path.basename(filePath);

    if (SCORE_LADDER_PATTERN.test(basename)) {
      scoreLadderFiles.push(filePath);
      continue;
    }

    const match = basename.match(FILE_PATTERN);
    if (!match) {
      console.log(`⏭ 跳过无法匹配的文件: ${path.relative(process.cwd(), filePath)}`);
      continue;
    }

    const parserId = match[1] as ParserId;
    const subjectGroup = match[2];
    const year = extractYear(filePath);

    if (!year) {
      console.log(`⏭ 跳过无法识别年份的文件: ${path.relative(process.cwd(), filePath)}`);
      continue;
    }

    admissionEntries.push({
      fullPath: filePath,
      basename,
      parserId,
      subjectGroup,
      year,
    });
  }

  const scoreLadderMap = new Map<string, ScoreRankPoint[]>();
  for (const filePath of scoreLadderFiles) {
    const basename = path.basename(filePath);
    const match = basename.match(SCORE_LADDER_PATTERN);
    if (!match) continue;

    const subjectGroup = match[1];
    console.log(`📊 加载一分一段表: ${path.relative(process.cwd(), filePath)} (${subjectGroup})`);
    const ladder = loadScoreLadder(filePath);
    scoreLadderMap.set(subjectGroup, ladder);
    console.log(`   已加载 ${ladder.length} 条分数-位次记录`);
  }

  if (scoreLadderFiles.length > 0) {
    console.log('');
  }

  console.log(`找到 ${admissionEntries.length} 个招生数据文件\n`);

  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const entry of admissionEntries) {
    const relative = path.relative(process.cwd(), entry.fullPath);
    console.log(`📄 ${relative}`);
    console.log(`   解析器: ${entry.parserId} | 年份: ${entry.year} | 选科: ${entry.subjectGroup}`);

    try {
      const result = await importFile(entry, scoreLadderMap);
      totalImported += result.imported;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      console.log(`   新增 ${result.imported} | 更新 ${result.updated} | 跳过 ${result.skipped}\n`);
    } catch (err) {
      console.error(`   ❌ 处理失败: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  console.log('━'.repeat(40));
  console.log(`✅ 全部完成: 新增 ${totalImported} | 更新 ${totalUpdated} | 跳过 ${totalSkipped}`);
}

main().catch((err) => {
  console.error('导入失败:', err);
  process.exit(1);
});

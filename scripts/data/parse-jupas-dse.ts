/**
 * Parse JUPAS DSE Admissions Scores PDF → NormalizedAdmissionRecord[].
 * Supports 4 school-specific table formats (CityU/HKBU/CUHK/HKU/PolyU/etc.).
 * Usage: npx tsx scripts/data/parse-jupas-dse.ts [--year=2025]
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { NormalizedAdmissionRecord } from '@/lib/import/types';

interface JupasRow { institutionName: string; jsCode: string; programmeTitle: string; scoreFormula: string; median: number | null; lowerQuartile: number | null; }
function sha256(input: string): string { return crypto.createHash('sha256').update(input).digest('hex'); }

const PDF_ROOT = path.join(process.cwd(), 'data', 'raw', '香港', 'JUPAS');
const OUT_ROOT = path.join(process.cwd(), 'data', 'normalized', '香港');
const INST_MAP: Record<string, string> = {
  'City University of Hong Kong': '香港城市大学', 'Hong Kong Baptist University': '香港浸会大学',
  'Lingnan University': '岭南大学', 'The Chinese University of Hong Kong': '香港中文大学',
  'The Education University of Hong Kong': '香港教育大学', 'The Hong Kong Polytechnic University': '香港理工大学',
  'The Hong Kong University of Science and Technology': '香港科技大学', 'The University of Hong Kong': '香港大学',
  'Hong Kong Metropolitan University': '香港都会大学',
};

// ------ Parsers ------

function parseJupasText(text: string): JupasRow[] {
  const lines = text.split('\n');
  let currentInst = '', rows: JupasRow[] = [];
  let currentJS = '', accLines: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/[\f\t]/g, ' ').trimEnd();

    const instM = line.match(/^(.+)\s+[\u2013-]\s+(\d{4})\s+JUPAS Admissions Scores/i);
    if (instM && instM[1].trim().length > 5 && !/^\d{4}\s+JUPAS/.test(instM[1].trim())) {
      if (currentJS && accLines.length > 0) {
        const r = buildRow(currentInst, currentJS, accLines);
        if (r) rows.push(r);
        currentJS = ''; accLines = [];
      }
      const ni = INST_MAP[instM[1].trim()] ?? instM[1].trim();
      currentInst = INST_MAP[ni.replace(/^The\s+/, '')] ?? ni;
      continue;
    }

    // Skip non-table lines
    if (/^Page \d+ of \d+$/i.test(line.trim())) continue;
    if (/^\d{4} JUPAS Admissions Scores$/i.test(line.trim())) continue;
    if (line.includes('JUPAS Catalogue No')) continue;
    if (line.includes('Programme Title') && line.includes('Median')) continue;
    if (line.includes('Subject Weightings')) continue;
    if (line.includes('HKDSE Subjects Included')) continue;
    if (line.includes('Admissions Scores of') || line.includes('applicable to')) continue;
    if (line.includes('Points to note')) continue;
    if (line.includes('Conversion of levels')) continue;
    if (line.includes('Conversion of grades')) continue;
    if (line.includes('College of') && !/JS\d{4}/.test(line) && !/\d{4}\s+/.test(line.trim())) continue;
    if (line.includes('JUPAS Admissions Figures')) continue;
    if (line.includes('Admission Score') && line.includes('Calculation') && line.includes('Mechanism')) continue;
    if (line.includes('The information provided below')) continue;
    if (line.includes('Average HKDSE') && line.includes('Score with')) continue;
    if (line.trim() === '') continue;

    // Detect new programme start — 3 strategies
    let code: string | null = null;
    let isHKU = false;

    // Strategy 1: JS-prefixed code (CityU/HKBU/Lingnan/EdUHK/CUHK/PolyU/HKUST/HKMU)
    // Note: HKMU uses JS9009^ suffix, so allow optional ^
    const jsM = /\b(JS\d{4})(?:\^)?\b/.exec(line);
    if (jsM && !/^\d{4}\s+JUPAS/.test(line)) {
      code = jsM[1];
      isHKU = false;
    }
    // Strategy 2: HKU 4-digit code (6004, 6054 etc.) at line start
    else if (currentInst === '香港大学') {
      const hkuM = line.match(/^\s*(\d{4})\s+/);
      if (hkuM && !/^\d{4}\s+JUPAS/.test(line.trim())) {
        code = hkuM[1];
        isHKU = true;
      }
    }

    if (code) {
      if (currentJS && accLines.length > 0) {
        const r = buildRow(currentInst, currentJS, accLines);
        if (r) rows.push(r);
      }
      currentJS = code;
      accLines = [line];
      continue;
    }

    // Skip "New Programme" / "Insufficient Reference Data"
    if (/New Programme|Insufficient Reference/i.test(line)) { currentJS = ''; accLines = []; continue; }

    // Accumulate continuation lines
    if (currentJS && line.trim()) accLines.push(line);
  }

  if (currentJS && accLines.length > 0) { const r = buildRow(currentInst, currentJS, accLines); if (r) rows.push(r); }
  return rows;
}

function buildRow(inst: string, jsCode: string, accLines: string[]): JupasRow | null {
  let median: number | null = null, lq: number | null = null;

  // PolyU format: 2-column scores (Percentile + HKDSE Score)
  const isPolyU = inst === '香港理工大学';
  const isLingnan = inst === '岭南大学';
  const isHKBU = inst === '香港浸会大学';
  const isCUHK = inst === '香港中文大学';
  const isEdUHK = inst === '香港教育大学';

  // --- EdUHK: scores on same line as JS code, mid-line numeric pairs ---
  if (isEdUHK) {
    for (const line of accLines) {
      // Find numeric pairs like "21.3  21.5" mid-line (before trailing text)
      const m = line.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+-?\s/);
      if (m) {
        median = Number.parseFloat(m[2]);      // Median = second number
        lq = Number.parseFloat(m[1]);          // Lower Quartile = first number
        break;
      }
    }
  }
  // --- Lingnan: multi-line Median/Lower format ---
  if (isLingnan) {
    for (const line of accLines) {
      if (!line.includes('Median') && !line.includes('Lower')) continue;
      const numbers = line.trim().split(/\s+/);
      // First numeric value after "Median"/"Lower" is the Weighted Admission Score
      for (let j = 0; j < numbers.length; j++) {
        const n = Number.parseFloat(numbers[j]);
        if (!Number.isNaN(n) && n > 5 && n < 100) {
          if (line.includes('Median') && !line.includes('Lower')) median = n;
          if (line.includes('Lower')) lq = n;
          break;
        }
      }
    }
  }
  // --- HKBU: Mean score on separate line, grades in columns ---
  else if (isHKBU) {
    // Find numeric mean score (standalone number on its own line-ish)
    for (const line of accLines) {
      const m = line.trim().match(/^(\d+(?:\.\d+)?)$/);
      if (m) {
        median = Number.parseFloat(m[1]);
        lq = median; // HKBU only reports mean, use same value for both
        break;
      }
    }
  }
  // --- CUHK: extract Programme Weighted Total from M/LQ lines ---
  else if (isCUHK) {
    let cuhkMedian: number | null = null, cuhkLQ: number | null = null;
    for (const line of accLines) {
      const m = line.trim().match(/(\d+(?:\.\d+)?)\s*$/);
      if (!m) continue;
      const n = Number.parseFloat(m[1]);
      if (Number.isNaN(n) || n < 5 || n > 80) continue;
      // M = column after "Programme/Stream" = 1st Elective-ish, LQ = 3/4 way down
      // Use "M" marker vs "LQ" to distinguish
      // CUHK format: UQ/M/LQ rows have the letter in a column after programme name
      if (line.includes('  M  ') || line.includes(' M ') || line.trim().startsWith('M ')) cuhkMedian = n;
      if (line.includes('  LQ ') || line.includes(' LQ')) cuhkLQ = n;
    }
    // If no explicit M/LQ found, use the last numeric value on any line
    if (cuhkMedian === null) {
      for (let i = accLines.length - 1; i >= 0; i--) {
        const m = accLines[i].trim().match(/(\d+(?:\.\d+)?)\s*$/);
        if (m) { cuhkMedian = Number.parseFloat(m[1]); break; }
      }
    }
    if (cuhkMedian !== null) { median = cuhkMedian; lq = cuhkLQ; }
  }
  // --- Default: extract trailing numeric scores ---
  else {
    for (let i = accLines.length - 1; i >= 0; i--) {
    const line = accLines[i].trimEnd();
    const m = line.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/);
    if (m) {
      const v1 = Number.parseFloat(m[1]), v2 = Number.parseFloat(m[2]);
      if (!Number.isNaN(v1) && !Number.isNaN(v2) && v1 > 5 && v1 < 300) {
        if (isPolyU) {
          // PolyU first column = Percentile Median, second = HKDSE Score weight → we want second col
          // But PolyU has multiple rows per programme. Take first found.
          median = v2; lq = null; // Will be refined below
        } else {
          median = v1; lq = v2;
        }
        break;
      }
    }
    }
  }

  // PolyU: scan for Median/Lower Quartile labels
  if (isPolyU) {
    let polyMedian: number | null = null, polyLQ: number | null = null;
    for (let i = 0; i < accLines.length; i++) {
      const line = accLines[i].trimEnd();
      const scoreM = line.match(/(\d+(?:\.\d+)?)\s*$/);
      if (scoreM && line.includes('Median') && !line.includes('Lower')) {
        polyMedian = Number.parseFloat(scoreM[1]);
      }
      if (scoreM && line.includes('Lower Quartile')) {
        polyLQ = Number.parseFloat(scoreM[1]);
      }
    }
    if (polyMedian !== null) { median = polyMedian; lq = polyLQ; }
  }

  if (median === null || Number.isNaN(median) || median < 5 || median > 300) return null;

  // Build title
  const first = accLines[0].replace(/^JS\d{4}\s*/, '').replace(/^\d{4}\s*/, '').trim();
  const titleParts: string[] = first ? [first] : [];
  for (let i = 1; i < accLines.length; i++) {
    let l = accLines[i].trim();
    if (/Best|subjects?|include|weight|elective|core|M1|M2|Physics|Chemistry|Biology|Category|specified|Specific|score|conversion|Selection|Principle|Upper|Median|Lower|Quartile|Percentile|Scheme|Programme|Code|Average|Calculation|Mechanism|HKDSE/i.test(l)) continue;
    l = l.replace(/\s+\d+(?:\.\d+)?\s*$/, '').trim();
    if (l && l.length > 1 && !/^[\d\s.]+$/.test(l) && !/^JS\d{4}/.test(l)) titleParts.push(l);
  }
  let title = titleParts.join(' ').replace(/\s+/g, ' ').trim();
  if (title.length > 300) title = title.slice(0, 297) + '...';

  // Formula
  const formulaLines: string[] = [];
  for (const l of accLines) {
    if (/Best|subjects?|include|weight|elective|core|M1|M2|Selection|Principle/i.test(l))
      formulaLines.push(l.replace(/\s+\d+(?:\.\d+)?\s*$/, '').trim());
  }
  const formula = formulaLines.join(' ').replace(/\s+/g, ' ').trim().slice(0, 500);

  return { institutionName: inst, jsCode, programmeTitle: title, scoreFormula: formula, median, lowerQuartile: lq };
}

// ------ Main ------

async function main() {
  const y = Number.parseInt(process.argv.find((a) => a.startsWith('--year='))?.split('=')[1] || '2025', 10);
  const pdfPath = path.join(PDF_ROOT, `af_${y}_JUPAS.pdf`);
  const sourceUrl = `https://www.jupas.edu.hk/f/page/3667/af_${y}_JUPAS.pdf`;
  console.log(`[JUPAS] ${pdfPath}`);
  const tmp = `/tmp/jupas_${y}.txt`;
  try { execSync(`pdftotext -layout "${pdfPath}" "${tmp}"`, { encoding: 'utf8', stdio: 'pipe' }); } catch { /* ok */ }
  const text = await fs.readFile(tmp, 'utf8');

  const rows = parseJupasText(text);
  console.log(`[JUPAS] ${rows.length} programmes`);
  const byInst = new Map<string, number>();
  for (const r of rows) byInst.set(r.institutionName, (byInst.get(r.institutionName) ?? 0) + 1);
  for (const [i, c] of [...byInst].sort()) console.log(`  ${i}: ${c}`);

  const admissions: NormalizedAdmissionRecord[] = rows.map((row) => ({
    examCategory: 'dse' as const, year: y, province: '香港', subjectGroup: '', batch: 'JUPAS Main Round',
    institutionName: row.institutionName, institutionCode: null, rawInstitutionName: row.institutionName,
    granularity: 'institution' as const, minScore: row.lowerQuartile ?? 0, avgScore: row.median ?? undefined,
    minRank: null, enrollmentCount: null, planCount: null, admittedCount: null, admissionType: '联招',
    programVariant: row.programmeTitle, campusName: null, groupCode: row.jsCode, groupName: row.programmeTitle,
    groupRequirement: row.scoreFormula || undefined, sourceUrl,
    rawRowHash: sha256(`jupas-${y}-${row.jsCode}-${row.institutionName}`),
  })) as NormalizedAdmissionRecord[];

  const outDir = path.join(OUT_ROOT, String(y));
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `jupas-dse-${y}.json`);
  await fs.writeFile(outPath, JSON.stringify(admissions, null, 2), 'utf8');
  console.log(`[JUPAS] wrote ${admissions.length} → ${outPath}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

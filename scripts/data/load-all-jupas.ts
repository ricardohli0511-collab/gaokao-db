import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { prisma } from '@/lib/prisma';
import { matchInstitution } from '@/lib/import/match-institution';

const NORMALIZED_ROOT = path.join(process.cwd(), 'data', 'normalized', '香港');

interface JupasRecord {
  examCategory: string;
  year: number;
  province: string;
  subjectGroup: string;
  batch: string;
  institutionName: string;
  institutionCode: string | null;
  rawInstitutionName: string;
  granularity: string;
  minScore: number;
  avgScore?: number | null;
  programVariant?: string;
  groupCode?: string | null;
  groupName?: string | null;
  groupRequirement?: string | null;
  admissionType: string;
  sourceUrl: string;
  rawRowHash: string;
}

async function loadYear(yearDir: string, year: number) {
  const files = await fs.readdir(yearDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    console.log(`  No JSON files for ${year}`);
    return { created: 0, skipped: 0 };
  }

  let allRecords: JupasRecord[] = [];
  for (const f of jsonFiles) {
    const raw = await fs.readFile(path.join(yearDir, f), 'utf8');
    const records = JSON.parse(raw) as JupasRecord[];
    allRecords = allRecords.concat(records);
  }

  console.log(`  ${allRecords.length} records from ${jsonFiles.length} file(s)`);

  const institutionCache = new Map<string, { institutionId: number; institutionCode: string | null; matchedName: string }>();

  async function resolveInstitution(rawName: string) {
    if (institutionCache.has(rawName)) return institutionCache.get(rawName)!;

    const matched = await matchInstitution({
      institutionCode: undefined,
      rawInstitutionName: rawName,
    });

    if (!matched.institutionId) {
      console.warn(`    ⚠ 未匹配院校: ${rawName}`);
      institutionCache.set(rawName, null as unknown as { institutionId: number; institutionCode: string | null; matchedName: string });
      return null;
    }

    institutionCache.set(rawName, matched as { institutionId: number; institutionCode: string | null; matchedName: string });
    return matched as { institutionId: number; institutionCode: string | null; matchedName: string };
  }

  const existingHashes = new Set<string>();
  const existingRecords = await prisma.admissionRecord.findMany({
    where: { examCategory: 'dse', batch: 'JUPAS Main Round', year },
    select: { rawRowHash: true },
  });
  for (const r of existingRecords) {
    if (r.rawRowHash) existingHashes.add(r.rawRowHash);
  }

  let created = 0;
  let skipped = 0;

  for (const record of allRecords) {
    if (existingHashes.has(record.rawRowHash)) {
      skipped++;
      continue;
    }

    const inst = await resolveInstitution(record.rawInstitutionName);
    if (!inst) {
      skipped++;
      continue;
    }

    await prisma.admissionRecord.create({
      data: {
        examCategory: 'dse',
        year: record.year,
        province: '香港',
        subjectGroup: record.subjectGroup || '',
        batch: 'JUPAS Main Round',
        institutionId: inst.institutionId,
        rawInstitutionName: record.rawInstitutionName,
        granularity: (record.granularity as 'institution' | 'group' | 'major') ?? 'institution',
        admissionType: record.admissionType ?? 'DSE',
        degreeLevel: 'undergraduate',
        programmeName: record.programVariant ?? record.groupName ?? undefined,
        groupCode: record.groupCode ?? undefined,
        groupName: record.groupName ?? undefined,
        groupRequirement: record.groupRequirement ?? undefined,
        minScore: record.minScore ?? 0,
        avgScore: record.avgScore ?? null,
        lqScore: record.minScore || undefined,
        medianScore: record.avgScore ?? null,
        sourceUrl: record.sourceUrl,
        rawRowHash: record.rawRowHash,
      },
    });

    created++;
  }

  console.log(`  ${year}: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function main() {
  console.log('[JUPAS-ALL] Scanning normalized data...');
  const entries = await fs.readdir(NORMALIZED_ROOT, { withFileTypes: true });

  const yearDirs = entries
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => ({ name: e.name, year: Number.parseInt(e.name, 10), path: path.join(NORMALIZED_ROOT, e.name) }))
    .sort((a, b) => a.year - b.year);

  console.log(`[JUPAS-ALL] Found ${yearDirs.length} year(s): ${yearDirs.map((d) => d.name).join(', ')}`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const dir of yearDirs) {
    const { created, skipped } = await loadYear(dir.path, dir.year);
    totalCreated += created;
    totalSkipped += skipped;
  }

  console.log(`\n[JUPAS-ALL] DONE: ${totalCreated} created, ${totalSkipped} skipped`);

  const total = await prisma.admissionRecord.count({
    where: { examCategory: 'dse' },
  });
  console.log(`[JUPAS-ALL] Total DSE records in DB: ${total}`);
}

main().catch((e) => {
  console.error('[JUPAS-ALL] ERROR:', e.message);
  process.exit(1);
});

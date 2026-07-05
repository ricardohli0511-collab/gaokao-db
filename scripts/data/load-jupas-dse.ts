import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { matchInstitution } from '@/lib/import/match-institution';
import type { NormalizedAdmissionRecord } from '@/lib/import/types';

const JUPAS_FILE = path.join(process.cwd(), 'data/normalized/香港/2025/jupas-dse-2025.json');

async function main() {
  console.log('[JUPAS-LOAD] Reading...');
  const raw = await fs.readFile(JUPAS_FILE, 'utf8');
  const records = JSON.parse(raw) as NormalizedAdmissionRecord[];
  console.log(`[JUPAS-LOAD] ${records.length} records`);

  const institutionCache = new Map<string, { institutionId: number; institutionCode: string | null; matchedName: string }>();

  async function resolveInstitution(rawName: string): Promise<{ institutionId: number; institutionCode: string | null; matchedName: string } | null> {
    if (institutionCache.has(rawName)) return institutionCache.get(rawName)!;

    const matched = await matchInstitution({
      institutionCode: undefined,
      rawInstitutionName: rawName,
    });

    if (!matched.institutionId) {
      console.warn(`  ⚠ 未匹配院校: ${rawName}`);
      institutionCache.set(rawName, null as unknown as { institutionId: number; institutionCode: string | null; matchedName: string });
      return null;
    }

    institutionCache.set(rawName, matched as { institutionId: number; institutionCode: string | null; matchedName: string });
    return matched as { institutionId: number; institutionCode: string | null; matchedName: string };
  }

  // Deduplicate by rawRowHash to avoid inserting duplicate records
  const existingHashes = new Set<string>();
  const existingRecords = await prisma.admissionRecord.findMany({
    where: { examCategory: 'dse', batch: 'JUPAS Main Round', year: 2025 },
    select: { rawRowHash: true },
  });
  for (const r of existingRecords) {
    if (r.rawRowHash) existingHashes.add(r.rawRowHash);
  }
  console.log(`[JUPAS-LOAD] ${existingHashes.size} existing DSE 2025 records`);

  let created = 0;
  let skipped = 0;

  for (const record of records) {
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
        granularity: record.granularity ?? 'institution',
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
    if (created % 50 === 0) {
      console.log(`  Progress: ${created} created, ${skipped} skipped`);
    }
  }

  console.log(`[JUPAS-LOAD] DONE: ${created} created, ${skipped} skipped`);

  const verify = await prisma.admissionRecord.findFirst({
    where: { examCategory: 'dse', year: 2025 },
    select: { id: true, rawInstitutionName: true, medianScore: true, groupCode: true, programmeName: true },
  });
  console.log('[JUPAS-LOAD] Sample:', JSON.stringify(verify));
}

main().catch((e) => {
  console.error('[JUPAS-LOAD] ERROR:', e.message);
  process.exit(1);
});

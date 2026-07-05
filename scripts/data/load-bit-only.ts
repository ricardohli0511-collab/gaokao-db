import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { upsertAdmissionBundle } from '@/lib/import/upsert';
import type { ParsedSourceDocument } from '@/lib/import/types';

const BIT_FILE = path.join('data/normalized/全国/2025/bit-undergrad-html-all-06c6f3bca1d9.html.json');

async function main() {
  console.log('[BIT-LOAD] Reading file...', Date.now());
  const raw = await fs.readFile(BIT_FILE, 'utf8');
  const doc = JSON.parse(raw) as ParsedSourceDocument;
  console.log(`[BIT-LOAD] ${doc.admissions.length} admissions, ${doc.majors.length} majors`);

  // Quick DB test
  console.log('[BIT-LOAD] Testing DB...', Date.now());
  const t0 = Date.now();
  const count = await prisma.admissionRecord.count();
  console.log(`[BIT-LOAD] DB OK, ${count} records, ${Date.now()-t0}ms`);

  // Run upsert
  console.log('[BIT-LOAD] Starting upsert...', Date.now());
  const t1 = Date.now();
  const result = await upsertAdmissionBundle({
    admissions: doc.admissions,
    majors: doc.majors,
  });
  const elapsed = (Date.now() - t1) / 1000;
  console.log(`[BIT-LOAD] DONE in ${elapsed}s`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error('[BIT-LOAD] ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});

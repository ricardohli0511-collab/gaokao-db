import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';

import { buildGapSummaryEntry, buildSourceLoadSummaryEntry } from '@/lib/import/load-report-helpers';
import { prisma } from '@/lib/prisma';
import { upsertAdmissionBundle } from '@/lib/import/upsert';
import type { ParsedSourceDocument } from '@/lib/import/types';

const ROOT = process.cwd();
const NORMALIZED_ROOT = path.join(ROOT, 'data', 'normalized');

async function collectJsonFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsonFiles(nextPath)));
    } else if (entry.isFile() && nextPath.endsWith('.json')) {
      files.push(nextPath);
    }
  }

  return files;
}

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
          }
        }
      })()
    );
  }

  await Promise.all(workers);
}

async function main() {
  const files = await collectJsonFiles(NORMALIZED_ROOT);

  const job = await prisma.importJob.create({
    data: {
      name: 'official-gaokao-import',
      status: 'running',
      inputCount: files.length,
      startedAt: new Date(),
    },
  });

  let parsedCount = 0;
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let supplementedMajorCount = 0;
  let dedupedMajorCount = 0;
  let syntheticParentsCreated = 0;
  const unresolved: string[] = [];
  const gapSummary: Array<ReturnType<typeof buildGapSummaryEntry>> = [];
  const sourceLoadSummary: Array<ReturnType<typeof buildSourceLoadSummaryEntry>> = [];

  try {
    const targetFiles = files;
    const concurrency = process.env.LOAD_CONCURRENCY ? Number.parseInt(process.env.LOAD_CONCURRENCY, 10) : 4;

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

        parsedCount += content.admissions.length;
        importedCount += counters.importedAdmissions + counters.importedMajors;
        updatedCount += counters.updatedAdmissions + counters.updatedMajors;
        supplementedMajorCount += counters.supplementedMajors ?? 0;
        dedupedMajorCount += counters.dedupedMajors ?? 0;
        syntheticParentsCreated += counters.syntheticParentsCreated ?? 0;
        skippedCount += counters.skipped;
        unresolved.push(...counters.unresolvedInstitutions.map((item) => `${item.rawInstitutionName},${item.institutionCode ?? ''},${item.sourceUrl}`));
        gapSummary.push(buildGapSummaryEntry(file, content));
        sourceLoadSummary.push(buildSourceLoadSummaryEntry(file, content, counters));

        const progress = `[${String(idx + 1).padStart(3, ' ')}/${targetFiles.length}]`;
        const detail = `adm: +${counters.importedAdmissions}/~${counters.updatedAdmissions} maj: +${counters.importedMajors}/~${counters.updatedMajors} sk:${counters.skipped}`;
        console.log(`${progress} ${detail} ${path.basename(file, '.json')}`);
      },
      concurrency
    );

    const reportsDir = path.join(ROOT, 'data', 'reports');
    const reportPath = path.join(reportsDir, 'manual-review.csv');
    await fs.mkdir(reportsDir, { recursive: true });
    await fs.writeFile(
      reportPath,
      ['rawInstitutionName,institutionCode,sourceUrl', ...unresolved].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      path.join(reportsDir, 'gap-summary.json'),
      JSON.stringify(gapSummary, null, 2),
      'utf8'
    );
    await fs.writeFile(
      path.join(reportsDir, 'source-load-summary.json'),
      JSON.stringify(sourceLoadSummary, null, 2),
      'utf8'
    );

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        parsedCount,
        importedCount,
        updatedCount,
        skippedCount,
        failedCount,
        errorMessage: JSON.stringify({
          supplementedMajors: supplementedMajorCount,
          dedupedMajors: dedupedMajorCount,
          syntheticParentsCreated,
        }),
        reportPath,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    failedCount += 1;
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        parsedCount,
        importedCount,
        updatedCount,
        skippedCount,
        failedCount,
        errorMessage: error instanceof Error ? error.message : '未知错误',
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

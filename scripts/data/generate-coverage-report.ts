import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';

import { buildCoverageSummaryEntry } from '@/lib/import/load-report-helpers';
import { prisma } from '@/lib/prisma';
import { getAllIngestSources } from '@/lib/import/source-registry';
import { SCHOOL_SOURCE_REGISTRY } from '@/lib/import/school-source-registry';

const ROOT = process.cwd();
const REPORT_ROOT = path.join(ROOT, 'data', 'reports');

async function main() {
  await fs.mkdir(REPORT_ROOT, { recursive: true });

  const sourceDocs = await prisma.sourceDocument.findMany({
    orderBy: [{ province: 'asc' }, { year: 'asc' }],
  });

  const admissions = await prisma.admissionRecord.groupBy({
    by: ['province', 'year', 'granularity'],
    _count: {
      id: true,
    },
  });
  const majors = await prisma.majorRecord.groupBy({
    by: ['sourceDocumentId'],
    _count: {
      id: true,
    },
  });
  const allSources = getAllIngestSources();
  const sourceLoadSummaryPath = path.join(REPORT_ROOT, 'source-load-summary.json');
  let sourceLoadSummary: Array<{
    officialUrl: string;
    sourceId?: string;
    parserKey?: string;
    schoolKey?: string | null;
    supplementedMajors: number;
    dedupedMajors: number;
    syntheticParentsCreated: number;
    importedMajors: number;
    verificationNotes?: string[];
    declaredGaps?: string[];
    gapCount?: number;
  }> = [];

  try {
    sourceLoadSummary = JSON.parse(await fs.readFile(sourceLoadSummaryPath, 'utf8'));
  } catch {
    sourceLoadSummary = [];
  }

  const summary = sourceDocs
    .filter((doc) => allSources.some((item) => item.officialUrl === doc.officialUrl))
    .map((doc) => {
      const sourceMeta = allSources.find((item) => item.officialUrl === doc.officialUrl) ?? null;
      const schoolMeta = doc.schoolKey ? SCHOOL_SOURCE_REGISTRY.find((item) => item.schoolKey === doc.schoolKey) ?? null : null;
      const loadMeta = sourceLoadSummary.find((item) => item.officialUrl === doc.officialUrl) ?? null;
      const matched = doc.sourceLevel === 'school-official'
        ? []
        : admissions.filter((item) => item.province === doc.province && item.year === doc.year);
      const majorCount = majors
        .filter((item) => item.sourceDocumentId === doc.id)
        .reduce((acc, item) => acc + item._count.id, 0);

      return buildCoverageSummaryEntry({
        doc: {
          id: doc.id,
          province: doc.province,
          year: doc.year,
          examCategory: doc.examCategory,
          sourceLevel: doc.sourceLevel,
          sourceScope: doc.sourceScope,
          schoolKey: doc.schoolKey,
          sourceType: doc.sourceType,
          granularity: doc.granularity,
          officialUrl: doc.officialUrl,
          parserKey: doc.parserKey,
        },
        sourceMeta,
        schoolMeta,
        loadMeta,
        matchedAdmissions: matched,
        majorCount,
      });
    });

  const coveragePath = path.join(REPORT_ROOT, 'coverage-summary.json');
  await fs.writeFile(coveragePath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`coverage -> ${coveragePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

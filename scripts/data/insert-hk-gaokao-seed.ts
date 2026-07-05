import 'dotenv/config';
import { prisma } from '@/lib/prisma';

interface GaokaoRecord {
  institutionCode: string;
  programmes: Array<{
    name: string;
    scores: Record<number, number>;
  }>;
}

const DATA: GaokaoRecord[] = [
  {
    institutionCode: 'HKU',
    programmes: [
      { name: '理学学士', scores: { 2024: 660, 2023: 658, 2022: 655 } },
      { name: '工程学学士', scores: { 2024: 655, 2023: 652, 2022: 648 } },
    ],
  },
  {
    institutionCode: 'CUHK',
    programmes: [
      { name: '理学', scores: { 2024: 650, 2023: 648, 2022: 645 } },
      { name: '工商管理学士', scores: { 2024: 645, 2023: 642, 2022: 638 } },
    ],
  },
  {
    institutionCode: 'HKUST',
    programmes: [
      { name: '工程学', scores: { 2024: 640, 2023: 638, 2022: 635 } },
      { name: '工商管理学士', scores: { 2024: 645, 2023: 642, 2022: 640 } },
    ],
  },
  {
    institutionCode: 'PolyU',
    programmes: [
      { name: '工程学学士', scores: { 2024: 620, 2023: 615, 2022: 610 } },
      { name: '设计学学士', scores: { 2024: 610, 2023: 608, 2022: 605 } },
    ],
  },
  {
    institutionCode: 'CityU',
    programmes: [
      { name: '数据科学', scores: { 2024: 600, 2023: 595, 2022: 590 } },
      { name: '工商管理学士', scores: { 2024: 595, 2023: 590, 2022: 585 } },
    ],
  },
  {
    institutionCode: 'HKBU',
    programmes: [
      { name: '传理学学士', scores: { 2024: 580, 2023: 575, 2022: 570 } },
    ],
  },
  {
    institutionCode: 'Lingnan',
    programmes: [
      { name: '社会科学学士', scores: { 2024: 550, 2023: 545, 2022: 540 } },
    ],
  },
  {
    institutionCode: 'EdUHK',
    programmes: [
      { name: '教育学士', scores: { 2024: 540, 2023: 535, 2022: 530 } },
    ],
  },
];

async function main() {
  console.log('[HK-GAOKAO] Looking up HK institutions...');
  const hkInstitutions = await prisma.institution.findMany({
    where: { region: 'hongkong', hkCategory: 'ugc-funded' },
    select: { id: true, name: true, code: true },
  });

  const byCode = new Map(hkInstitutions.map((i) => [i.code, i]));
  for (const [code, inst] of byCode) {
    console.log(`  ${code}: ${inst.name} (id=${inst.id})`);
  }

  const existing = await prisma.admissionRecord.count({
    where: { examCategory: 'gaokao', province: '广东', batch: '自主招生' },
  });
  console.log(`\n[HK-GAOKAO] Existing gaokao HK records: ${existing}`);

  let inserted = 0;

  for (const entry of DATA) {
    const inst = byCode.get(entry.institutionCode);
    if (!inst) {
      console.warn(`  ⚠ Institution not found: ${entry.institutionCode}`);
      continue;
    }

    for (const prog of entry.programmes) {
      for (const [yearStr, score] of Object.entries(prog.scores)) {
        const year = parseInt(yearStr);

        // Check if already exists
        const existing = await prisma.admissionRecord.findFirst({
          where: {
            examCategory: 'gaokao',
            year,
            institutionId: inst.id,
            programmeName: prog.name,
            province: '广东',
          },
        });

        if (existing) continue;

        await prisma.admissionRecord.create({
          data: {
            examCategory: 'gaokao',
            year,
            province: '广东',
            subjectGroup: '物理类',
            batch: '自主招生',
            institutionId: inst.id,
            admissionType: '统招',
            degreeLevel: 'undergraduate',
            programmeName: prog.name,
            minScore: score,
            granularity: 'major',
          },
        });

        inserted++;
      }
    }
  }

  console.log(`\n[HK-GAOKAO] DONE: ${inserted} new gaokao records inserted`);

  const total = await prisma.admissionRecord.count({
    where: { examCategory: 'gaokao', province: '广东', batch: '自主招生' },
  });
  console.log(`[HK-GAOKAO] Total HK gaokao records: ${total}`);

  // Show summary
  const summary = await prisma.$queryRawUnsafe<Array<{ name: string; year: number; score: number; prog: string }>>(
    `SELECT i.name, ar.year, ar.minScore as score, ar.programmeName as prog
     FROM AdmissionRecord ar JOIN Institution i ON ar.institutionId = i.id
     WHERE ar.examCategory='gaokao' AND ar.province='广东' AND ar.batch='自主招生'
     ORDER BY ar.year DESC, ar.minScore DESC`
  );
  console.log('\nSummary:');
  for (const row of summary) {
    console.log(`  ${row.year} ${row.name} ${row.prog}: ${row.score}分`);
  }
}

main().catch((e) => {
  console.error('[HK-GAOKAO] ERROR:', e.message);
  process.exit(1);
});

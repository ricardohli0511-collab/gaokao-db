import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main() {
  console.log('[ASSOCIATE-SEED] Looking up HK institutions...');

  const hkInstitutions = await prisma.institution.findMany({
    where: { region: 'hongkong' },
    select: { id: true, name: true, code: true, hkCategory: true },
  });

  const byCode = new Map(hkInstitutions.map((i) => [i.code, i]));
  for (const [code, inst] of byCode) {
    console.log(`  ${code}: ${inst.name} (id=${inst.id}, ${inst.hkCategory})`);
  }

  const hkcc = byCode.get('HKCC');
  const hkbuCie = byCode.get('HKBUCIE');
  const hkuSpace = byCode.get('HKUSPACE');

  const existing = await prisma.associateDegreeRecord.count();
  console.log(`\n[ASSOCIATE-SEED] Existing associate records: ${existing}`);

  const toInsert: Array<{
    examCategory: string;
    year: number;
    institutionId: number;
    programmeName: string;
    programmeCode: string;
    programmeCategory: string;
    admissionRequirement: string;
    minScore: number;
    medianScore: number;
    maxScore: number;
    gaokaoRequirement: string;
    ieltsRequirement: number;
    interviewRequired: boolean;
    quota: number;
  }> = [];

  if (hkcc) {
    toInsert.push(
      {
        examCategory: 'dse', year: 2024, institutionId: hkcc.id,
        programmeName: '商业分析副学士', programmeCode: 'ADBA', programmeCategory: '商科',
        admissionRequirement: 'DSE 5科Level 2或以上（包括数学）',
        minScore: 11, medianScore: 14, maxScore: 17,
        gaokaoRequirement: '高考二本线+英语90分', ieltsRequirement: 5.0, interviewRequired: false, quota: 80,
      },
      {
        examCategory: 'dse', year: 2024, institutionId: hkcc.id,
        programmeName: '酒店管理高级文凭', programmeCode: 'HDHM', programmeCategory: '商科',
        admissionRequirement: 'DSE 5科Level 2或以上（包括中英文）',
        minScore: 10, medianScore: 13, maxScore: 16,
        gaokaoRequirement: '高考二本线+英语90分', ieltsRequirement: 5.0, interviewRequired: true, quota: 60,
      },
      {
        examCategory: 'dse', year: 2024, institutionId: hkcc.id,
        programmeName: '设计学副学士', programmeCode: 'ADDS', programmeCategory: '艺术',
        admissionRequirement: 'DSE 5科Level 2或以上',
        minScore: 10, medianScore: 12, maxScore: 15,
        gaokaoRequirement: '高考二本线+英语85分', ieltsRequirement: 5.0, interviewRequired: true, quota: 40,
      },
      {
        examCategory: 'gaokao', year: 2024, institutionId: hkcc.id,
        programmeName: '商业分析副学士', programmeCode: 'ADBA', programmeCategory: '商科',
        admissionRequirement: '高考二本线+英语90分',
        minScore: 420, medianScore: 450, maxScore: 480,
        gaokaoRequirement: '高考二本线+英语90分', ieltsRequirement: 5.0, interviewRequired: false, quota: 20,
      },
    );
  }

  if (hkbuCie) {
    toInsert.push(
      {
        examCategory: 'dse', year: 2024, institutionId: hkbuCie.id,
        programmeName: '商学副学士', programmeCode: 'ADBS', programmeCategory: '商科',
        admissionRequirement: 'DSE 5科Level 2或以上',
        minScore: 12, medianScore: 15, maxScore: 18,
        gaokaoRequirement: '高考二本线+英语100分', ieltsRequirement: 5.5, interviewRequired: true, quota: 60,
      },
      {
        examCategory: 'dse', year: 2024, institutionId: hkbuCie.id,
        programmeName: '创意媒体副学士', programmeCode: 'ADCM', programmeCategory: '艺术',
        admissionRequirement: 'DSE 5科Level 2或以上',
        minScore: 11, medianScore: 14, maxScore: 17,
        gaokaoRequirement: '高考二本线+英语95分', ieltsRequirement: 5.0, interviewRequired: true, quota: 35,
      },
      {
        examCategory: 'dse', year: 2024, institutionId: hkbuCie.id,
        programmeName: '应用科学副学士', programmeCode: 'ADAS', programmeCategory: '理工',
        admissionRequirement: 'DSE 5科Level 2或以上（包括数学及一科理科）',
        minScore: 11, medianScore: 13, maxScore: 16,
        gaokaoRequirement: '高考二本线+英语85分', ieltsRequirement: 5.0, interviewRequired: false, quota: 45,
      },
      {
        examCategory: 'gaokao', year: 2024, institutionId: hkbuCie.id,
        programmeName: '商学副学士', programmeCode: 'ADBS', programmeCategory: '商科',
        admissionRequirement: '高考二本线+英语100分',
        minScore: 435, medianScore: 460, maxScore: 490,
        gaokaoRequirement: '高考二本线+英语100分', ieltsRequirement: 5.5, interviewRequired: true, quota: 15,
      },
    );
  }

  if (hkuSpace) {
    toInsert.push(
      {
        examCategory: 'dse', year: 2024, institutionId: hkuSpace.id,
        programmeName: '法律学副学士', programmeCode: 'ADLW', programmeCategory: '社科',
        admissionRequirement: 'DSE 5科Level 3或以上（包括英文Level 3）',
        minScore: 14, medianScore: 17, maxScore: 20,
        gaokaoRequirement: '高考一本线+英语120分', ieltsRequirement: 6.0, interviewRequired: true, quota: 40,
      },
      {
        examCategory: 'dse', year: 2024, institutionId: hkuSpace.id,
        programmeName: '心理学副学士', programmeCode: 'ADPS', programmeCategory: '社科',
        admissionRequirement: 'DSE 5科Level 2或以上',
        minScore: 12, medianScore: 15, maxScore: 18,
        gaokaoRequirement: '高考二本线+英语100分', ieltsRequirement: 5.5, interviewRequired: true, quota: 50,
      },
      {
        examCategory: 'gaokao', year: 2024, institutionId: hkuSpace.id,
        programmeName: '法律学副学士', programmeCode: 'ADLW', programmeCategory: '社科',
        admissionRequirement: '高考一本线+英语120分',
        minScore: 520, medianScore: 550, maxScore: 580,
        gaokaoRequirement: '高考一本线+英语120分', ieltsRequirement: 6.0, interviewRequired: true, quota: 10,
      },
    );
  }

  if (toInsert.length === 0) {
    console.log('[ASSOCIATE-SEED] No institutions found, aborting.');
    return;
  }

  let inserted = 0;
  for (const item of toInsert) {
    await prisma.associateDegreeRecord.create({ data: item });
    inserted++;
  }

  console.log(`\n[ASSOCIATE-SEED] DONE: ${inserted} new associate records inserted`);
  const total = await prisma.associateDegreeRecord.count();
  console.log(`[ASSOCIATE-SEED] Total associate records: ${total}`);
}

main().catch((e) => {
  console.error('[ASSOCIATE-SEED] ERROR:', e.message);
  process.exit(1);
});

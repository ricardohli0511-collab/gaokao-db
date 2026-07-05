import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main() {
  // Check if SAT already exists
  const existing = await prisma.admissionRecord.count({ where: { examCategory: 'sat' } });
  console.log('Existing SAT records:', existing);
  
  if (existing === 0) {
    const result = await prisma.admissionRecord.createMany({
      data: [{
        examCategory: 'sat',
        year: 2025,
        province: '全球',
        subjectGroup: '',
        batch: 'SAT Suite Annual Report',
        rawInstitutionName: 'College Board',
        institutionId: 1,
        minScore: 1029,
        avgScore: 1029,
        granularity: 'institution',
        admissionType: 'SAT',
        groupName: 'SAT Suite of Assessments 2025 Total Group',
        sourceUrl: 'https://reports.collegeboard.org/sat-suite-program-results/class-2025-data',
        rawRowHash: 'sat-2025-total-group-mean-1029',
      }],
    });
    console.log('Inserted:', result.count);
  }

  const verify = await prisma.admissionRecord.findFirst({
    where: { examCategory: 'sat' },
    select: { id: true, examCategory: true, admissionType: true, avgScore: true },
  });
  console.log('SAT verify:', JSON.stringify(verify));

  // Also check DSE count
  const dseCount = await prisma.admissionRecord.count({ where: { examCategory: 'dse' } });
  console.log('DSE records:', dseCount);
}

main().catch(console.error);

import { prisma } from '@/lib/prisma';
import SchoolClientPage from './ClientPage';

export async function generateStaticParams() {
  const institutions = await prisma.institution.findMany({ select: { id: true } });
  if (institutions.length === 0) return [{ id: '0' }];
  return institutions.map((inst) => ({ id: String(inst.id) }));
}

export default async function SchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const institutionId = parseInt(id);
  if (isNaN(institutionId)) return <SchoolClientPage initialInstitution={null} initialRecords={[]} recordCount={0} />;

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: {
      records: {
        orderBy: [{ year: 'desc' }, { minScore: 'desc' }],
        take: 50,
      },
    },
  });

  if (!institution) return <SchoolClientPage initialInstitution={null} initialRecords={[]} recordCount={0} />;

  const recordCount = await prisma.admissionRecord.count({ where: { institutionId } });

  return (
    <SchoolClientPage
      initialInstitution={{
        id: institution.id,
        name: institution.name,
        code: institution.code,
        category: institution.category,
        hkCategory: institution.hkCategory,
        type: institution.type,
        province: institution.province,
        city: institution.city,
        website: institution.website,
        region: institution.region,
      }}
      initialRecords={institution.records.map((r) => ({
        id: r.id,
        year: r.year,
        province: r.province,
        subjectGroup: r.subjectGroup,
        batch: r.batch,
        admissionType: r.admissionType,
        minScore: r.minScore,
        avgScore: r.avgScore,
        medianScore: r.medianScore,
        uqScore: r.uqScore,
        lqScore: r.lqScore,
        minRank: r.minRank,
        enrollmentCount: r.enrollmentCount,
        groupCode: r.groupCode,
        programmeName: r.programmeName,
        groupRequirement: r.groupRequirement,
        examCategory: r.examCategory,
        majors: [],
      }))}
      recordCount={recordCount}
    />
  );
}

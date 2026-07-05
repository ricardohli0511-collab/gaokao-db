export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const institutionId = searchParams.get('institutionId');
  const year = searchParams.get('year');
  const province = searchParams.get('province');
  const majorName = searchParams.get('majorName');

  if (!institutionId || !year || !province) {
    return NextResponse.json(
      { error: 'institutionId, year, province 为必填参数' },
      { status: 400 }
    );
  }

  const admissionRecords = await prisma.admissionRecord.findMany({
    where: {
      institutionId: parseInt(institutionId),
      year: parseInt(year),
      province,
    },
    select: { id: true },
  });

  const admissionRecordIds = admissionRecords.map((r) => r.id);

  if (admissionRecordIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const majorWhere: Record<string, unknown> = {
    admissionRecordId: { in: admissionRecordIds },
  };

  if (majorName) {
    majorWhere.majorName = { contains: majorName };
  }

  const majors = await prisma.majorRecord.findMany({
    where: majorWhere,
    include: {
      admissionRecord: {
        include: {
          institution: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { minScore: 'desc' },
  });

  const data = majors.map((m) => ({
    id: m.id,
    majorName: m.majorName,
    majorCode: m.majorCode,
    minScore: m.minScore,
    avgScore: m.avgScore,
    maxScore: m.maxScore,
    minRank: m.minRank,
    enrollmentCount: m.enrollmentCount,
    institution: m.admissionRecord.institution,
    admissionRecord: {
      id: m.admissionRecord.id,
      year: m.admissionRecord.year,
      province: m.admissionRecord.province,
      subjectGroup: m.admissionRecord.subjectGroup,
      batch: m.admissionRecord.batch,
      admissionType: m.admissionRecord.admissionType,
      minScore: m.admissionRecord.minScore,
    },
  }));

  return NextResponse.json({ data });
}

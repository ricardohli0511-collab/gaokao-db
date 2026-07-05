export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const province = searchParams.get('province') || undefined;
  const year = searchParams.get('year') ? Number.parseInt(searchParams.get('year')!, 10) : undefined;
  const examCategory = searchParams.get('examCategory');

  const where: Record<string, unknown> = {};
  if (province) where.province = province;
  if (year) where.year = year;
  if (examCategory === 'gaokao') {
    where.admissionType = '统招';
  }

  const [subjectGroups, batches, admissionTypes, groupRequirements, granularities] = await Promise.all([
    prisma.admissionRecord.findMany({ where, distinct: ['subjectGroup'], select: { subjectGroup: true }, orderBy: { subjectGroup: 'asc' } }),
    prisma.admissionRecord.findMany({ where, distinct: ['batch'], select: { batch: true }, orderBy: { batch: 'asc' } }),
    prisma.admissionRecord.findMany({ where, distinct: ['admissionType'], select: { admissionType: true }, orderBy: { admissionType: 'asc' } }),
    prisma.admissionRecord.findMany({ where: { ...where, groupRequirement: { not: null } }, distinct: ['groupRequirement'], select: { groupRequirement: true }, orderBy: { groupRequirement: 'asc' } }),
    prisma.admissionRecord.findMany({ where, distinct: ['granularity'], select: { granularity: true }, orderBy: { granularity: 'asc' } }),
  ]);

  return NextResponse.json({
    subjectGroups: subjectGroups.map((item) => item.subjectGroup).filter(Boolean),
    batches: batches.map((item) => item.batch).filter(Boolean),
    admissionTypes: admissionTypes.map((item) => item.admissionType).filter(Boolean),
    groupRequirements: groupRequirements.map((item) => item.groupRequirement).filter(Boolean),
    granularities: granularities.map((item) => item.granularity).filter(Boolean),
  });
}

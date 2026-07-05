export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EXAM_CATEGORIES } from '@/lib/constants';


export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  const examCategory = searchParams.get('examCategory');
  const admissionType = searchParams.get('admissionType');
  const province = searchParams.get('province');
  const year = searchParams.get('year');
  const subjectGroup = searchParams.get('subjectGroup');
  const score = searchParams.get('score');
  const batch = searchParams.get('batch');
  const granularity = searchParams.get('granularity');
  const groupCode = searchParams.get('groupCode');
  const groupRequirement = searchParams.get('groupRequirement');
  const hasMajors = searchParams.get('hasMajors');
  const degreeLevel = searchParams.get('degreeLevel');
  const region = searchParams.get('region');
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const hkCategory = searchParams.get('hkCategory');

  const where: Record<string, unknown> = {};

  if (examCategory && EXAM_CATEGORIES[examCategory]) {
    where.admissionType = { in: EXAM_CATEGORIES[examCategory].types };
    where.examCategory = examCategory;
  } else if (admissionType) {
    where.admissionType = admissionType;
  }

  if (province) {
    where.province = province;
  }
  if (year) {
    where.year = parseInt(year);
  }
  if (subjectGroup) {
    where.subjectGroup = subjectGroup;
  }
  if (score) {
    where.minScore = { lte: parseInt(score) };
  }
  if (batch) {
    where.batch = batch;
  }
  if (granularity) {
    where.granularity = granularity;
  }
  if (groupCode) {
    where.groupCode = groupCode;
  }
  if (groupRequirement) {
    where.groupRequirement = groupRequirement;
  }
  if (hasMajors === 'true') {
    where.majors = { some: {} };
  }
  if (degreeLevel) {
    where.degreeLevel = degreeLevel;
  }
  if (region || category || type || hkCategory) {
    const instFilter: Record<string, unknown> = {};
    if (region) instFilter.region = region;
    if (category) instFilter.category = category;
    if (type) instFilter.type = type;
    if (hkCategory) instFilter.hkCategory = hkCategory;
    where.institution = instFilter;
  }

  const [data, total] = await Promise.all([
    prisma.admissionRecord.findMany({
      where,
      include: {
        institution: {
          select: { id: true, name: true, category: true, code: true },
        },
        _count: {
          select: { majors: true },
        },
      },
      orderBy: [{ year: 'desc' }, { minScore: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.admissionRecord.count({ where }),
  ]);

  const response = NextResponse.json({ data, total, page, pageSize });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  const examCategory = searchParams.get('examCategory') || '';
  const year = searchParams.get('year') || '';
  const institutionId = searchParams.get('institutionId') || '';
  const programmeCategory = searchParams.get('programmeCategory') || '';
  const score = searchParams.get('score') || '';

  const where: Record<string, unknown> = {};

  if (examCategory) {
    where.examCategory = examCategory;
  }
  if (year) {
    where.year = parseInt(year);
  }
  if (institutionId) {
    where.institutionId = parseInt(institutionId);
  }
  if (programmeCategory) {
    where.programmeCategory = programmeCategory;
  }
  if (score) {
    where.minScore = { lte: parseFloat(score) };
  }

  const [data, total] = await Promise.all([
    prisma.associateDegreeRecord.findMany({
      where,
      include: {
        institution: {
          select: { id: true, name: true, category: true, hkCategory: true, code: true },
        },
      },
      orderBy: [{ year: 'desc' }, { minScore: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.associateDegreeRecord.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, pageSize });
}

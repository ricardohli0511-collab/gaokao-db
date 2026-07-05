export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const hkCategory = searchParams.get('hkCategory') || '';
  const examCategory = searchParams.get('examCategory') || '';

  const where: Record<string, unknown> = {
    region: 'hongkong',
  };

  if (hkCategory) {
    where.hkCategory = hkCategory;
  }

  const data = await prisma.institution.findMany({
    where,
    orderBy: [{ hkCategory: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          records: true,
          associateRecords: true,
        },
      },
    },
  });

  // If examCategory is specified, get per-institution record counts
  let examCounts: Map<number, number> = new Map();
  if (examCategory) {
    const institutionIds = data.map((d) => d.id);
    // Use one query to get all counts
    const records = await prisma.admissionRecord.findMany({
      where: {
        examCategory: examCategory as 'gaokao' | 'dse' | 'ib' | 'alevel' | 'sat' | 'act' | 'ap',
        institutionId: { in: institutionIds },
      },
      select: { institutionId: true },
    });
    // Count per institution
    for (const r of records) {
      examCounts.set(r.institutionId, (examCounts.get(r.institutionId) || 0) + 1);
    }
  }

  const result = data.map((inst) => ({
    id: inst.id,
    name: inst.name,
    code: inst.code,
    category: inst.category,
    hkCategory: inst.hkCategory,
    type: inst.type,
    province: inst.province,
    city: inst.city,
    website: inst.website,
    _count: {
      records: inst._count.records,
      associateRecords: inst._count.associateRecords,
    },
    examRecordCount: examCategory ? (examCounts.get(inst.id) || 0) : null,
  }));

  const response = NextResponse.json({ data: result });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

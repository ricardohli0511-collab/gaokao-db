export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
  const search = searchParams.get('search') || '';
  const region = searchParams.get('region') || '';

  const where: Record<string, unknown> = {};
  if (region) where.region = region;

  let data;
  let total;

  if (search) {
    const likePattern = `%${search}%`;
    data = await prisma.$queryRaw`
      SELECT * FROM Institution WHERE LOWER(name) LIKE LOWER(${likePattern}) ORDER BY id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `;
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Institution WHERE LOWER(name) LIKE LOWER(${likePattern})
    `;
    total = Number((countResult as { count: number }[])[0].count);
  } else {
    [data, total] = await Promise.all([
      prisma.institution.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.institution.count({ where }),
    ]);
  }

  return NextResponse.json({ data, total, page, pageSize });
}

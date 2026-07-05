export const dynamic = 'force-static';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';


export async function GET() {
  const years = await prisma.admissionRecord.findMany({
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'desc' },
  });

  return NextResponse.json(years.map((y) => y.year));
}

export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRecommendThresholds } from '@/lib/constants';


export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const province = searchParams.get('province') || '';
  const year = searchParams.get('year');
  const subjectGroup = searchParams.get('subjectGroup') || '';
  const score = searchParams.get('score');
  const examCategory = searchParams.get('examCategory') || 'gaokao';
  const admissionType = searchParams.get('admissionType');
  const batch = searchParams.get('batch');
  const granularity = searchParams.get('granularity');
  const region = searchParams.get('region');
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const hkCategory = searchParams.get('hkCategory');

  if (!year || !score) {
    return NextResponse.json(
      { error: 'year 和 score 为必填参数' },
      { status: 400 }
    );
  }

  const yearNum = parseInt(year);
  const scoreNum = parseInt(score);

  if (isNaN(yearNum) || isNaN(scoreNum)) {
    return NextResponse.json(
      { error: '年份或分数格式错误' },
      { status: 400 }
    );
  }

  const { reachOffset, matchOffset } = getRecommendThresholds(examCategory);

  const where: Record<string, unknown> = {
    year: yearNum,
  };
  if (province) where.province = province;
  if (subjectGroup) where.subjectGroup = subjectGroup;
  if (batch) where.batch = batch;
  if (granularity) {
    where.granularity = granularity;
  }
  if (admissionType) {
    where.admissionType = admissionType;
  }

  if (region || category || type || hkCategory) {
    const instFilter: Record<string, unknown> = {};
    if (region) instFilter.region = region;
    if (category) instFilter.category = category;
    if (type) instFilter.type = type;
    if (hkCategory) instFilter.hkCategory = hkCategory;
    where.institution = instFilter;
  }

  const allRecords = await prisma.admissionRecord.findMany({
    where,
    include: {
      institution: {
        select: {
          id: true,
          name: true,
          category: true,
          type: true,
        },
      },
    },
  });

  const reachLower = scoreNum;
  const reachUpper = scoreNum + reachOffset;
  const matchLower = scoreNum - matchOffset;
  const matchUpper = scoreNum;

  const reach = allRecords
    .filter((r) => r.minScore > reachLower && r.minScore <= reachUpper)
    .sort((a, b) => a.minScore - b.minScore);

  const match = allRecords
    .filter((r) => r.minScore <= matchUpper && r.minScore >= matchLower)
    .sort((a, b) => b.minScore - a.minScore);

  const safety = allRecords
    .filter((r) => r.minScore < matchLower)
    .sort((a, b) => b.minScore - a.minScore);

  return NextResponse.json({
    reach: reach.map(formatRecord),
    match: match.map(formatRecord),
    safety: safety.map(formatRecord),
    meta: { examCategory, reachOffset, matchOffset },
  });
}

function formatRecord(r: {
  granularity: string;
  groupCode: string | null;
  groupRequirement: string | null;
  minScore: number;
  avgScore: number | null;
  minRank: number | null;
  admissionType: string;
  batch: string;
  institution: { id: number; name: string; category: string; type: string | null };
}) {
  return {
    granularity: r.granularity,
    groupCode: r.groupCode,
    groupRequirement: r.groupRequirement,
    minScore: r.minScore,
    avgScore: r.avgScore,
    minRank: r.minRank,
    admissionType: r.admissionType,
    batch: r.batch,
    institutionId: r.institution.id,
    institution: r.institution,
  };
}

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';
import { getHkCategoryBadgeClass, HK_CATEGORIES } from '@/lib/constants';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const records = await prisma.associateDegreeRecord.findMany({
    select: { id: true },
    distinct: ['institutionId'],
  });
  if (records.length === 0) return [{ id: '0' }];
  return records.map((r) => ({ id: String(r.institutionId) }));
}

export default async function AssociateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = parseInt(id);
  if (isNaN(idNum)) notFound();

  const record = await prisma.associateDegreeRecord.findFirst({
    where: { institutionId: idNum },
    include: {
      institution: { select: { id: true, name: true, category: true, hkCategory: true, code: true, website: true } },
    },
    orderBy: { year: 'desc' },
  });

  if (!record) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader title="副学士详情" highlightChar="副" backHref="/associate" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-slate-500 mb-4">未找到该副学士课程</p>
            <Link href="/associate" className="text-sm text-brand-accent hover:underline">返回副学士列表</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title={record.programmeName} highlightChar="副" size="medium" backHref="/associate" />

      <div className="flex-1 -mt-10 px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <Link href={`/school/${record.institution.id}`} className="text-lg font-bold text-brand-dark hover:text-brand-accent transition-colors">
                  {record.institution.name}
                </Link>
                {record.institution.hkCategory && (
                  <span className={getHkCategoryBadgeClass(record.institution.hkCategory) + ' ml-2'}>
                    {HK_CATEGORIES[record.institution.hkCategory]?.label}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              {record.institution.code && <span>院校代码: {record.institution.code}</span>}
              {record.programmeCode && <span>课程编号: {record.programmeCode}</span>}
              <span>年份: {record.year}</span>
              {record.programmeCategory && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">{record.programmeCategory}</span>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {record.minScore !== null && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-bold text-brand-accent tabular-nums">{record.minScore}</div>
                <div className="text-xs text-slate-500 mt-1">最低分数</div>
              </div>
            )}
            {record.medianScore !== null && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-bold text-brand-dark tabular-nums">{record.medianScore}</div>
                <div className="text-xs text-slate-500 mt-1">中位数分数</div>
              </div>
            )}
            {record.maxScore !== null && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-bold text-brand-dark tabular-nums">{record.maxScore}</div>
                <div className="text-xs text-slate-500 mt-1">最高分数</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
            <h3 className="[font-family:var(--font-serif)] text-lg font-bold text-brand-dark mb-4">入学要求</h3>
            <div className="space-y-3">
              {record.admissionRequirement && (
                <div><span className="text-xs text-slate-400">DSE 要求</span><p className="text-sm text-slate-700 mt-0.5">{record.admissionRequirement}</p></div>
              )}
              {record.gaokaoRequirement && (
                <div><span className="text-xs text-slate-400">高考要求</span><p className="text-sm text-slate-700 mt-0.5">{record.gaokaoRequirement}</p></div>
              )}
              {record.ieltsRequirement && (
                <div><span className="text-xs text-slate-400">雅思要求</span><p className="text-sm text-slate-700 mt-0.5">IELTS {record.ieltsRequirement}</p></div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
            <h3 className="[font-family:var(--font-serif)] text-lg font-bold text-brand-dark mb-4">其他信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-xs text-slate-400">面试要求</span><p className="text-slate-700 mt-0.5">{record.interviewRequired ? '需要面试' : '无需面试'}</p></div>
              {record.quota && <div><span className="text-xs text-slate-400">招生学额</span><p className="text-slate-700 mt-0.5 tabular-nums">{record.quota} 人</p></div>}
              {record.remarks && <div className="col-span-2"><span className="text-xs text-slate-400">备注</span><p className="text-slate-700 mt-0.5">{record.remarks}</p></div>}
            </div>
          </div>

          {record.sourceUrl && (
            <div className="text-center">
              <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-accent hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                查看原始来源
              </a>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

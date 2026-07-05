'use client';

import { useState, useEffect, useCallback, startTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import RecommendSection, { type RecommendItem } from '@/components/RecommendSection';
import { useCompareStore } from '@/lib/compare-store';
import { EXAM_CATEGORIES, REGION_OPTIONS, HK_CATEGORY_OPTIONS, CATEGORY_OPTIONS, TYPE_OPTIONS, getRecommendThresholds } from '@/lib/constants';

function RecommendPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const examCategory = searchParams.get('examCategory') || 'gaokao';
  const province = searchParams.get('province') || '';
  const year = searchParams.get('year') || '';
  const score = searchParams.get('score') || '';
  const region = searchParams.get('region') || '';
  const degreeLevel = searchParams.get('degreeLevel') || '';
  const config = EXAM_CATEGORIES[examCategory] || EXAM_CATEGORIES.gaokao;

  const category = searchParams.get('category') || '';
  const instType = searchParams.get('type') || '';
  const hkCategory = searchParams.get('hkCategory') || '';
  const filterRegion = searchParams.get('region') || '';

  const compareItems = useCompareStore((s) => s.items);

  const [allRecords, setAllRecords] = useState<RecommendItem[]>([]);
  const [recommendData, setRecommendData] = useState<{
    reach: RecommendItem[];
    match: RecommendItem[];
    safety: RecommendItem[];
  } | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(!(!year || !score));
  const [recommendError, setRecommendError] = useState('');

  const isAssociate = degreeLevel === 'associate';

  useEffect(() => {
    const dataUrl = isAssociate ? '/data/associate.json' : '/data/records.json';
    fetch(dataUrl)
      .then((r) => r.json())
      .then((data) => setAllRecords(data))
      .catch(() => {});
  }, [isAssociate]);

  useEffect(() => {
    if (!year || !score || allRecords.length === 0) return;

    startTransition(() => {
      setRecommendLoading(true);
      setRecommendError('');
    });

    const scoreNum = parseInt(score);
    const { reachOffset, matchOffset } = getRecommendThresholds(examCategory);
    const reachLower = scoreNum;
    const reachUpper = scoreNum + reachOffset;
    const matchLower = scoreNum - matchOffset;
    const matchUpper = scoreNum;

    let filtered = allRecords.filter((r) => {
      if (province && (r as { province?: string }).province !== province) return false;
      if (filterRegion && r.institution.province !== filterRegion) return false;
      if (category && r.institution.category !== category) return false;
      if (instType && (r.institution as { type?: string }).type !== instType) return false;
      if (hkCategory && (r.institution as { hkCategory?: string }).hkCategory !== hkCategory) return false;
      return true;
    });

    const reach = filtered
      .filter((r) => r.minScore > reachLower && r.minScore <= reachUpper)
      .sort((a, b) => a.minScore - b.minScore);
    const match = filtered
      .filter((r) => r.minScore <= matchUpper && r.minScore >= matchLower)
      .sort((a, b) => b.minScore - a.minScore);
    const safety = filtered
      .filter((r) => r.minScore < matchLower)
      .sort((a, b) => b.minScore - a.minScore);

    setRecommendData({ reach, match, safety });
    setRecommendLoading(false);
  }, [year, score, province, examCategory, filterRegion, degreeLevel, category, instType, hkCategory, allRecords]);

  const isInCompare = useCallback(
    (id: number) => useCompareStore.getState().isInList(id),
    []
  );

  const toggleCompare = useCallback((item: RecommendItem) => {
    const store = useCompareStore.getState();
    if (store.isInList(item.institutionId)) {
      store.removeItem(item.institutionId);
    } else {
      store.addItem({
        id: item.institutionId,
        name: item.institution.name,
        province: province || undefined,
        year: year ? parseInt(year) : undefined,
        examCategory: examCategory || undefined,
      });
    }
  }, [province, year, filterRegion, examCategory]);

  if (!year || !score) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader title="智能推荐" highlightChar="智" size="medium" backHref="/" />
        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h2 className="[font-family:var(--font-serif)] text-2xl font-bold text-brand-dark mb-2">
              请输入分数开始智能推荐
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              在首页输入分数后，即可获得冲刺/稳妥/保底院校推荐
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 text-sm font-semibold rounded-xl border transition-colors cursor-pointer"
              style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title={isAssociate ? '副学士推荐' : '智能推荐'}
        highlightChar={isAssociate ? '副' : '智'}
        size="medium"
        backHref="/"
      />

      <div className="flex-1 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl border border-brand-accent/20 p-4 sm:p-5 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="text-slate-600">
                你的分数:{' '}
                <strong className="text-brand-accent text-lg">{score}</strong>{' '}
                分
              </span>
              {province && (
                <span className="text-slate-500">
                  省份: <strong className="text-slate-700">{province}</strong>
                </span>
              )}
              {year && (
                <span className="text-slate-500">
                  年份: <strong className="text-slate-700">{year}</strong>
                </span>
              )}
              <span className="text-slate-400 text-xs ml-auto">
                {config.label}{degreeLevel ? ` · ${degreeLevel === 'associate' ? '副学士' : '本科'}` : ''}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={category}
                onChange={(e) => {
                  const p = new URLSearchParams(searchParams.toString());
                  if (e.target.value) p.set('category', e.target.value); else p.delete('category');
                  router.replace(`/recommend?${p.toString()}`);
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={instType}
                onChange={(e) => {
                  const p = new URLSearchParams(searchParams.toString());
                  if (e.target.value) p.set('type', e.target.value); else p.delete('type');
                  router.replace(`/recommend?${p.toString()}`);
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={filterRegion}
                onChange={(e) => {
                  const p = new URLSearchParams(searchParams.toString());
                  if (e.target.value) p.set('region', e.target.value); else p.delete('region');
                  router.replace(`/recommend?${p.toString()}`);
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer"
              >
                {REGION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {!isAssociate && (
                <select
                  value={hkCategory}
                  onChange={(e) => {
                    const p = new URLSearchParams(searchParams.toString());
                    if (e.target.value) p.set('hkCategory', e.target.value); else p.delete('hkCategory');
                    router.replace(`/recommend?${p.toString()}`);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer"
                >
                  {HK_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
              {(category || instType || filterRegion || hkCategory) && (
                <button
                  onClick={() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.delete('category'); p.delete('type'); p.delete('region'); p.delete('hkCategory');
                    router.replace(`/recommend?${p.toString()}`);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          {compareItems.length > 0 && (
            <div className="flex items-center justify-between bg-brand-accent/5 border border-brand-accent/20 rounded-xl px-4 py-2.5 mb-4">
              <span className="text-sm text-slate-600">
                已选择 <strong className="text-brand-dark">{compareItems.length}</strong> 所院校
              </span>
              <button
                onClick={() => {
                  const event = new CustomEvent('open-compare-drawer');
                  window.dispatchEvent(event);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                style={{ background: 'var(--brand-accent)' }}
              >
                开始对比
              </button>
            </div>
          )}

          <RecommendSection
            recommendLoading={recommendLoading}
            recommendError={recommendError}
            recommendData={recommendData}
            isInCompare={isInCompare}
            onToggleCompare={toggleCompare}
            config={config}
            userScore={Number(score) || undefined}
            isAssociate={isAssociate}
          />

          <div className="mt-8 text-center">
            <button
              onClick={() => { if (window.history.length > 1) router.back(); else router.push('/'); }}
              className="text-sm text-slate-500 hover:text-brand-accent transition-colors"
            >
              返回修改条件
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecommendPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">加载中...</p>
          </div>
        </div>
      }
    >
      <RecommendPageContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, Suspense, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import Footer from '@/components/Footer';
import { useCompareStore } from '@/lib/compare-store';
import { ADMISSION_TYPES, SUBJECT_GROUPS, BATCHES, getCategoryBadgeClass, EXAM_CATEGORIES, REGION_OPTIONS, DEGREE_LEVELS, getRecommendThresholds } from '@/lib/constants';
import type { ExamCategoryConfig } from '@/lib/constants';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import RecommendSection, { SkeletonCard, type RecommendItem } from '@/components/RecommendSection';

interface AdmissionRecordItem {
  id: number;
  year: number;
  province: string;
  subjectGroup: string;
  batch: string;
  admissionType: string;
  minScore: number;
  avgScore?: number;
  minRank?: number;
  enrollmentCount?: number;
  institutionId: number;
  institution: { id: number; name: string; category: string };
}

interface InstitutionDetail {
  id: number;
  name: string;
  code?: string;
  category: string;
  type?: string;
  province: string;
  city?: string;
  website?: string;
  records: {
    year: number;
    province: string;
    subjectGroup: string;
    batch: string;
    admissionType: string;
    minScore: number;
    avgScore?: number;
    minRank?: number;
    enrollmentCount?: number;
  }[];
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={getCategoryBadgeClass(category)}>
      {category}
    </span>
  );
}

function ResultCard({
  record,
  isExpanded,
  onToggleExpand,
  institutionDetail,
  detailLoading,
  isInCompare,
  onToggleCompare,
  config,
  trendData,
}: {
  record: AdmissionRecordItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  institutionDetail: InstitutionDetail | null;
  detailLoading: boolean;
  isInCompare: boolean;
  onToggleCompare: () => void;
  config: ExamCategoryConfig;
  trendData?: { year: number; minScore: number }[];
}) {
  const institutionId = record.institutionId;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className="p-5 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-semibold text-slate-900 truncate">
                {record.institution.name}
              </h4>
              <CategoryBadge category={record.institution.category} />
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
              <span>{record.batch}</span>
              <span className="text-slate-200">|</span>
              <span>{record.admissionType}</span>
            </div>
          </div>
          <div
            className={`text-slate-300 transition-transform duration-200 ml-2 flex-shrink-0 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-2.5 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-500 mb-0.5">最低分</p>
            <p className="text-lg font-bold text-brand-dark">{record.minScore}</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-500 mb-0.5">平均分</p>
            <p className="text-lg font-bold text-brand-dark">{record.avgScore ?? '-'}</p>
          </div>
          {config.rankLabel !== null && (
          <div className="text-center p-2.5 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-500 mb-0.5">最低位次</p>
            <p className="text-lg font-bold text-brand-dark">{record.minRank?.toLocaleString() ?? '-'}</p>
          </div>
          )}
        </div>
      </div>

      {trendData && trendData.length > 1 && (
        <div className="px-5 pb-2">
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData.sort((a, b) => a.year - b.year)}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.5rem',
                    border: '1px solid #f3f4f6',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="minScore"
                  stroke="var(--brand-accent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#b8860b', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-5 pb-4 border-t border-slate-50 pt-3">
        <Link
          href={`/school/${institutionId}`}
          className="flex-1 text-center py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:border-brand-accent hover:text-brand-accent transition-colors"
        >
          详情
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare();
          }}
          className={`flex-1 text-center py-2 text-xs font-medium rounded-lg border transition-colors ${
            isInCompare
              ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
              : 'border-slate-200 text-slate-500 hover:border-brand-accent hover:text-brand-accent'
          }`}
        >
          {isInCompare ? '已加入对比' : '加入对比'}
        </button>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-4">
          {detailLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-40 bg-slate-50 rounded-xl" />
            </div>
          ) : institutionDetail && institutionDetail.records.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">
                {institutionDetail.name} 历年录取趋势
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={institutionDetail.records
                      .map((r) => ({ year: r.year, minScore: r.minScore, avgScore: r.avgScore }))
                      .sort((a, b) => a.year - b.year)
                    }
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '0.75rem',
                        border: '1px solid #f3f4f6',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        fontSize: '0.8125rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="minScore"
                      stroke="var(--brand-accent)"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#b8860b', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#b8860b', strokeWidth: 0 }}
                      name="最低分"
                    />
                    {institutionDetail.records.some((r) => r.avgScore) && (
                      <Line
                        type="monotone"
                        dataKey="avgScore"
                        stroke="#9ca3af"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: '#9ca3af', strokeWidth: 0 }}
                        name="平均分"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">暂无历年录取数据</p>
          )}
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-accent hover:bg-brand-accent/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {pages.map((p, idx) =>
        typeof p === 'string' ? (
          <span key={`ellipsis-${idx}`} className="text-slate-300 px-1">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
              p === page
                ? 'bg-brand-dark text-white shadow-sm'
                : 'text-slate-500 hover:text-brand-accent hover:bg-brand-accent/5'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-accent hover:bg-brand-accent/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function QueryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const province = searchParams.get('province') || '';
  const year = searchParams.get('year') || '';
  const subjectGroup = searchParams.get('subjectGroup') || '';
  const score = searchParams.get('score') || '';
  const batch = searchParams.get('batch') || '';
  const admissionType = searchParams.get('admissionType') || '统招';
  const mode = searchParams.get('mode') || 'normal';
  const exam = searchParams.get('exam') || 'gaokao';
  const examCategory = searchParams.get('examCategory') || 'gaokao';
  const region = searchParams.get('region') || '';
  const degreeLevel = searchParams.get('degreeLevel') || '';
  const config = EXAM_CATEGORIES[examCategory] || EXAM_CATEGORIES.gaokao;

  const [provinces, setProvinces] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const [form, setForm] = useState({
    province,
    year,
    score,
    subjectGroup,
    batch,
    admissionType,
    region,
    degreeLevel,
  });

  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch('/data/provinces-years.json');
        const data = await res.json();
        setProvinces(data.provinces);
        setYears(data.years);
      } catch (error) {
        console.error('Failed to fetch filters:', error);
      } finally {
        setFiltersLoading(false);
      }
    }
    fetchFilters();
  }, []);

  function buildSearchParams(
    overrides?: Partial<typeof form>,
    extra?: Record<string, string>
  ) {
    const params = new URLSearchParams();
    params.set('exam', exam);
    params.set('examCategory', examCategory);
    const data = { ...form, ...overrides };
    if (data.province) params.set('province', data.province);
    if (data.year) params.set('year', data.year);
    if (data.score) params.set('score', data.score);
    if (data.subjectGroup) params.set('subjectGroup', data.subjectGroup);
    if (data.batch) params.set('batch', data.batch);
    if (data.admissionType) params.set('admissionType', data.admissionType);
    if (data.region) params.set('region', data.region);
    if (data.degreeLevel) params.set('degreeLevel', data.degreeLevel);
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    }
    return params.toString();
  }

  function handleSearch() {
    const qs = buildSearchParams(undefined, { mode: 'normal' });
    router.push(`/query?${qs}`);
  }

  function handleSwitchMode(newMode: string) {
    const qs = buildSearchParams(undefined, { mode: newMode });
    router.push(`/query?${qs}`);
  }

  const [records, setRecords] = useState<AdmissionRecordItem[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');

  const [recommendData, setRecommendData] = useState<{
    reach: RecommendItem[];
    match: RecommendItem[];
    safety: RecommendItem[];
  } | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState('');

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [institutionDetail, setInstitutionDetail] = useState<InstitutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trendMap, setTrendMap] = useState<Map<number, { year: number; minScore: number }[]>>(new Map());

  const pageSize = 20;

  function toggleCompare(record: AdmissionRecordItem) {
    if (!isHydrated) return;
    const store = useCompareStore.getState();
    if (store.isInList(record.institutionId)) {
      store.removeItem(record.institutionId);
    } else {
      store.addItem({
        id: record.institutionId,
        name: record.institution.name,
        province: province || undefined,
        year: year ? parseInt(year) : undefined,
        subjectGroup: subjectGroup || undefined,
        batch: batch || undefined,
        examCategory: examCategory || undefined,
      });
    }
  }

  function toggleRecommendCompare(item: RecommendItem) {
    if (!isHydrated) return;
    const store = useCompareStore.getState();
    if (store.isInList(item.institution.id)) {
      store.removeItem(item.institution.id);
    } else {
      store.addItem({
        id: item.institution.id,
        name: item.institution.name,
        province: province || undefined,
        year: year ? parseInt(year) : undefined,
        subjectGroup: subjectGroup || undefined,
        batch: batch || undefined,
        examCategory: examCategory || undefined,
      });
    }
  }

  function isInCompare(institutionId: number) {
    if (!isHydrated) return false;
    return useCompareStore.getState().isInList(institutionId);
  }

  async function fetchInstitutionDetail(institutionId: number) {
    setDetailLoading(true);
    try {
      const res = await fetch('/data/institutions.json');
      const allInstitutions = await res.json();
      const inst = allInstitutions.find((i: { id: number }) => i.id === institutionId);
      if (!inst) throw new Error('院校不存在');
      const recordsRes = await fetch('/data/records.json');
      const allRecords = await recordsRes.json();
      const instRecords = allRecords.filter(
        (r: { institutionId: number }) => r.institutionId === institutionId
      );
      setInstitutionDetail({
        id: inst.id,
        name: inst.name,
        code: inst.code,
        category: inst.category,
        type: inst.type,
        province: inst.province,
        city: inst.city,
        website: inst.website,
        records: instRecords.map((r: Record<string, unknown>) => ({
          year: r.year,
          province: r.province,
          subjectGroup: r.subjectGroup,
          batch: r.batch,
          admissionType: r.admissionType,
          minScore: r.minScore,
          avgScore: r.avgScore,
          minRank: r.minRank,
          enrollmentCount: r.enrollmentCount,
        })),
      });
    } catch {
      setInstitutionDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleToggleExpand(record: AdmissionRecordItem) {
    const instId = record.institutionId;
    if (expandedId === instId) {
      setExpandedId(null);
      setInstitutionDetail(null);
    } else {
      setExpandedId(instId);
      fetchInstitutionDetail(instId);
    }
  }

  useEffect(() => {
    let cancelled = false;

    if (mode === 'normal') {
      async function fetchRecords() {
        setRecordsLoading(true);
        setRecordsError('');
        setExpandedId(null);
        setInstitutionDetail(null);

        try {
          const res = await fetch('/data/records.json');
          const allRecords = (await res.json()) as AdmissionRecordItem[];

          let filtered = allRecords.filter((r) => {
            if (province && r.province !== province) return false;
            if (year && r.year !== parseInt(year)) return false;
            if (subjectGroup && r.subjectGroup !== subjectGroup) return false;
            if (batch && r.batch !== batch) return false;
            if (admissionType && r.admissionType !== admissionType) return false;
            return true;
          });

          const total = filtered.length;
          const start = (recordsPage - 1) * pageSize;
          const paged = filtered.slice(start, start + pageSize);

          if (!cancelled) {
            setRecords(paged);
            setRecordsTotal(total);

            const trendMap = new Map<number, { year: number; minScore: number }[]>();
            for (const r of filtered) {
              const existing = trendMap.get(r.institutionId) || [];
              existing.push({ year: r.year, minScore: r.minScore });
              trendMap.set(r.institutionId, existing);
            }
            setTrendMap(trendMap);
          }
        } catch (err) {
          if (!cancelled) {
            setRecordsError(err instanceof Error ? err.message : '查询失败，请稍后重试');
          }
        } finally {
          if (!cancelled) {
            setRecordsLoading(false);
          }
        }
      }

      fetchRecords();
    } else if (mode === 'recommend') {
      async function fetchRecommendData() {
        setRecommendLoading(true);
        setRecommendError('');
        setRecommendData(null);

        try {
          const res = await fetch('/data/records.json');
          const allRecords = (await res.json()) as AdmissionRecordItem[];

          let filtered = allRecords.filter((r) => {
            if (province && r.province !== province) return false;
            if (year && r.year !== parseInt(year)) return false;
            if (subjectGroup && r.subjectGroup !== subjectGroup) return false;
            if (batch && r.batch !== batch) return false;
            if (admissionType && r.admissionType !== admissionType) return false;
            return true;
          });

          const scoreNum = parseInt(score);
          const { reachOffset, matchOffset } = getRecommendThresholds(examCategory);
          const reachLower = scoreNum;
          const reachUpper = scoreNum + reachOffset;
          const matchLower = scoreNum - matchOffset;
          const matchUpper = scoreNum;

          const reach = filtered
            .filter((r) => r.minScore > reachLower && r.minScore <= reachUpper)
            .sort((a, b) => a.minScore - b.minScore);
          const match = filtered
            .filter((r) => r.minScore <= matchUpper && r.minScore >= matchLower)
            .sort((a, b) => b.minScore - a.minScore);
          const safety = filtered
            .filter((r) => r.minScore < matchLower)
            .sort((a, b) => b.minScore - a.minScore);

          if (!cancelled) {
            setRecommendData({ reach, match, safety });
          }
        } catch (err) {
          if (!cancelled) {
            setRecommendError(err instanceof Error ? err.message : '推荐查询失败，请稍后重试');
          }
        } finally {
          if (!cancelled) {
            setRecommendLoading(false);
          }
        }
      }

      fetchRecommendData();
    }

    return () => {
      cancelled = true;
    };
  }, [mode, province, year, subjectGroup, score, batch, admissionType, examCategory, recordsPage]);

  function handlePageChange(page: number) {
    setRecordsPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const selectClass =
    'w-full h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white appearance-none cursor-pointer';

  const inputClass =
    'w-full h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white placeholder:text-slate-400';

  const hasFilterParams = province || year || subjectGroup || score;
  const readyForNormalQuery = mode === 'normal' && hasFilterParams;
  const readyForRecommendQuery = mode === 'recommend' && hasFilterParams && score;

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title="录取查询"
        highlightChar="录"
        size="medium"
        backHref="/"
        bottomSlot={
          <div className="rounded-2xl border border-white/15 bg-white/95 p-3 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-brand-accent hover:border-brand-accent/30 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                {filterOpen ? '收起筛选' : '筛选条件'}
              </button>

              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => handleSwitchMode('normal')}
                  className={`flex-1 min-w-[120px] px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    mode !== 'recommend'
                      ? 'bg-white text-brand-dark shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  普通查询
                </button>
                <button
                  onClick={() => handleSwitchMode('recommend')}
                  className={`flex-1 min-w-[120px] px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    mode === 'recommend'
                      ? 'bg-white text-brand-dark shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  智能推荐
                </button>
              </div>
            </div>
          </div>
        }
      />

      <div className="flex-1 px-4 pb-20 pt-6 sm:pt-8">
        <div className="max-w-6xl mx-auto">
          {filterOpen && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-6 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">省份</label>
                  {filtersLoading ? (
                    <div className="w-full h-11 bg-slate-100 rounded-xl animate-pulse" />
                  ) : (
                    <select
                      value={form.province}
                      onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">请选择省份</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">年份</label>
                  {filtersLoading ? (
                    <div className="w-full h-11 bg-slate-100 rounded-xl animate-pulse" />
                  ) : (
                    <select
                      value={form.year}
                      onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">请选择年份</option>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">分数</label>
                  <input
                    type="number"
                    value={form.score}
                    onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
                    placeholder="输入分数"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">选科组合</label>
                  <select
                    value={form.subjectGroup}
                    onChange={(e) => setForm((prev) => ({ ...prev, subjectGroup: e.target.value }))}
                    className={selectClass}
                  >
                    {SUBJECT_GROUPS.map((sg) => (
                      <option key={sg.value} value={sg.value}>{sg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">招生批次</label>
                  <select
                    value={form.batch}
                    onChange={(e) => setForm((prev) => ({ ...prev, batch: e.target.value }))}
                    className={selectClass}
                  >
                    {BATCHES.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">升学类型</label>
                  <select
                    value={form.admissionType}
                    onChange={(e) => setForm((prev) => ({ ...prev, admissionType: e.target.value }))}
                    className={selectClass}
                  >
                    {ADMISSION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">地区</label>
                  <select
                    value={form.region}
                    onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
                    className={selectClass}
                  >
                    {REGION_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">学位层级</label>
                  <select
                    value={form.degreeLevel}
                    onChange={(e) => setForm((prev) => ({ ...prev, degreeLevel: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">全部学位</option>
                    {DEGREE_LEVELS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setRecordsPage(1);
                    handleSearch();
                  }}
                  className="flex-1 h-11 text-sm font-semibold text-white rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-mid))' }}
                >
                  查询
                </button>
              </div>
            </div>
          )}

          {mode === 'normal' && !readyForNormalQuery && (
            <EmptyState
              title="请输入查询条件"
              description="展开筛选条件，选择省份、年份等信息后点击查询"
              variant="search"
            />
          )}

          {mode === 'normal' && readyForNormalQuery && (
            <div>
              {recordsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : recordsError ? (
                <ErrorState message={recordsError} />
              ) : records.length === 0 ? (
                <EmptyState
                  title="未找到匹配的录取数据"
                  description="请尝试调整查询条件"
                  variant="data"
                />
              ) : (
                <div className="space-y-4">
                  {records.map((record) => (
                    <ResultCard
                      key={record.id}
                      record={record}
                      isExpanded={expandedId === record.institutionId}
                      onToggleExpand={() => handleToggleExpand(record)}
                      institutionDetail={expandedId === record.institutionId ? institutionDetail : null}
                      detailLoading={expandedId === record.institutionId ? detailLoading : false}
                      isInCompare={isInCompare(record.institutionId)}
                      onToggleCompare={() => toggleCompare(record)}
                      config={config}
                      trendData={trendMap.get(record.institutionId)}
                    />
                  ))}

                  <Pagination
                    page={recordsPage}
                    pageSize={pageSize}
                    total={recordsTotal}
                    onPageChange={handlePageChange}
                  />

                  <p className="text-center text-xs text-slate-400 mt-4">共 {recordsTotal} 条记录</p>
                </div>
              )}
            </div>
          )}

          {mode === 'recommend' && !readyForRecommendQuery && (
            <EmptyState
              title="请输入分数进行智能推荐"
              description="展开筛选条件，输入分数后切换到智能推荐模式"
              variant="recommend"
            />
          )}

          {mode === 'recommend' && readyForRecommendQuery && (
            <div>
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
                  {subjectGroup && (
                    <span className="text-slate-500">
                      选科: <strong className="text-slate-700">{subjectGroup}</strong>
                    </span>
                  )}
                  {year && (
                    <span className="text-slate-500">
                      年份: <strong className="text-slate-700">{year}</strong>
                    </span>
                  )}
                </div>
              </div>

              <RecommendSection
                recommendLoading={recommendLoading}
                recommendError={recommendError}
                recommendData={recommendData}
                isInCompare={isInCompare}
                onToggleCompare={toggleRecommendCompare}
                config={config}
              />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function QueryPage() {
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
      <QueryPageContent />
    </Suspense>
  );
}

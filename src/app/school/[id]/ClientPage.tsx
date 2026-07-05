'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EmptyState from '@/components/EmptyState';
import { getCategoryStyle, getTypeStyle, CHART_COLORS } from '@/lib/constants';
import { useCompareStore } from '@/lib/compare-store';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';


interface MajorRecord {
  id?: number;
  majorName: string;
  majorCode: string | null;
  minScore: number;
  avgScore: number | null;
  maxScore: number | null;
  enrollmentCount: number | null;
}

interface AssociateRecord {
  id: number;
  examCategory: string;
  year: number;
  programmeName: string;
  programmeCode: string | null;
  programmeCategory: string | null;
  admissionRequirement: string | null;
  minScore: number | null;
  medianScore: number | null;
  maxScore: number | null;
  interviewRequired: boolean | null;
  ieltsRequirement: number | null;
  gaokaoRequirement: string | null;
  quota: number | null;
}

interface AdmissionRecord {
  id?: number;
  year: number;
  province: string;
  subjectGroup: string;
  batch: string;
  admissionType: string;
  minScore: number;
  avgScore: number | null;
  medianScore: number | null;
  lqScore: number | null;
  uqScore: number | null;
  groupCode: string | null;
  programmeName: string | null;
  minRank: number | null;
  enrollmentCount: number | null;
  majors: MajorRecord[];
}

interface Institution {
  id: number;
  name: string;
  code: string | null;
  category: string;
  type: string | null;
  province: string;
  city: string | null;
  website: string | null;
  region: string | null;
  hkCategory: string | null;
  records: AdmissionRecord[];
  associateRecords: AssociateRecord[];
  meta?: { total: number; associateTotal: number };
}

function HkCategoryBadge({ hkCategory }: { hkCategory: string }) {
  if (hkCategory === 'ugc-funded') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">港八大</span>;
  }
  if (hkCategory === 'self-financed') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-sky-50 text-sky-700 border-sky-200">自资院校</span>;
  }
  if (hkCategory === 'sub-degree') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">副学士院校</span>;
  }
  return null;
}

function Skeleton() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-dark pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-10 w-64 bg-white/10 rounded-lg animate-pulse mb-4" />
          <div className="flex gap-2 mb-3">
            <div className="h-6 w-16 bg-white/10 rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-white/10 rounded-full animate-pulse" />
          </div>
          <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 -mt-8 pb-20">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-8">
          <div className="h-6 w-32 bg-slate-100 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchoolDetailPage({
  initialInstitution,
  initialRecords,
  recordCount,
}: {
  initialInstitution: { id: number; name: string; code: string | null; category: string; type: string | null; province: string; city: string | null; website: string | null; region: string | null; hkCategory: string | null } | null;
  initialRecords: AdmissionRecord[];
  recordCount: number;
}) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [institution, setInstitution] = useState<Institution | null>(
    initialInstitution ? { ...initialInstitution, records: initialRecords, associateRecords: [], meta: { total: recordCount, associateTotal: 0 } } : null
  );
  const [loading, setLoading] = useState(!initialInstitution);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());
  const [chartSubjectFilter, setChartSubjectFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'undergraduate' | 'associate'>('undergraduate');

  // Detect if this school has DSE-like records (groupCode-based) for chart grouping
  const hasGroupCodes = useMemo(() => {
    if (!institution) return false;
    return institution.records.some((r) => r.groupCode && r.groupCode.length > 0);
  }, [institution]);

  const [chartGroupMode, setChartGroupMode] = useState<'subjectGroup' | 'groupCode'>('subjectGroup');

  useEffect(() => {
    if (institution?.records.some((r) => r.groupCode?.length)) {
      setChartGroupMode('groupCode');
    }
  }, [institution?.id]);

  const [recordsPage, setRecordsPage] = useState(1);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);
  const recordsPageSize = 50;

  useEffect(() => {
    setRecordsPage(1);
  }, [params.id]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/data/records.json');
        const allRecords = await res.json();
        const instRecords = allRecords.filter(
          (r: { institutionId: number }) => r.institutionId === parseInt(params.id)
        );
        const total = instRecords.length;

        const institutionsRes = await fetch('/data/institutions.json');
        const allInstitutions = await institutionsRes.json();
        const inst = allInstitutions.find((i: { id: number }) => i.id === parseInt(params.id));

        if (!inst) {
          setError('院校不存在');
          return;
        }

        const paged = instRecords.slice((recordsPage - 1) * recordsPageSize, recordsPage * recordsPageSize);
        const mappedRecords = paged.map((r: Record<string, unknown>) => ({
          id: r.id,
          year: r.year,
          province: r.province,
          subjectGroup: r.subjectGroup,
          batch: r.batch,
          admissionType: r.admissionType,
          minScore: r.minScore,
          avgScore: r.avgScore,
          medianScore: r.medianScore,
          uqScore: r.uqScore,
          lqScore: r.lqScore,
          groupCode: r.groupCode,
          programmeName: r.programmeName,
          groupRequirement: r.groupRequirement,
          examCategory: r.examCategory,
          minRank: r.minRank,
          enrollmentCount: r.enrollmentCount,
          majors: [],
        }));

        setHasMoreRecords(total > recordsPage * recordsPageSize);
        setInstitution((prev) => {
          const base = {
            id: inst.id,
            name: inst.name,
            code: inst.code,
            category: inst.category,
            type: inst.type,
            province: inst.province,
            city: inst.city,
            website: inst.website,
            region: inst.region,
            hkCategory: inst.hkCategory,
            associateRecords: [],
            meta: { total, associateTotal: 0 },
          };
          if (prev && recordsPage > 1) {
            return { ...base, records: [...prev.records, ...mappedRecords] };
          }
          return { ...base, records: mappedRecords };
        });
      } catch {
        setError('网络错误，请检查网络连接后重试');
      } finally {
        setLoading(false);
      }
    }
    if (recordsPage > 1 || !initialInstitution) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [params.id, recordsPage]);

  const years = useMemo(() => {
    if (!institution) return [];
    const unique = [...new Set(institution.records.map((r) => r.year))].sort((a, b) => b - a);
    return unique;
  }, [institution]);

  const filteredRecords = useMemo(() => {
    if (!institution) return [];
    let records = [...institution.records];
    if (selectedYear) {
      records = records.filter((r) => r.year === selectedYear);
    }
    records.sort((a, b) => (sortAsc ? a.year - b.year : b.year - a.year));
    return records;
  }, [institution, selectedYear, sortAsc]);

  const chartData = useMemo(() => {
    if (!institution) return [];
    const records = institution.records;
    const useGroupCode = chartGroupMode === 'groupCode' && hasGroupCodes;
    const yearSet = [...new Set(records.map((r) => r.year))].sort((a, b) => a - b);

    const filteredYears = yearSet.filter(
      (year) => !selectedYear || (year >= selectedYear - 2 && year <= selectedYear + 2)
    );

    if (useGroupCode) {
      // Group by groupCode for DSE-style records
      const allCodes = [...new Set(records.map((r) => r.groupCode).filter(Boolean))] as string[];
      return filteredYears.map((year) => {
        const entry: Record<string, string | number | undefined> = { year };
        for (const code of allCodes) {
          const match = records.find((r) => r.year === year && r.groupCode === code);
          if (match) {
            entry[`${code}_min`] = match.minScore;
            if (match.medianScore != null) entry[`${code}_median`] = match.medianScore;
            if (match.lqScore != null) entry[`${code}_lq`] = match.lqScore;
          }
        }
        return entry;
      });
    }

    // Default: group by subjectGroup
    const subjectGroups = [...new Set(records.map((r) => r.subjectGroup))];
    return filteredYears.map((year) => {
      const entry: Record<string, string | number | undefined> = { year };
      subjectGroups.forEach((sg) => {
        const match = records.find((r) => r.year === year && r.subjectGroup === sg);
        entry[sg] = match ? match.minScore : undefined;
      });
      return entry;
    });
  }, [institution, selectedYear, chartGroupMode, hasGroupCodes]);

  const chartSubjectGroups = useMemo(() => {
    if (!institution) return [];
    const useGroupCode = chartGroupMode === 'groupCode' && hasGroupCodes;
    if (useGroupCode) {
      const codes = [...new Set(institution.records.map((r) => r.groupCode).filter(Boolean))] as string[];
      return codes.map((c) => `${c}_min`);
    }
    return [...new Set(institution?.records.map((r) => r.subjectGroup) || [])];
  }, [institution, chartGroupMode, hasGroupCodes]);

  // Map groupCode to display label (JSxxxx: programmeName truncated)
  const codeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!institution) return map;
    for (const r of institution.records) {
      if (r.groupCode && !map.has(r.groupCode)) {
        const name = r.programmeName || '';
        const short = name.replace(/^\d{4}\s*/, '').slice(0, 25);
        map.set(r.groupCode, `${r.groupCode}: ${short}`);
      }
    }
    return map;
  }, [institution]);

  const hasMultipleYears = years.length > 1;

  const toggleExpand = useCallback((index: number) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleCompare = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-compare-drawer'));
  }, []);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-400 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="[font-family:var(--font-serif)] text-2xl font-bold text-brand-dark mb-2">{error}</h2>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2.5 text-sm font-medium rounded-xl border transition-colors cursor-pointer"
            style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!institution) return null;

  const isInternational = filteredRecords.length > 0
    ? !['统招', '艺考', '体育', '强基', '综评', '保送'].includes(filteredRecords[0].admissionType)
    : false;

  return (
    <div className="min-h-screen">
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--brand-dark) 0%, var(--brand-mid) 50%, #0f3460 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, var(--brand-accent) 1px, transparent 1px), radial-gradient(circle at 80% 20%, var(--brand-accent) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-6xl mx-auto pt-14 pb-14 px-4">
          <button
            onClick={() => { if (window.history.length > 1) router.back(); else router.push('/'); }}
            className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            返回
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="[font-family:var(--font-serif)] text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3 break-words">
                {institution.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {institution.category && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryStyle(institution.category)}`}>
                    {institution.category}
                  </span>
                )}
                {institution.hkCategory && <HkCategoryBadge hkCategory={institution.hkCategory} />}
                {institution.type && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeStyle(institution.type)}`}>
                    {institution.type}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-white/60 text-sm">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {institution.province}
                  {institution.city && ` · ${institution.city}`}
                </span>
                {institution.code && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    {institution.code}
                  </span>
                )}
                {institution.website && (
                  <a
                    href={institution.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-accent hover:text-brand-accent/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    官网
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={handleCompare}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5"
              style={{
                color: 'var(--brand-accent)',
                borderColor: 'var(--brand-accent)',
                backgroundColor: 'var(--brand-accent-light)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
              </svg>
              查看对比
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8 pb-20">
        {/* Tab 切换 */}
        {(institution.region === 'hongkong' || (institution.associateRecords && institution.associateRecords.length > 0)) && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('undergraduate')}
              className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                activeTab === 'undergraduate'
                  ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'
              }`}
            >
              本科录取
            </button>
            <button
              onClick={() => setActiveTab('associate')}
              className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                activeTab === 'associate'
                  ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'
              }`}
            >
              副学士课程
              {institution.meta && institution.meta.associateTotal > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-600">
                  {institution.meta.associateTotal}
                </span>
              )}
            </button>
          </div>
        )}

        {activeTab === 'associate' ? (
          /* 副学士课程列表 */
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
            <h2 className="[font-family:var(--font-serif)] text-xl font-bold text-brand-dark mb-5">
              副学士课程
              {institution.associateRecords && institution.associateRecords.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({institution.associateRecords.length} 个课程)
                </span>
              )}
            </h2>

            {!institution.associateRecords || institution.associateRecords.length === 0 ? (
              <EmptyState
                title="暂无副学士课程数据"
                variant="data"
                className="border-0 shadow-none rounded-none"
              />
            ) : (
              <div className="space-y-3">
                {institution.associateRecords.map((ar) => (
                  <div
                    key={ar.id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-brand-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-brand-dark mb-1">
                          {ar.programmeName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {ar.programmeCode && (
                            <span className="text-xs text-slate-400 font-mono">{ar.programmeCode}</span>
                          )}
                          {ar.programmeCategory && (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {ar.programmeCategory}
                            </span>
                          )}
                          {ar.interviewRequired && (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">需要面试</span>
                          )}
                        </div>
                        {ar.admissionRequirement && (
                          <p className="text-xs text-slate-400 line-clamp-2">{ar.admissionRequirement}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-3 text-right">
                        {ar.minScore !== null && (
                          <div>
                            <div className="text-lg font-bold text-brand-accent tabular-nums">{ar.minScore}</div>
                            <div className="text-[10px] text-slate-400">最低分</div>
                          </div>
                        )}
                        {ar.medianScore !== null && (
                          <div>
                            <div className="text-lg font-bold text-brand-dark tabular-nums">{ar.medianScore}</div>
                            <div className="text-[10px] text-slate-400">中位数</div>
                          </div>
                        )}
                        {ar.maxScore !== null && (
                          <div>
                            <div className="text-lg font-bold text-slate-500 tabular-nums">{ar.maxScore}</div>
                            <div className="text-[10px] text-slate-400">最高分</div>
                          </div>
                        )}
                        <div className="text-xs text-slate-400">{ar.year}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasMoreRecords && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setRecordsPage((p) => p + 1)}
                  className="px-6 py-2 text-sm text-brand-accent border border-brand-accent/30 rounded-xl hover:bg-brand-accent/5 transition-colors cursor-pointer"
                >
                  加载更多
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
        {hasMultipleYears && chartSubjectGroups.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <h2 className="[font-family:var(--font-serif)] text-xl font-bold text-brand-dark">
                  录取分数线趋势
                </h2>
                {hasGroupCodes && (
                  <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setChartGroupMode('subjectGroup')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        chartGroupMode === 'subjectGroup' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      按选科
                    </button>
                    <button
                      onClick={() => setChartGroupMode('groupCode')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        chartGroupMode === 'groupCode' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      按课程
                    </button>
                  </div>
                )}
              </div>
              {chartSubjectGroups.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setChartSubjectFilter(null)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                      chartSubjectFilter === null
                        ? 'bg-brand-dark text-white border-brand-dark'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-brand-accent hover:text-brand-accent'
                    }`}
                  >
                    全部
                  </button>
                  {chartSubjectGroups.slice(0, 8).map((sg) => (
                    <button
                      key={sg}
                      onClick={() => setChartSubjectFilter((prev) => (prev === sg ? null : sg))}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                        chartSubjectFilter === sg
                          ? 'bg-brand-dark text-white border-brand-dark'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-brand-accent hover:text-brand-accent'
                      }`}
                    >
                      {chartGroupMode === 'groupCode' ? (codeLabelMap.get(sg.replace('_min', '')) || sg).slice(0, 20) : sg}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: '#888' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e8e8e8' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#888' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e8e8e8',
                      borderRadius: '12px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                      fontSize: '13px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                  {chartSubjectGroups
                    .filter((sg) => !chartSubjectFilter || sg === chartSubjectFilter)
                    .map((sg, i) => {
                      const isGroupCode = chartGroupMode === 'groupCode' && hasGroupCodes;
                      const baseCode = isGroupCode ? sg.replace('_min', '') : '';
                      const color = CHART_COLORS[i % CHART_COLORS.length];
                      return (
                        <Fragment key={sg}>
                          <Line
                            type="monotone"
                            dataKey={sg}
                            name={isGroupCode ? `${codeLabelMap.get(baseCode) || baseCode}` : sg}
                            stroke={color}
                            strokeWidth={isGroupCode ? 2.5 : 2.5}
                            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                            connectNulls
                          />
                          {isGroupCode && (
                            <>
                              <Line
                                type="monotone"
                                dataKey={`${baseCode}_median`}
                                name={`${codeLabelMap.get(baseCode) || baseCode} 中位数`}
                                stroke={color}
                                strokeWidth={1.5}
                                strokeDasharray="5 3"
                                dot={false}
                                connectNulls
                                legendType="none"
                              />
                              <Line
                                type="monotone"
                                dataKey={`${baseCode}_lq`}
                                name={`${codeLabelMap.get(baseCode) || baseCode} LQ`}
                                stroke={color}
                                strokeWidth={1}
                                strokeDasharray="2 3"
                                dot={false}
                                connectNulls
                                legendType="none"
                                opacity={0.6}
                              />
                            </>
                          )}
                        </Fragment>
                      );
                    })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="[font-family:var(--font-serif)] text-xl font-bold text-brand-dark">
              历年录取数据
              {filteredRecords.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({filteredRecords.length} 条记录)
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              {years.length > 0 && (
                <select
                  value={selectedYear || ''}
                  onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white appearance-none cursor-pointer"
                >
                  <option value="">全部年份</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="h-9 px-3 text-sm font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:border-brand-accent hover:text-brand-accent transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  {sortAsc ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                  )}
                </svg>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={sortAsc ? 'M4.5 15.75l7.5-7.5 7.5 7.5' : 'M19.5 8.25l-7.5 7.5-7.5-7.5'} />
                </svg>
              </button>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <EmptyState
              title="暂无该年份的录取数据"
              variant="data"
              className="border-0 shadow-none rounded-none"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">年份</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">省份</th>
                    {hasGroupCodes ? (
                      <>
                        <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">课程代码</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">课程名称</th>
                      </>
                    ) : (
                      <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">选科</th>
                    )}
                    <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">批次</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">招生类型</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">最低分</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">平均分</th>
                    {!isInternational && (
                      <th className="text-right py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">最低位次</th>
                    )}
                    <th className="text-right py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">招生人数</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap w-14">专业</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, idx) => (
                    <Fragment key={`${record.id}-${idx}`}>
                      <tr
                        key={`${record.year}-${record.province}-${record.subjectGroup}-${record.batch}-${record.admissionType}`}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3 px-3 font-medium text-brand-dark whitespace-nowrap">{record.year}</td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{record.province}</td>
                        {hasGroupCodes ? (
                          <>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-mono text-xs">{record.groupCode || '-'}</td>
                            <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate text-xs" title={record.programmeName || ''}>{record.programmeName || '-'}</td>
                          </>
                        ) : (
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{record.subjectGroup}</td>
                        )}
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{record.batch}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            {record.admissionType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-brand-dark tabular-nums whitespace-nowrap">{record.minScore}</td>
                        <td className="py-3 px-3 text-right text-slate-500 tabular-nums whitespace-nowrap">{record.avgScore ?? '-'}</td>
                        {!isInternational && (
                          <td className="py-3 px-3 text-right text-slate-500 tabular-nums whitespace-nowrap">
                            {record.minRank != null ? record.minRank.toLocaleString() : '-'}
                          </td>
                        )}
                        <td className="py-3 px-3 text-right text-slate-500 tabular-nums whitespace-nowrap">{record.enrollmentCount ?? '-'}</td>
                        <td className="py-3 px-3 text-center">
                          {(record.majors?.length ?? 0) > 0 && (
                            <button
                              onClick={() => toggleExpand(idx)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-brand-accent hover:bg-brand-accent/10 transition-colors cursor-pointer"
                            >
                              <svg
                                className={`w-4 h-4 transition-transform ${expandedRecords.has(idx) ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedRecords.has(idx) && (record.majors?.length ?? 0) > 0 && (
                        <tr key={`${idx}-majors`}>
                          <td colSpan={10} className="p-0">
                            <div className="bg-slate-50/60 mx-3 my-2 rounded-xl p-4 border border-slate-100">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">专业录取分数</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200/60">
                                      <th className="text-left py-2 px-2 font-medium text-slate-400 whitespace-nowrap">专业名称</th>
                                      <th className="text-left py-2 px-2 font-medium text-slate-400 whitespace-nowrap">专业代码</th>
                                      <th className="text-right py-2 px-2 font-medium text-slate-400 whitespace-nowrap">最低分</th>
                                      <th className="text-right py-2 px-2 font-medium text-slate-400 whitespace-nowrap">平均分</th>
                                      <th className="text-right py-2 px-2 font-medium text-slate-400 whitespace-nowrap">最高分</th>
                                      <th className="text-right py-2 px-2 font-medium text-slate-400 whitespace-nowrap">招生人数</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.majors?.map((major, mIdx) => (
                                      <tr
                                        key={`${major.majorName}-${major.majorCode}-${mIdx}`}
                                        className="border-b border-slate-100/60 last:border-b-0 hover:bg-white/60 transition-colors"
                                      >
                                        <td className="py-2 px-2 text-slate-700 font-medium whitespace-nowrap">{major.majorName}</td>
                                        <td className="py-2 px-2 text-slate-400 font-mono whitespace-nowrap">{major.majorCode || '-'}</td>
                                        <td className="py-2 px-2 text-right text-brand-dark font-semibold tabular-nums whitespace-nowrap">{major.minScore}</td>
                                        <td className="py-2 px-2 text-right text-slate-500 tabular-nums whitespace-nowrap">{major.avgScore ?? '-'}</td>
                                        <td className="py-2 px-2 text-right text-slate-500 tabular-nums whitespace-nowrap">{major.maxScore ?? '-'}</td>
                                        <td className="py-2 px-2 text-right text-slate-500 tabular-nums whitespace-nowrap">{major.enrollmentCount ?? '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';
import { EXAM_CATEGORIES, type ExamCategoryConfig } from '@/lib/constants';

const INTL_KEYS = ['dse', 'ib', 'alevel', 'sat', 'act', 'ap'] as const;

interface HkInst {
  id: number;
  name: string;
  code: string | null;
  hkCategory: string | null;
  _count: { records: number; associateRecords: number };
  examRecordCount: number | null;
}

function TrackCard({
  active,
  onClick,
  label,
  subtitle,
  icon,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 rounded-2xl border-2 p-5 sm:p-6 text-left transition-all duration-300 cursor-pointer group ${
        active
          ? 'border-brand-accent shadow-[0_8px_30px_-6px_rgba(184,134,11,0.25)] scale-[1.02]'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
      style={{
        backgroundColor: active ? 'var(--brand-accent-light)' : '#ffffff',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            active ? 'text-white' : 'text-slate-500 bg-slate-100 group-hover:bg-slate-200'
          }`}
          style={active ? { backgroundColor: color } : undefined}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className={`text-base font-bold mb-0.5 transition-colors ${active ? 'text-brand-accent' : 'text-slate-800'}`}>
            {label}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
        </div>
        {active && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

export default function HomePage() {
  const [track, setTrack] = useState<'gaokao' | 'international'>('gaokao');
  const [intlExam, setIntlExam] = useState<string>('dse');
  const [degreeLevel, setDegreeLevel] = useState<'undergraduate' | 'associate'>('undergraduate');
  const [provinces, setProvinces] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [hkInsts, setHkInsts] = useState<HkInst[]>([]);
  const [allInstitutions, setAllInstitutions] = useState<Array<{ region?: string }>>([]);
  const [showAllInstitutions, setShowAllInstitutions] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    province: '',
    year: '',
    score: '',
    subjectGroup: '',
  });

  const effectiveYear = form.year || String(years[0] || new Date().getFullYear());
  const activeExam = track === 'gaokao' ? 'gaokao' : intlExam;

  useEffect(() => {
    async function fetchInit() {
      try {
        const [pRes, instRes] = await Promise.all([
          fetch('/data/provinces-years.json'),
          fetch('/data/institutions.json'),
        ]);
        const [pData, instData] = await Promise.all([pRes.json(), instRes.json()]);
        setProvinces(pData.provinces || []);
        setYears(pData.years || []);
        const hk = instData.filter((i: { region?: string }) => i.region === 'hongkong');
        setAllInstitutions(hk);
        setShowAllInstitutions(true);
      } finally {
        setLoading(false);
      }
    }
    fetchInit();
  }, []);

  useEffect(() => {
    const hk = allInstitutions.filter((i: { region?: string }) => i.region === 'hongkong');
    const filtered = track === 'gaokao' ? hk : hk;
    setHkInsts(filtered);
  }, [track, intlExam, allInstitutions]);

  useEffect(() => {
    setShowAllInstitutions(false);
  }, [track, intlExam]);

  useEffect(() => {
    setShowAllInstitutions(false);
  }, [track, intlExam]);

  const visibleInsts = useMemo(() => {
    if (showAllInstitutions) return hkInsts;
    return hkInsts.filter((i) => i.examRecordCount === null || i.examRecordCount > 0);
  }, [hkInsts, showAllInstitutions]);

  const config: ExamCategoryConfig = EXAM_CATEGORIES[activeExam] || EXAM_CATEGORIES.gaokao;

  const recommendHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('exam', activeExam);
    params.set('examCategory', activeExam);
    params.set('year', effectiveYear);
    if (track === 'gaokao' && form.province) params.set('province', form.province);
    if (form.score) params.set('score', form.score);
    if (form.subjectGroup) params.set('subjectGroup', form.subjectGroup);
    if (degreeLevel === 'associate') params.set('degreeLevel', 'associate');
    params.set('region', 'hongkong');
    return `/recommend?${params.toString()}`;
  }, [activeExam, effectiveYear, form.province, form.score, form.subjectGroup, degreeLevel, track]);

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title="香港院校录取查询"
        subtitle="内地同学申请香港本科 · 副学士 — 智能匹配真实录取分数线"
        size="medium"
      />

      <div className="flex-1 px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          {/* ── Track Selection ── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <TrackCard
              active={track === 'gaokao'}
              onClick={() => setTrack('gaokao')}
              label="高考生频道"
              subtitle="参加全国高考，凭分数申请香港本科或副学士"
              color="#b8860b"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              }
            />
            <TrackCard
              active={track === 'international'}
              onClick={() => setTrack('international')}
              label="国际生频道"
              subtitle="DSE · IB · A-Level · SAT · AP 成绩申请"
              color="#1e40af"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              }
            />
          </div>

          {/* ── Recommendation Form ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-8">
            {/* degree toggle */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setDegreeLevel('undergraduate')}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                  degreeLevel === 'undergraduate'
                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                    : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'
                }`}
              >
                本科
              </button>
              <button
                onClick={() => setDegreeLevel('associate')}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                  degreeLevel === 'associate'
                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                    : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'
                }`}
              >
                副学士
              </button>
            </div>

            {/* international exam selector */}
            {track === 'international' && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {INTL_KEYS.map((key) => {
                  const cfg = EXAM_CATEGORIES[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setIntlExam(key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        intlExam === key
                          ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                          : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {track === 'gaokao' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">省份</label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                    disabled={loading}
                    className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white disabled:opacity-50"
                  >
                    <option value="">选择省份</option>
                    {provinces.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">年份</label>
                <select
                  value={form.year}
                  onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                  disabled={loading}
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white disabled:opacity-50"
                >
                  <option value="">选择年份</option>
                  {years.map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  分数（满分 {config.scoreMax ?? '-'}）
                </label>
                <input
                  type="number"
                  value={form.score}
                  onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))}
                  placeholder="输入你的分数"
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white placeholder:text-slate-400"
                />
              </div>
              {track === 'gaokao' && config.subjects && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{config.subjectLabel}</label>
                  <select
                    value={form.subjectGroup}
                    onChange={(e) => setForm((p) => ({ ...p, subjectGroup: e.target.value }))}
                    className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white"
                  >
                    <option value="">选择{config.subjectLabel}</option>
                    {config.subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              {track === 'international' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">考试类型</label>
                  <div className="h-10 flex items-center px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                    {config.label}
                  </div>
                </div>
              )}
            </div>

            <Link
              href={recommendHref}
              className="w-full h-11 text-sm font-semibold text-white rounded-xl transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--brand-accent), #d4952b)',
                boxShadow: '0 4px 20px rgba(184, 134, 11, 0.35)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {degreeLevel === 'associate' ? '匹配香港副学士课程' : '智能匹配香港院校'}
            </Link>
          </div>

          {/* ── HK School Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="[font-family:var(--font-serif)] text-xl font-bold text-slate-900">
                  香港院校库
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {visibleInsts.length} 所院校 · 覆盖港八大、自资及副学士
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAllInstitutions(!showAllInstitutions)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                    showAllInstitutions
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                      : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'
                  }`}
                >
                  {showAllInstitutions ? '仅显示有数据' : '显示全部'}
                </button>
                <Link
                  href="/hk-schools"
                  className="text-xs text-brand-accent hover:underline font-medium shrink-0"
                >
                  查看全部 →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {visibleInsts.map((inst) => {
                const hasData = inst.examRecordCount === null || inst.examRecordCount > 0;
                const catLabel =
                  inst.hkCategory === 'ugc-funded' ? '港八大' :
                  inst.hkCategory === 'self-financed' ? '自资' :
                  inst.hkCategory === 'sub-degree' ? '副学士' : '';
                const catColors: Record<string, string> = {
                  '港八大': 'bg-amber-50 text-amber-700 border-amber-200',
                  '自资': 'bg-sky-50 text-sky-700 border-sky-200',
                  '副学士': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                };
                return (
                  <Link
                    key={inst.id}
                    href={`/school/${inst.id}`}
                    className={`group relative rounded-xl border p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      hasData ? (catColors[catLabel] || 'bg-gray-50 border-gray-200') : 'bg-gray-50/60 border-gray-200 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${catColors[catLabel] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {catLabel}
                      </span>
                      {!hasData && (
                        <span className="text-[10px] text-slate-400">暂无数据</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-0.5 group-hover:text-brand-accent transition-colors">
                      {inst.name}
                    </h3>
                    {inst.examRecordCount != null && inst.examRecordCount > 0 && (
                      <p className="text-[11px] text-slate-400">{inst.examRecordCount} 条记录</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

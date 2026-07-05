'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Footer from '@/components/Footer';
import { getHkCategoryBadgeClass, HK_CATEGORIES } from '@/lib/constants';

interface HkInstitution {
  id: number;
  name: string;
  code: string | null;
  category: string;
  hkCategory: string | null;
  type: string | null;
  province: string;
  city: string | null;
  website: string | null;
  region: string | null;
  _count: { records: number; associateRecords: number };
}

export default function HkSchoolsPage() {
  const [allInstitutions, setAllInstitutions] = useState<HkInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    fetch('/data/institutions.json')
      .then((r) => r.json())
      .then((data) => setAllInstitutions(data.filter((i: HkInstitution) => i.region === 'hongkong')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const institutions = activeCategory
    ? allInstitutions.filter((i) => i.hkCategory === activeCategory)
    : allInstitutions;

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title="香港院校库" highlightChar="港" subtitle="港八大 · 自资院校 · 副学士院校" backHref="/" />
      <div className="flex-1 -mt-10 px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setActiveCategory('')} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${!activeCategory ? 'border-brand-accent text-brand-accent bg-brand-accent/5' : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'}`}>全部</button>
            {Object.entries(HK_CATEGORIES).map(([key, val]) => (
              <button key={key} onClick={() => setActiveCategory(key)} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${activeCategory === key ? 'border-brand-accent text-brand-accent bg-brand-accent/5' : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'}`}>{val.label}</button>
            ))}
          </div>
          {loading ? (
            <div className="space-y-4">{[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse"><div className="h-5 bg-slate-200 rounded w-1/3 mb-3" /></div>)}</div>
          ) : institutions.length === 0 ? (
            <div className="text-center py-20"><p className="text-slate-500">暂无香港院校数据</p></div>
          ) : (
            <div className="space-y-4">
              {institutions.map((inst) => (
                <Link key={inst.id} href={`/school/${inst.id}`} className="block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-brand-dark group-hover:text-brand-accent transition-colors">{inst.name}</h3>
                        {inst.hkCategory && <span className={getHkCategoryBadgeClass(inst.hkCategory)}>{HK_CATEGORIES[inst.hkCategory]?.label || inst.hkCategory}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                        {inst.code && <span>{inst.code}</span>}
                        {inst.type && <span>{inst.type}类</span>}
                        {inst.city && <span>{inst.city}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-sm">
                      <div className="text-center"><div className="font-semibold text-brand-dark tabular-nums">{inst._count?.records ?? 0}</div><div className="text-xs text-slate-400">本科记录</div></div>
                      {(inst._count?.associateRecords ?? 0) > 0 && <div className="text-center"><div className="font-semibold text-emerald-600 tabular-nums">{inst._count.associateRecords}</div><div className="text-xs text-slate-400">副学士课程</div></div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

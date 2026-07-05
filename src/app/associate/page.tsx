'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import SelectField from '@/components/SelectField';
import Footer from '@/components/Footer';
import { EXAM_CATEGORIES } from '@/lib/constants';

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
  gaokaoRequirement: string | null;
  interviewRequired: boolean | null;
  quota: number | null;
  institution: { id: number; name: string; category: string; hkCategory: string | null };
}

const PROGRAMME_CATEGORIES = [
  { value: '', label: '全部类别' },
  { value: '商科', label: '商科' }, { value: '理工', label: '理工' }, { value: '社科', label: '社科' },
  { value: '艺术', label: '艺术' }, { value: '医学', label: '医学' }, { value: '教育', label: '教育' },
  { value: '法律', label: '法律' }, { value: '文学', label: '文学' },
];

export default function AssociatePage() {
  const [allRecords, setAllRecords] = useState<AssociateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [examCategory, setExamCategory] = useState('dse');
  const [programmeCategory, setProgrammeCategory] = useState('');

  useEffect(() => {
    fetch('/data/associate.json')
      .then((r) => r.json())
      .then((data) => setAllRecords(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const records = allRecords.filter((r) => {
    if (r.examCategory !== examCategory) return false;
    if (programmeCategory && r.programmeCategory !== programmeCategory) return false;
    return true;
  });

  const examOptions = Object.entries(EXAM_CATEGORIES).map(([key, cfg]) => ({ value: key, label: cfg.label }));

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title="副学士查询" highlightChar="副" subtitle="香港副学士及高级文凭课程录取信息" backHref="/" />
      <div className="flex-1 -mt-10 px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="考试类型" value={examCategory} onChange={setExamCategory} options={examOptions} />
              <SelectField label="课程类别" value={programmeCategory} onChange={setProgrammeCategory} options={PROGRAMME_CATEGORIES} />
            </div>
            <p className="text-xs text-slate-400 mt-3">共 {records.length} 个副学士课程</p>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse"><div className="h-5 bg-slate-200 rounded w-2/3 mb-3" /><div className="h-4 bg-slate-100 rounded w-1/2" /></div>)}</div>
          ) : records.length === 0 ? (
            <div className="text-center py-20"><p className="text-slate-500 mb-1">暂无副学士课程数据</p><p className="text-sm text-slate-400">切换考试类型或课程类别试试</p></div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <Link key={record.id} href={`/associate/${record.id}`} className="block bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:border-brand-accent/30 group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-brand-dark group-hover:text-brand-accent transition-colors mb-1">{record.programmeName}</h3>
                      <p className="text-sm text-slate-500 mb-2">{record.institution.name}{record.programmeCode && <span className="text-slate-400 ml-2">({record.programmeCode})</span>}</p>
                      {record.admissionRequirement && <p className="text-xs text-slate-400 line-clamp-1">{record.admissionRequirement}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {record.programmeCategory && <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{record.programmeCategory}</span>}
                        {record.interviewRequired && <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">需要面试</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {record.minScore !== null && <div className="text-lg font-bold text-brand-accent tabular-nums">{record.minScore}</div>}
                      {record.medianScore !== null && <div className="text-xs text-slate-400">中位数 {record.medianScore}</div>}
                      <div className="text-xs text-slate-400 mt-1">{record.year}</div>
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

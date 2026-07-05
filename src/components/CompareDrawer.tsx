'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompareStore } from '@/lib/compare-store';

interface InstitutionData {
  id: number;
  name: string;
  category: string;
  province: string;
  city?: string | null;
  latestRecord: {
    minScore: number;
    avgScore?: number | null;
    minRank?: number | null;
    enrollmentCount?: number | null;
  } | null;
}

type CompareColumn =
  | '院校名称'
  | '类别'
  | '所在地'
  | '最低分'
  | '平均分'
  | '最低位次'
  | '招生人数';

const COLUMNS: CompareColumn[] = [
  '院校名称',
  '类别',
  '所在地',
  '最低分',
  '平均分',
  '最低位次',
  '招生人数',
];

const NUMERIC_COLUMNS: CompareColumn[] = [
  '最低分',
  '平均分',
  '最低位次',
  '招生人数',
];

type BestsMap = Record<CompareColumn, Set<number>>;

function getCellValue(data: InstitutionData, col: CompareColumn): string | number {
  switch (col) {
    case '院校名称':
      return data.name;
    case '类别':
      return data.category;
    case '所在地':
      return data.province + (data.city ? ' ' + data.city : '');
    case '最低分':
      return data.latestRecord?.minScore ?? '-';
    case '平均分':
      return data.latestRecord?.avgScore ?? '-';
    case '最低位次':
      return data.latestRecord?.minRank ?? '-';
    case '招生人数':
      return data.latestRecord?.enrollmentCount ?? '-';
  }
}

function computeBests(dataList: InstitutionData[]): BestsMap {
  const bests: BestsMap = {} as BestsMap;
  for (const col of NUMERIC_COLUMNS) {
    bests[col] = new Set<number>();
  }
  if (dataList.length === 0) return bests;

  for (const col of NUMERIC_COLUMNS) {
    const values = dataList.map((d, idx) => ({
      idx,
      val: typeof getCellValue(d, col) === 'number'
        ? (getCellValue(d, col) as number)
        : null,
    }));
    const valid = values.filter((v) => v.val !== null) as { idx: number; val: number }[];
    if (valid.length === 0) continue;

    if (col === '最低位次') {
      const min = Math.min(...valid.map((v) => v.val));
      for (const v of valid) {
        if (v.val === min) bests[col]!.add(v.idx);
      }
    } else {
      const max = Math.max(...valid.map((v) => v.val));
      for (const v of valid) {
        if (v.val === max) bests[col]!.add(v.idx);
      }
    }
  }
  return bests;
}

export default function CompareDrawer() {
  const { items, removeItem, clearAll } = useCompareStore();
  const [isOpen, setIsOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<InstitutionData[] | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-compare-drawer', handler);
    return () => window.removeEventListener('open-compare-drawer', handler);
  }, []);

  const handleCompare = useCallback(async () => {
    if (items.length === 0) return;
    setComparing(true);
    setError(null);
    setCompareData(null);
    setShowTable(false);

    try {
      const contextItem = items.find(i => i.province && i.year && i.subjectGroup && i.batch)
        || items.find(i => i.examCategory)
        || null;

      if (!contextItem) {
        throw new Error('对比院校缺少查询上下文，请从查询结果页重新添加院校到对比列表');
      }

      const body: Record<string, unknown> = { ids: items.map((i) => i.id) };
      if (contextItem.province) body.province = contextItem.province;
      if (contextItem.year) body.year = contextItem.year;
      if (contextItem.subjectGroup) body.subjectGroup = contextItem.subjectGroup;
      if (contextItem.batch) body.batch = contextItem.batch;
      if (contextItem.examCategory) body.examCategory = contextItem.examCategory;

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || '对比请求失败');
      }
      const json = await res.json();
      setCompareData(json.institutions || []);
      setShowTable(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载对比数据失败，请重试');
    } finally {
      setComparing(false);
    }
  }, [items]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        setIsOpen(false);
      }
    },
    []
  );

  const bests = useMemo(
    () => (compareData ? computeBests(compareData) : ({} as BestsMap)),
    [compareData]
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all hover:-translate-y-0.5 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-mid))',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)',
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
        </svg>
        对比
        {mounted && items.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-accent text-brand-dark text-xs font-bold">
            {items.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={handleBackdropClick}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="absolute top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in-right">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-mid))',
              }}
            >
              <h2 className="[font-family:var(--font-serif)] text-lg font-bold text-white">
                院校对比
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {showTable && compareData ? (
                <div>
                  {compareData && compareData.length > 0 && (
                    <div>
                      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-400">对比上下文：</span>
                        {items[0]?.year && <span className="font-medium text-slate-700">{items[0].year}年</span>}
                        {items[0]?.province && (
                          <span className="font-medium text-slate-700">
                            <span className="text-slate-300 mr-1">·</span>
                            {items[0].province}
                          </span>
                        )}
                        {items[0]?.subjectGroup && (
                          <span className="font-medium text-slate-700">
                            <span className="text-slate-300 mr-1">·</span>
                            {items[0].subjectGroup}
                          </span>
                        )}
                        {items[0]?.batch && (
                          <span className="font-medium text-slate-700">
                            <span className="text-slate-300 mr-1">·</span>
                            {items[0].batch}
                          </span>
                        )}
                        {items[0]?.examCategory && (
                          <span className="font-medium text-slate-700">
                            <span className="text-slate-300 mr-1">·</span>
                            {items[0].examCategory.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="mb-5">
                      <p className="text-xs font-semibold text-slate-500 mb-2">最低分对比</p>
                      <div className="h-40">
                        <div className="flex items-end gap-4 h-full pb-4">
                          {compareData.map((inst, i) => {
                            const score = inst.latestRecord?.minScore ?? 0;
                            const maxScore = Math.max(...compareData.map(d => d.latestRecord?.minScore ?? 0));
                            const heightPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            return (
                              <div key={inst.id} className="flex flex-col items-center flex-1">
                                <span className="text-xs font-bold text-slate-700 mb-1">{score}</span>
                                <div
                                  className="w-full rounded-t-md transition-all"
                                  style={{
                                    height: `${Math.max(heightPct, 8)}%`,
                                    backgroundColor: ['#b8860b', '#6b8cce', '#e07b6c', '#5ba08e', '#b08cd4', '#d4956b'][i % 6],
                                  }}
                                />
                                <span className="text-[10px] text-slate-400 mt-1 truncate w-full text-center">{inst.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    </div>
                  )}
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b-2 border-brand-dark/10">
                          {COLUMNS.map((col) => (
                            <th
                              key={col}
                              className="[font-family:var(--font-serif)] text-left py-3 px-3 font-bold text-brand-dark text-xs tracking-wide whitespace-nowrap sticky top-0 bg-white"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareData.map((inst, idx) => (
                          <tr
                            key={inst.id}
                            className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                          >
                            {COLUMNS.map((col) => {
                              const val = getCellValue(inst, col);
                              const isBest = bests[col]?.has(idx);
                              return (
                                <td key={col} className="py-3 px-3 whitespace-nowrap">
                                  {isBest ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="font-semibold text-brand-accent">{val}</span>
                                      <svg className="w-3.5 h-3.5 text-brand-accent" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">{val}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-brand-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    金色高亮表示该项在所有对比院校中表现最优
                  </div>
                </div>
              ) : comparing ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-sm text-slate-500">正在加载对比数据...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <svg className="w-10 h-10 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                  <button
                    onClick={handleCompare}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer"
                    style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
                  >
                    重试
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <p className="[font-family:var(--font-serif)] text-sm text-slate-500 leading-relaxed max-w-xs">
                    还没有添加对比院校，在查询结果中点击「加入对比」即可添加
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-500 mb-4">
                    已选择 {items.length} / 6 所院校
                  </p>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between bg-slate-50 rounded-lg px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="[font-family:var(--font-serif)] text-sm font-medium text-brand-dark truncate">
                            {item.name}
                          </p>
                          {(item.year || item.province || item.subjectGroup || item.examCategory) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {item.year && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{item.year}</span>
                              )}
                              {item.province && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{item.province}</span>
                              )}
                              {item.subjectGroup && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{item.subjectGroup}</span>
                              )}
                              {item.batch && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{item.batch}</span>
                              )}
                              {item.examCategory && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-accent/10 text-brand-accent">{item.examCategory.toUpperCase()}</span>
                              )}
                            </div>
                          )}
                          {item.minScore != null && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              最低分 {item.minScore}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {items.length > 0 && !showTable && !comparing && !error && (
              <div className="px-6 py-4 border-t border-slate-100 shrink-0 space-y-2">
                <button
                  onClick={handleCompare}
                  disabled={comparing}
                  className="w-full h-11 text-sm font-semibold text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-mid))',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)',
                  }}
                >
                  开始对比
                </button>
                <button
                  onClick={clearAll}
                  className="w-full h-9 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  清空列表
                </button>
              </div>
            )}

            {showTable && compareData && (
              <div className="px-6 py-4 border-t border-slate-100 shrink-0 space-y-2">
                <button
                  onClick={() => {
                    setShowTable(false);
                    setCompareData(null);
                    setError(null);
                  }}
                  className="w-full h-9 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  返回列表
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { getCategoryBadgeClass, type ExamCategoryConfig } from '@/lib/constants';
import EmptyState from '@/components/EmptyState';

export interface RecommendItem {
  minScore: number;
  avgScore?: number;
  minRank?: number;
  admissionType: string;
  batch: string;
  institutionId: number;
  institution: {
    id: number;
    name: string;
    category: string;
    type?: string;
    hkCategory?: string;
  };
  // 副学士扩展字段
  id?: number;
  programmeName?: string;
  programmeCode?: string;
  medianScore?: number;
  maxScore?: number;
  interviewRequired?: boolean;
  quota?: number;
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={getCategoryBadgeClass(category)}>
      {category}
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-50 rounded w-1/4" />
        </div>
        <div className="h-5 bg-slate-100 rounded w-12" />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="h-10 bg-slate-50 rounded-lg" />
        <div className="h-10 bg-slate-50 rounded-lg" />
        <div className="h-10 bg-slate-50 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonColumn() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-slate-100 rounded-lg w-24" />
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function RecommendCard({
  item,
  isInCompare,
  onToggleCompare,
  config,
  userScore,
  isAssociate,
}: {
  item: RecommendItem;
  isInCompare: boolean;
  onToggleCompare: () => void;
  config: ExamCategoryConfig;
  userScore?: number;
  isAssociate?: boolean;
}) {
  if (isAssociate) {
    return (
      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-all group">
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-brand-dark group-hover:text-brand-accent transition-colors mb-0.5">
                {item.programmeName || item.institution.name}
              </h4>
              <p className="text-xs text-slate-500">{item.institution.name}</p>
              {item.programmeCode && (
                <span className="text-[10px] text-slate-400 font-mono mr-2">{item.programmeCode}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center p-2 rounded-lg bg-emerald-50">
              <p className="text-[10px] text-emerald-600 mb-0.5">最低分</p>
              <p className="text-base font-bold text-emerald-700 tabular-nums">{item.minScore}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-50">
              <p className="text-[10px] text-slate-500 mb-0.5">中位数</p>
              <p className="text-base font-bold text-slate-700 tabular-nums">{item.medianScore ?? '-'}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-50">
              <p className="text-[10px] text-slate-500 mb-0.5">最高分</p>
              <p className="text-base font-bold text-slate-700 tabular-nums">{item.maxScore ?? '-'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {item.interviewRequired !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.interviewRequired ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                {item.interviewRequired ? '需要面试' : '无需面试'}
              </span>
            )}
            {item.quota && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                学额 {item.quota}
              </span>
            )}
            <span className="text-[10px] text-slate-400">{item.institution.hkCategory === 'sub-degree' ? '副学士院校' : item.institution.category}</span>
          </div>

          {userScore !== undefined && (
            <div className="mt-2 text-center">
              {userScore >= item.minScore ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                  高于录取线 {userScore - item.minScore} 分
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5L12 21m0 0l-7.5-10.5M12 21V3" />
                  </svg>
                  还差 {item.minScore - userScore} 分
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 pb-4">
          <Link
            href={`/associate/${item.id}`}
            className="flex-1 text-center py-2 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            查看详情
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {item.institution.name}
              </h4>
              <CategoryBadge category={item.institution.category} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{item.batch}</span>
              <span className="text-slate-200">|</span>
              <span>{item.admissionType}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-500 mb-0.5">最低分</p>
            <p className="text-base font-bold text-brand-dark">{item.minScore}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-500 mb-0.5">平均分</p>
            <p className="text-base font-bold text-brand-dark">{item.avgScore ?? '-'}</p>
          </div>
          {config.rankLabel !== null && (
          <div className="text-center p-2 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-500 mb-0.5">最低位次</p>
            <p className="text-base font-bold text-brand-dark">{item.minRank?.toLocaleString() ?? '-'}</p>
          </div>
          )}
        </div>

        {userScore !== undefined && (
          <div className="mt-2 text-center">
            {userScore >= item.minScore ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
                高于录取线 {userScore - item.minScore} 分
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5L12 21m0 0l-7.5-10.5M12 21V3" />
                </svg>
                还差 {item.minScore - userScore} 分
              </span>
            )}
          </div>
        )}

      </div>

      <div className="flex items-center gap-2 px-5 pb-4">
        <Link
          href={`/school/${item.institution.id}`}
          className="flex-1 text-center py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:border-brand-accent hover:text-brand-accent transition-colors"
        >
          详情
        </Link>
        <button
          onClick={onToggleCompare}
          className={`flex-1 text-center py-2 text-xs font-medium rounded-lg border transition-colors ${
            isInCompare
              ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
              : 'border-slate-200 text-slate-500 hover:border-brand-accent hover:text-brand-accent'
          }`}
        >
          {isInCompare ? '已加入对比' : '加入对比'}
        </button>
      </div>
    </div>
  );
}

function CategoryStats({ items }: { items: RecommendItem[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cat = item.institution.category || '其他';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  if (counts.length < 2) return null;

  return (
    <p className="text-[10px] text-slate-400 mt-0.5 ml-5">
      {counts.map(([cat, n], i) => (
        <span key={cat}>
          {i > 0 && <span className="mx-1 text-slate-300">|</span>}
          {cat}: {n}
        </span>
      ))}
    </p>
  );
}

export default function RecommendSection({
  recommendLoading,
  recommendError,
  recommendData,
  isInCompare,
  onToggleCompare,
  config,
  userScore,
  isAssociate,
}: {
  recommendLoading: boolean;
  recommendError: string;
  recommendData: { reach: RecommendItem[]; match: RecommendItem[]; safety: RecommendItem[] } | null;
  isInCompare: (id: number) => boolean;
  onToggleCompare: (item: RecommendItem) => void;
  config: ExamCategoryConfig;
  userScore?: number;
  isAssociate?: boolean;
}) {
  const { reachOffset, matchOffset } = (() => {
    if (config.scoreMax) {
      return {
        reachOffset: Math.max(1, Math.round(config.scoreMax * 0.02)),
        matchOffset: Math.max(1, Math.round(config.scoreMax * 0.06)),
      };
    }
    return { reachOffset: 1, matchOffset: 16 };
  })();

  if (recommendLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonColumn />
        <SkeletonColumn />
        <SkeletonColumn />
      </div>
    );
  }

  if (recommendError) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-10 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center text-red-300">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm text-red-500">{recommendError}</p>
      </div>
    );
  }

  if (
    recommendData &&
    recommendData.reach.length === 0 &&
    recommendData.match.length === 0 &&
    recommendData.safety.length === 0
  ) {
    return (
      <EmptyState
        title="暂无推荐结果"
        description="请尝试调整查询条件"
        variant="recommend"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <h3 className="[font-family:var(--font-serif)] text-lg font-bold text-slate-800">冲刺</h3>
          <span className="text-xs text-slate-500 ml-1">(+{reachOffset}分内)</span>
          {recommendData && (
            <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full ml-auto">
              {recommendData.reach.length} 所
            </span>
          )}
        </div>
        {recommendData && <CategoryStats items={recommendData.reach} />}
        <div className="space-y-3">
          {recommendData?.reach.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 bg-slate-50/50 rounded-xl">暂无冲刺院校</p>
          ) : (
            recommendData?.reach.map((item, idx) => (
              <RecommendCard
                key={`reach-${idx}`}
                item={item}
                isInCompare={isInCompare(item.institution.id)}
                onToggleCompare={() => onToggleCompare(item)}
                config={config}
                userScore={userScore}
                isAssociate={isAssociate}
              />
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <h3 className="[font-family:var(--font-serif)] text-lg font-bold text-slate-800">稳妥</h3>
          <span className="text-xs text-slate-500 ml-1">(0~{matchOffset}分内)</span>
          {recommendData && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full ml-auto">
              {recommendData.match.length} 所
            </span>
          )}
        </div>
        {recommendData && <CategoryStats items={recommendData.match} />}
        <div className="space-y-3">
          {recommendData?.match.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 bg-slate-50/50 rounded-xl">暂无稳妥院校</p>
          ) : (
            recommendData?.match.map((item, idx) => (
              <RecommendCard
                key={`match-${idx}`}
                item={item}
                isInCompare={isInCompare(item.institution.id)}
                onToggleCompare={() => onToggleCompare(item)}
                config={config}
                userScore={userScore}
                isAssociate={isAssociate}
              />
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <h3 className="[font-family:var(--font-serif)] text-lg font-bold text-slate-800">保底</h3>
          <span className="text-xs text-slate-500 ml-1">(低于{matchOffset}分)</span>
          {recommendData && (
            <span className="text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full ml-auto">
              {recommendData.safety.length} 所
            </span>
          )}
        </div>
        {recommendData && <CategoryStats items={recommendData.safety} />}
        <div className="space-y-3">
          {recommendData?.safety.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 bg-slate-50/50 rounded-xl">暂无保底院校</p>
          ) : (
            recommendData?.safety.map((item, idx) => (
              <RecommendCard
                key={`safety-${idx}`}
                item={item}
                isInCompare={isInCompare(item.institution.id)}
                onToggleCompare={() => onToggleCompare(item)}
                config={config}
                userScore={userScore}
                isAssociate={isAssociate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

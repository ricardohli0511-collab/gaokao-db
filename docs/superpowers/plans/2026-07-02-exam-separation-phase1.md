# Phase 1：国内/国际考试分离实施方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将国内高考与国际考试（IB/A-Level/DSE）在首页、查询、推荐引擎中彻底分离，使用独立的表单、独立的阈值逻辑。

**Architecture:** 不改动数据库 schema，通过 `EXAM_CATEGORIES` 常量定义和 `exam` 路由参数在应用层实现软隔离。推荐引擎从固定阈值改为按满分百分比动态计算。

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Prisma, Zustand

---

## 文件结构总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/constants.tsx` | 修改 | 新增 `EXAM_CATEGORIES` 定义、分数映射工具函数 |
| `src/app/page.tsx` | 修改 | 首页改为考试轨道选择 + 条件表单 |
| `src/app/query/page.tsx` | 修改 | 支持 `exam` 参数，按分类切换 UI |
| `src/app/api/recommend/route.ts` | 修改 | 动态阈值计算 |
| `src/app/api/records/route.ts` | 修改 | `examCategory` 过滤支持 |
| `src/app/school/[id]/page.tsx` | 修改 | 国际考试隐藏不适用字段 |
| `src/components/PageHeader.tsx` | 修改 | 头图支持轨道标题 |

---

### Task 1: 考试分类常量定义

**Files:**
- Modify: `src/lib/constants.tsx`

- [ ] **Step 1: 在 constants.tsx 末尾添加 EXAM_CATEGORIES 和工具函数**

在 `src/lib/constants.tsx` 文件末尾追加以下代码：

```typescript
export interface ExamCategoryConfig {
  key: string;
  label: string;
  types: string[];
  scoreMax: number | null;
  scoreMin?: number;
  fields: string[];
  rankLabel: string | null;
  batchLabel: string | null;
  subjectLabel: string;
  subjects?: string[];
  gradeOptions?: string[];
  gradeMap?: Record<string, number>;
  resolveScore?: (input: string | number) => number | null;
}

export const EXAM_CATEGORIES: Record<string, ExamCategoryConfig> = {
  gaokao: {
    key: 'gaokao',
    label: '国内高考',
    types: ['统招', '艺考', '体育', '强基', '综评', '保送'],
    scoreMax: 750,
    fields: ['province', 'subjectGroup', 'batch', 'score', 'rank'],
    rankLabel: '最低位次',
    batchLabel: '批次',
    subjectLabel: '选科组合',
  },
  ib: {
    key: 'ib',
    label: 'IB 国际文凭',
    types: ['IB'],
    scoreMax: 45,
    scoreMin: 24,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: '科目方向',
    subjects: [
      'HL 数学 AA', 'HL 数学 AI', 'HL 物理', 'HL 化学',
      'HL 生物', 'HL 经济', 'SL 数学 AA', 'SL 物理',
    ],
  },
  alevel: {
    key: 'alevel',
    label: 'A-Level',
    types: ['A-Level'],
    scoreMax: null,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: '科目',
    gradeOptions: ['A*', 'A', 'B', 'C', 'D', 'E'],
    gradeMap: { 'A*': 56, 'A': 48, 'B': 40, 'C': 32, 'D': 24, 'E': 16 },
    resolveScore: (input) => {
      if (typeof input === 'number') return input;
      const parts = input.toUpperCase().replace(/\s/g, '').split('');
      let total = 0;
      let count = 0;
      for (const part of parts) {
        if (part === '*' && count > 0) {
          total += 8;
          continue;
        }
        const gradeMap: Record<string, number> = { 'A': 48, 'B': 40, 'C': 32, 'D': 24, 'E': 16 };
        if (gradeMap[part]) {
          total += gradeMap[part];
          count++;
        }
      }
      return count > 0 ? Math.round(total / count) : null;
    },
  },
  dse: {
    key: 'dse',
    label: 'DSE 香港中学文凭',
    types: ['DSE'],
    scoreMax: 35,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: '科目',
    subjects: [
      '中文', '英文', '数学', '通识/公民',
      '物理', '化学', '生物', '经济', '历史', '地理', 'ICT',
    ],
  },
};

export function getExamCategoryByType(admissionType: string): string | null {
  for (const [key, config] of Object.entries(EXAM_CATEGORIES)) {
    if (config.types.includes(admissionType)) return key;
  }
  return null;
}

export function getRecommendThresholds(examCategory: string): {
  reachOffset: number;
  matchOffset: number;
} {
  const config = EXAM_CATEGORIES[examCategory];
  if (!config || config.scoreMax === null) {
    return { reachOffset: 1, matchOffset: 16 };
  }
  return {
    reachOffset: Math.max(1, Math.round(config.scoreMax * 0.02)),
    matchOffset: Math.max(1, Math.round(config.scoreMax * 0.06)),
  };
}

export function formatScoreForDisplay(
  score: number,
  examCategory: string
): string {
  const config = EXAM_CATEGORIES[examCategory];
  if (!config) return String(score);
  if (config.gradeMap) {
    for (const [grade, value] of Object.entries(config.gradeMap)) {
      if (score === value) return grade;
    }
  }
  return String(score);
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd /Users/haoyuli/Desktop/gaokao && npx tsc --noEmit src/lib/constants.tsx 2>&1 | head -20
```

Expected: 无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.tsx
git commit -m "feat: add EXAM_CATEGORIES definitions and utility functions for exam separation"
```

---

### Task 2: 推荐引擎动态阈值

**Files:**
- Modify: `src/app/api/recommend/route.ts`

- [ ] **Step 1: 改造 recommend API 支持动态阈值**

读取 `src/app/api/recommend/route.ts`，将固定阈值替换为动态计算：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRecommendThresholds } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const province = searchParams.get('province') || '';
  const year = searchParams.get('year');
  const subjectGroup = searchParams.get('subjectGroup') || '';
  const score = searchParams.get('score');
  const examCategory = searchParams.get('examCategory') || 'gaokao';
  const admissionType = searchParams.get('admissionType');

  if (!year || !score) return errorResponse('缺少年份或分数参数');

  const yearNum = parseInt(year, 10);
  const scoreNum = parseInt(score, 10);
  if (isNaN(yearNum) || isNaN(scoreNum)) return errorResponse('年份或分数格式错误');

  const { reachOffset, matchOffset } = getRecommendThresholds(examCategory);

  const where: Record<string, unknown> = { year: yearNum };
  if (province) where.province = province;
  if (subjectGroup) where.subjectGroup = subjectGroup;
  if (admissionType) {
    where.admissionType = admissionType;
  }

  const allRecords = await prisma.admissionRecord.findMany({
    where,
    include: {
      institution: {
        select: { id: true, name: true, category: true, type: true },
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
  minScore: number;
  avgScore: number | null;
  minRank: number | null;
  admissionType: string;
  batch: string;
  institution: { id: number; name: string; category: string; type: string | null };
}) {
  return {
    minScore: r.minScore,
    avgScore: r.avgScore,
    minRank: r.minRank,
    admissionType: r.admissionType,
    batch: r.batch,
    institutionId: r.institution.id,
    institution: r.institution,
  };
}

function errorResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
```

- [ ] **Step 2: 验证 API 路由编译**

```bash
cd /Users/haoyuli/Desktop/gaokao && npx tsc --noEmit src/app/api/recommend/route.ts 2>&1 | head -20
```

Expected: 无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/app/api/recommend/route.ts
git commit -m "feat: dynamic recommend thresholds based on exam category"
```

---

### Task 3: Records API 增加考试分类过滤

**Files:**
- Modify: `src/app/api/records/route.ts`

- [ ] **Step 1: 增加 examCategory 参数支持**

在现有的 `admissionType` 过滤基础上，增加单值 `examCategory` 参数，当传入时自动展开为对应的多个 `admissionType` 值：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EXAM_CATEGORIES } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const examCategory = searchParams.get('examCategory');
  const admissionType = searchParams.get('admissionType');
  const province = searchParams.get('province');
  const year = searchParams.get('year');
  const subjectGroup = searchParams.get('subjectGroup');
  const score = searchParams.get('score');
  const batch = searchParams.get('batch');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const where: Record<string, unknown> = {};

  if (examCategory && EXAM_CATEGORIES[examCategory]) {
    where.admissionType = { in: EXAM_CATEGORIES[examCategory].types };
  } else if (admissionType) {
    where.admissionType = admissionType;
  }

  if (province) where.province = province;
  if (year) where.year = parseInt(year, 10);
  if (subjectGroup) where.subjectGroup = subjectGroup;
  if (batch) where.batch = batch;

  const [data, total] = await Promise.all([
    prisma.admissionRecord.findMany({
      where,
      include: { institution: { select: { id: true, name: true, category: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { minScore: 'desc' },
    }),
    prisma.admissionRecord.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, pageSize });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/records/route.ts
git commit -m "feat: add examCategory parameter to records API"
```

---

### Task 4: 首页考试轨道选择

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 重写首页为考试轨道选择 + 条件表单**

将 `src/app/page.tsx` 中的 `HomePage` 组件替换为以下实现。保留 `PageHeader`、`Footer` 引用，新增 `EXAM_CATEGORIES` 和 `SelectField` 引用：

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import SelectField from '@/components/SelectField';
import Footer from '@/components/Footer';
import { EXAM_CATEGORIES, type ExamCategoryConfig } from '@/lib/constants';

const GAOKAO = EXAM_CATEGORIES.gaokao;
const INTERNATIONAL_OPTIONS = [
  { key: 'ib', config: EXAM_CATEGORIES.ib },
  { key: 'alevel', config: EXAM_CATEGORIES.alevel },
  { key: 'dse', config: EXAM_CATEGORIES.dse },
];

export default function HomePage() {
  const router = useRouter();

  const [track, setTrack] = useState<'gaokao' | 'international' | null>(null);
  const [intlType, setIntlType] = useState<string>('ib');

  const [provinces, setProvinces] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    province: '',
    year: '',
    score: '',
    subjectGroup: '',
    batch: '',
  });

  useEffect(() => {
    async function fetchFilters() {
      try {
        const [provincesRes, yearsRes] = await Promise.all([
          fetch('/api/provinces'),
          fetch('/api/years'),
        ]);
        const [provincesData, yearsData] = await Promise.all([
          provincesRes.json(),
          yearsRes.json(),
        ]);
        setProvinces(provincesData);
        setYears(yearsData);
      } catch {
        // silently ignore filter load error
      } finally {
        setLoading(false);
      }
    }
    fetchFilters();
  }, []);

  const intlConfig: ExamCategoryConfig = EXAM_CATEGORIES[intlType] || EXAM_CATEGORIES.ib;

  function handleSearch() {
    if (track === 'gaokao') {
      const params = new URLSearchParams();
      params.set('exam', 'gaokao');
      if (form.province) params.set('province', form.province);
      if (form.year) params.set('year', form.year);
      if (form.score) params.set('score', form.score);
      if (form.subjectGroup) params.set('subjectGroup', form.subjectGroup);
      if (form.batch) params.set('batch', form.batch);
      router.push(`/query?${params.toString()}`);
    } else {
      const params = new URLSearchParams();
      params.set('exam', intlType);
      params.set('examCategory', intlType);
      if (form.year) params.set('year', form.year);
      if (form.score) params.set('score', form.score);
      router.push(`/query?${params.toString()}`);
    }
  }

  function handleRecommend() {
    if (track === 'gaokao') {
      const params = new URLSearchParams();
      params.set('exam', 'gaokao');
      params.set('examCategory', 'gaokao');
      if (form.province) params.set('province', form.province);
      if (form.year) params.set('year', form.year);
      if (form.score) params.set('score', form.score);
      if (form.subjectGroup) params.set('subjectGroup', form.subjectGroup);
      if (form.batch) params.set('batch', form.batch);
      params.set('mode', 'recommend');
      router.push(`/query?${params.toString()}`);
    } else {
      const params = new URLSearchParams();
      params.set('exam', intlType);
      params.set('examCategory', intlType);
      if (form.year) params.set('year', form.year);
      if (form.score) params.set('score', form.score);
      params.set('mode', 'recommend');
      router.push(`/query?${params.toString()}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title="升学数据库"
        highlightChar="升"
        subtitle="历年全国高校录取分数线查询平台"
      />

      <div className="flex-1 -mt-10 px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 p-8 sm:p-10">
            {!track ? (
              <>
                <h2 className="[font-family:var(--font-serif)] text-2xl font-bold text-brand-dark mb-2 text-center">
                  选择考试类型
                </h2>
                <p className="text-sm text-slate-500 text-center mb-8">
                  请选择你要查询的考试类型，我们将为你展示对应的查询条件
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setTrack('gaokao')}
                    className="group relative bg-white rounded-2xl border-2 border-slate-200 p-6 text-left transition-all hover:border-brand-accent hover:shadow-lg"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-4 group-hover:bg-brand-accent/20 transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                      </svg>
                    </div>
                    <h3 className="[font-family:var(--font-serif)] text-lg font-bold text-brand-dark mb-1">
                      国内高考
                    </h3>
                    <p className="text-sm text-slate-500">
                      统招 · 艺考 · 体育 · 强基 · 综评 · 保送
                    </p>
                    <p className="text-xs text-slate-400 mt-2">满分 750 分 · 按省份/位次/批次查询</p>
                  </button>

                  <button
                    onClick={() => setTrack('international')}
                    className="group relative bg-white rounded-2xl border-2 border-slate-200 p-6 text-left transition-all hover:border-brand-accent hover:shadow-lg"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-4 group-hover:bg-brand-accent/20 transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <h3 className="[font-family:var(--font-serif)] text-lg font-bold text-brand-dark mb-1">
                      国际升学
                    </h3>
                    <p className="text-sm text-slate-500">
                      IB · A-Level · DSE
                    </p>
                    <p className="text-xs text-slate-400 mt-2">各自独立评分体系 · 按科目/等级查询</p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="[font-family:var(--font-serif)] text-2xl font-bold text-brand-dark">
                    {track === 'gaokao' ? GAOKAO.label : intlConfig.label}录取查询
                  </h2>
                  <button
                    onClick={() => setTrack(null)}
                    className="text-sm text-slate-500 hover:text-brand-accent transition-colors"
                  >
                    返回选择
                  </button>
                </div>

                {track === 'international' && (
                  <div className="flex gap-2 mb-6">
                    {INTERNATIONAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setIntlType(opt.key);
                          setForm({ province: '', year: '', score: '', subjectGroup: '', batch: '' });
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          intlType === opt.key
                            ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                            : 'border-slate-200 text-slate-500 hover:border-brand-accent/30'
                        }`}
                      >
                        {opt.config.label}
                      </button>
                    ))}
                  </div>
                )}

                {track === 'gaokao' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <SelectField
                      label="省份"
                      value={form.province}
                      onChange={(v) => setForm((prev) => ({ ...prev, province: v }))}
                      options={[{ value: '', label: '请选择省份' }, ...provinces.map((p) => ({ value: p, label: p }))]}
                      loading={loading}
                    />
                    <SelectField
                      label="年份"
                      value={form.year}
                      onChange={(v) => setForm((prev) => ({ ...prev, year: v }))}
                      options={[{ value: '', label: '请选择年份' }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
                      loading={loading}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">分数</label>
                      <input
                        type="number"
                        value={form.score}
                        onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
                        placeholder={`输入高考分数（满分 ${GAOKAO.scoreMax}）`}
                        className="w-full h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white placeholder:text-slate-400"
                      />
                    </div>
                    <SelectField
                      label={GAOKAO.subjectLabel}
                      value={form.subjectGroup}
                      onChange={(v) => setForm((prev) => ({ ...prev, subjectGroup: v }))}
                      options={[
                        { value: '', label: '请选择选科' },
                        { value: '物理类', label: '物理类' },
                        { value: '历史类', label: '历史类' },
                        { value: '综合', label: '综合（不分文理）' },
                      ]}
                    />
                    <SelectField
                      label="招生批次"
                      value={form.batch}
                      onChange={(v) => setForm((prev) => ({ ...prev, batch: v }))}
                      options={[
                        { value: '', label: '请选择批次' },
                        { value: '本科批', label: '本科批' },
                        { value: '提前批', label: '提前批' },
                        { value: '本科一批', label: '本科一批' },
                        { value: '本科二批', label: '本科二批' },
                        { value: '专科批', label: '专科批' },
                      ]}
                    />
                  </div>
                )}

                {track === 'international' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SelectField
                      label="年份"
                      value={form.year}
                      onChange={(v) => setForm((prev) => ({ ...prev, year: v }))}
                      options={[{ value: '', label: '请选择年份' }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
                      loading={loading}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        {intlConfig.key === 'alevel' ? '成绩等级' : `总分（满分 ${intlConfig.scoreMax}）`}
                      </label>
                      <input
                        type={intlConfig.key === 'alevel' ? 'text' : 'number'}
                        value={form.score}
                        onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
                        placeholder={
                          intlConfig.key === 'alevel'
                            ? '例如: A*AA'
                            : `${intlConfig.label} 总分`
                        }
                        className="w-full h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:bg-white placeholder:text-slate-400"
                      />
                      {intlConfig.scoreMin && (
                        <p className="text-xs text-slate-400 mt-1">分数范围：{intlConfig.scoreMin} - {intlConfig.scoreMax}</p>
                      )}
                    </div>
                    {intlConfig.subjects && (
                      <SelectField
                        label={intlConfig.subjectLabel}
                        value={form.subjectGroup}
                        onChange={(v) => setForm((prev) => ({ ...prev, subjectGroup: v }))}
                        options={[
                          { value: '', label: `请选择${intlConfig.subjectLabel}` },
                          ...intlConfig.subjects.map((s) => ({ value: s, label: s })),
                        ]}
                      />
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <button
                    onClick={handleSearch}
                    className="flex-1 h-12 text-sm font-semibold text-white rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, var(--brand-dark), var(--brand-mid))',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)',
                    }}
                  >
                    查询
                  </button>
                  <button
                    onClick={handleRecommend}
                    className="flex-1 h-12 text-sm font-semibold rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5"
                    style={{
                      color: 'var(--brand-accent)',
                      borderColor: 'var(--brand-accent)',
                      backgroundColor: 'var(--brand-accent-light)',
                    }}
                  >
                    智能推荐
                  </button>
                </div>
              </>
            )}

            {!track && (
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <a
                  href="/admin/import"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all hover:-translate-y-0.5 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, var(--brand-mid), var(--brand-dark))' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  上传录取数据
                </a>
                <p className="text-xs text-slate-500 mt-2">有新的录取数据？上传 CSV/Excel 文件即可导入（需要管理员登录）</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: 验证首页无新 import 缺失**

检查 `page.tsx` 中不再引用已移除的 `ADMISSION_TYPES`、`SUBJECT_GROUPS`、`BATCHES`（如之前使用了这些常量，确认移除干净）。

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: dual-track homepage with separate gaokao and international exam forms"
```

---

### Task 5: 查询页支持考试分类参数

**Files:**
- Modify: `src/app/query/page.tsx`

- [ ] **Step 1: 读取 exam 和 examCategory 参数**

在 `QueryPageContent` 函数中，于现有的 `searchParams` 读取附近新增：

```typescript
const exam = searchParams.get('exam') || 'gaokao';
const examCategory = searchParams.get('examCategory') || 'gaokao';
const config = EXAM_CATEGORIES[examCategory] || EXAM_CATEGORIES.gaokao;

// 国内高考时使用 admissionType，国际考试使用 examCategory
const effectiveAdmissionTypes = examCategory !== 'gaokao'
  ? config.types
  : [admissionType];
```

修改 `buildSearchParams`，始终携带 `exam` 和 `examCategory`：

```typescript
function buildSearchParams(
  overrides?: Partial<typeof form>,
  extra?: Record<string, string>
) {
  const params = new URLSearchParams();
  const data = { ...form, ...overrides };
  params.set('exam', exam);
  params.set('examCategory', examCategory);
  if (data.province) params.set('province', data.province);
  if (data.year) params.set('year', data.year);
  if (data.score) params.set('score', data.score);
  if (data.subjectGroup) params.set('subjectGroup', data.subjectGroup);
  if (data.batch) params.set('batch', data.batch);
  if (data.admissionType) params.set('admissionType', data.admissionType);
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  }
  return params.toString();
}
```

- [ ] **Step 2: 查询请求携带 examCategory**

在普通查询和推荐查询的 `useEffect` 中，将 `examCategory` 加入 API 请求参数：

```typescript
// 普通查询
if (examCategory) params.set('examCategory', examCategory);

// 推荐查询
if (examCategory) params.set('examCategory', examCategory);
```

- [ ] **Step 3: 国际考试结果隐藏不适用列**

在 `ResultCard` 组件中，根据 `examCategory` 条件渲染 `minRank` 列：

```typescript
{config.rankLabel !== null && (
  <div className="text-center p-2.5 rounded-lg bg-slate-50">
    <p className="text-xs text-slate-500 mb-0.5">{config.rankLabel}</p>
    <p className="text-lg font-bold text-brand-dark">{record.minRank?.toLocaleString() ?? '-'}</p>
  </div>
)}
```

在 RecommendCard 中同样处理。

- [ ] **Step 4: 导入 EXAM_CATEGORIES**

在文件顶部的 import 中添加：

```typescript
import { ADMISSION_TYPES, SUBJECT_GROUPS, BATCHES, getCategoryBadgeClass, EXAM_CATEGORIES } from '@/lib/constants';
```

- [ ] **Step 5: 确认 SELECT 组件引用**

确认 query 页不再手动内联定义 SelectField（已在之前的优化中提取为共享组件）。如有残留，替换为 `<SelectField>` 组件引用。

- [ ] **Step 6: Commit**

```bash
git add src/app/query/page.tsx
git commit -m "feat: query page supports exam parameter and hides irrelevant columns for international exams"
```

---

### Task 6: 院校详情页国际考试字段隐藏

**Files:**
- Modify: `src/app/school/[id]/page.tsx`

- [ ] **Step 1: 根据 admissionType 判断是否显示位次和批次列**

在 `filteredRecords` 的表格渲染中，增加条件逻辑：

```typescript
const recordAdmissionType = filteredRecords.length > 0 ? filteredRecords[0].admissionType : '统招';
const isInternational = ['IB', 'A-Level', 'DSE'].includes(recordAdmissionType);
```

在 `<thead>` 中，条件渲染列头：

```tsx
{!isInternational && (
  <th className="text-right py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">最低位次</th>
)}
```

在 `<tbody>` 中，条件渲染数据单元格：

```tsx
{!isInternational && (
  <td className="py-3 px-3 text-right text-slate-500 tabular-nums whitespace-nowrap">
    {record.minRank != null ? record.minRank.toLocaleString() : '-'}
  </td>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/school/[id]/page.tsx
git commit -m "feat: hide rank and batch columns for international exam records in school detail"
```

---

### Task 7: 构建验证与回归

**Files:**
- 无新建文件，验证所有已有改动。

- [ ] **Step 1: 运行 TypeScript 类型检查 + 构建**

```bash
cd /Users/haoyuli/Desktop/gaokao && npm run build 2>&1 | tail -20
```

Expected: 所有路由编译通过，无类型错误。

- [ ] **Step 2: 运行 Lint 检查**

```bash
cd /Users/haoyuli/Desktop/gaokao && npm run lint 2>&1
```

Expected: 无新增 lint 错误（仅可能有之前已存在的 `admin/import/page.tsx` 已修复后的 0 error 状态）。

- [ ] **Step 3: 启动开发服务器并手动验证**

```bash
cd /Users/haoyuli/Desktop/gaokao && npm run dev
```

浏览器验证：
1. 首页 → 显示两个考试轨道卡片
2. 点击「国内高考」→ 显示省份/年份/分数/选科/批次表单
3. 点击「国际升学」→ 显示 IB/A-Level/DSE 切换按钮
4. 选择 IB → 显示年份/IB总分输入框
5. 选择 A-Level → 显示年份/成绩等级输入框
6. 填入参数后点击「查询」→ 跳转到 `/query?exam=ib&...`
7. 填入参数后点击「智能推荐」→ 跳转到 `/query?...&mode=recommend`
8. 查询结果页中国际考试不显示位次列
9. 管理员后台导入页正常加载
10. 院校详情页正常显示，国际考试记录隐藏位次列

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: build verification after exam separation phase 1"
```

---

## 验证清单

| # | 验证项 | 预期结果 |
|---|--------|---------|
| 1 | 首页考试轨道选择 | 两个卡片：国内高考 + 国际升学 |
| 2 | 国内高考表单 | 省份/年份/分数/选科/批次 |
| 3 | 国际升学 IB 表单 | 年份/IB 总分（24-45） |
| 4 | 国际升学 A-Level 表单 | 年份/成绩等级输入 |
| 5 | 国际升学 DSE 表单 | 年份/Best5 总分（0-35） |
| 6 | 查询跳转 | URL 携带 `exam=gaokao|ib|alevel|dse` |
| 7 | 推荐跳转 | URL 携带 `mode=recommend` + `examCategory` |
| 8 | 国内高考推荐阈值 | +15/-30（满分 750 × 2%/6%） |
| 9 | IB 推荐阈值 | +1/-3（满分 45 × 2%/6%） |
| 10 | 国际考试结果隐藏位次 | 结果卡不显示「最低位次」 |
| 11 | 详情页国际考试 | 表格不显示「最低位次」列 |
| 12 | 构建通过 | `npm run build` 0 error |
| 13 | Lint 通过 | `npm run lint` 0新增 error |

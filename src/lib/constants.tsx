export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '985': { bg: 'bg-red-50', text: 'text-red-700' },
  '211': { bg: 'bg-blue-50', text: 'text-blue-700' },
  '双一流': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'C9': { bg: 'bg-amber-50', text: 'text-amber-700' },
  '省重点': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  '普通': { bg: 'bg-gray-100', text: 'text-gray-600' },
  '港八大': { bg: 'bg-amber-50', text: 'text-amber-700' },
  '自资院校': { bg: 'bg-sky-50', text: 'text-sky-700' },
  '副学士院校': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export const DEFAULT_CATEGORY_COLOR = 'bg-gray-100 text-gray-600';

export const TYPE_STYLES: Record<string, string> = {
  '综合': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '理工': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  '师范': 'bg-pink-50 text-pink-700 border-pink-200',
  '医药': 'bg-rose-50 text-rose-700 border-rose-200',
  '农林': 'bg-green-50 text-green-700 border-green-200',
  '政法': 'bg-slate-50 text-slate-700 border-slate-200',
  '财经': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  '语言': 'bg-violet-50 text-violet-700 border-violet-200',
  '体育': 'bg-orange-50 text-orange-700 border-orange-200',
  '艺术': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  '民族': 'bg-teal-50 text-teal-700 border-teal-200',
  '军事': 'bg-stone-50 text-stone-700 border-stone-200',
};

export const DEFAULT_TYPE_STYLE = 'bg-gray-50 text-gray-600 border-gray-200';

export const CHART_COLORS = [
  '#b8860b',
  '#6b8cce',
  '#e07b6c',
  '#5ba08e',
  '#b08cd4',
  '#d4956b',
  '#7eb8c2',
  '#c48bb5',
];

export const ADMISSION_TYPES = [
  { value: '统招', label: '统招' },
  { value: '艺考', label: '艺考' },
  { value: '体育', label: '体育' },
  { value: '强基', label: '强基' },
  { value: '综评', label: '综评' },
  { value: '保送', label: '保送' },
  { value: '考研', label: '考研' },
  { value: 'IB', label: 'IB（国际文凭）' },
  { value: 'A-Level', label: 'A-Level' },
  { value: 'DSE', label: 'DSE（香港中学文凭）' },
];

export const SUBJECT_GROUPS = [
  { value: '', label: '请选择选科' },
  { value: '物理类', label: '物理类' },
  { value: '历史类', label: '历史类' },
  { value: '综合', label: '综合（不分文理）' },
  { value: '物理+化学', label: '物理+化学' },
  { value: '历史+政治', label: '历史+政治' },
];

export const BATCHES = [
  { value: '', label: '请选择批次' },
  { value: '本科批', label: '本科批' },
  { value: '提前批', label: '提前批' },
  { value: '专科批', label: '专科批' },
  { value: '本科一批', label: '本科一批' },
  { value: '本科二批', label: '本科二批' },
];

export const GRANULARITY_OPTIONS = [
  { value: '', label: '全部粒度' },
  { value: 'institution', label: '院校线' },
  { value: 'group', label: '专业组线' },
  { value: 'major', label: '专业线' },
];

export function getGranularityLabel(granularity?: string | null): string {
  switch (granularity) {
    case 'institution':
      return '院校线';
    case 'group':
      return '专业组线';
    case 'major':
      return '专业线';
    default:
      return '未知粒度';
  }
}

export function getCategoryBadgeClass(category: string): string {
  const colors = CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`;
}

export function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    '985': 'bg-red-50 text-red-700 border-red-200',
    '211': 'bg-blue-50 text-blue-700 border-blue-200',
    '双一流': 'bg-purple-50 text-purple-700 border-purple-200',
    'C9': 'bg-amber-50 text-amber-700 border-amber-200',
    '省重点': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return styles[category] || 'bg-gray-50 text-gray-600 border-gray-200';
}

export function getTypeStyle(type: string): string {
  return TYPE_STYLES[type] || DEFAULT_TYPE_STYLE;
}

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
  sat: {
    key: 'sat',
    label: 'SAT',
    types: ['SAT'],
    scoreMax: 1600,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: '考试模块',
    subjects: ['ERW', 'Math'],
  },
  act: {
    key: 'act',
    label: 'ACT',
    types: ['ACT'],
    scoreMax: 36,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: '考试模块',
    subjects: ['English', 'Math', 'Reading', 'Science'],
  },
  ap: {
    key: 'ap',
    label: 'AP',
    types: ['AP'],
    scoreMax: 5,
    scoreMin: 1,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: 'AP 科目',
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
  },
  dse: {
    key: 'dse',
    label: 'DSE 香港中学文凭',
    types: ['联招'],
    scoreMax: 49,
    fields: ['score'],
    rankLabel: null,
    batchLabel: null,
    subjectLabel: '计分方式',
    subjects: [
      'Best 5 Subjects', 'Best 6 Subjects',
      '4C+2X', '4C+1X', 'Best 5 (weighted)',
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

export const HK_CATEGORIES: Record<string, { label: string; description: string }> = {
  'ugc-funded': { label: '教资会资助', description: '港八大公立大学' },
  'self-financed': { label: '自资院校', description: '自资学士学位课程院校' },
  'sub-degree': { label: '副学士院校', description: '提供副学士/高级文凭课程' },
};

export const HK_INSTITUTIONS = [
  { name: '香港大学', code: 'HKU', category: 'ugc-funded' },
  { name: '香港中文大学', code: 'CUHK', category: 'ugc-funded' },
  { name: '香港科技大学', code: 'HKUST', category: 'ugc-funded' },
  { name: '香港城市大学', code: 'CityU', category: 'ugc-funded' },
  { name: '香港理工大学', code: 'PolyU', category: 'ugc-funded' },
  { name: '香港浸会大学', code: 'HKBU', category: 'ugc-funded' },
  { name: '岭南大学', code: 'Lingnan', category: 'ugc-funded' },
  { name: '香港教育大学', code: 'EdUHK', category: 'ugc-funded' },
  { name: '香港都会大学', code: 'HKMU', category: 'self-financed' },
  { name: '香港树仁大学', code: 'HKSYU', category: 'self-financed' },
  { name: '香港恒生大学', code: 'HSUHK', category: 'self-financed' },
  { name: '香港珠海学院', code: 'HKCHC', category: 'self-financed' },
  { name: '东华学院', code: 'TWC', category: 'self-financed' },
  { name: '明爱专上学院', code: 'CIHE', category: 'self-financed' },
  { name: 'HKU SPACE', code: 'HKUSPACE', category: 'sub-degree' },
  { name: 'HKCC (香港理工大学专上学院)', code: 'HKCC', category: 'sub-degree' },
  { name: 'HKBU CIE (香港浸会大学国际学院)', code: 'HKBUCIE', category: 'sub-degree' },
  { name: '香港城市大学专上学院', code: 'CCCU', category: 'sub-degree' },
  { name: '香港中文大学专业进修学院', code: 'CUHKSCS', category: 'sub-degree' },
  { name: '岭南大学持续进修学院', code: 'LingnanLIFE', category: 'sub-degree' },
  { name: '香港科技专上书院', code: 'HKCT', category: 'sub-degree' },
];

export const DEGREE_LEVELS = [
  { value: 'undergraduate', label: '本科' },
  { value: 'associate', label: '副学士' },
  { value: 'higher-diploma', label: '高级文凭' },
];

export const REGION_OPTIONS = [
  { value: '', label: '全部地区' },
  { value: 'hongkong', label: '香港' },
  { value: 'mainland', label: '内地' },
  { value: 'macau', label: '澳门' },
];

export const CATEGORY_OPTIONS = [
  { value: '', label: '全部类别' },
  { value: '985', label: '985' },
  { value: '211', label: '211' },
  { value: '双一流', label: '双一流' },
  { value: 'C9', label: 'C9' },
  { value: '港八大', label: '港八大' },
  { value: '省重点', label: '省重点' },
  { value: '普通本科', label: '普通本科' },
];

export const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: '综合', label: '综合' },
  { value: '理工', label: '理工' },
  { value: '师范', label: '师范' },
  { value: '农林', label: '农林' },
  { value: '医药', label: '医药' },
  { value: '语言', label: '语言' },
  { value: '政法', label: '政法' },
  { value: '财经', label: '财经' },
  { value: '艺术', label: '艺术' },
];

export const HK_CATEGORY_OPTIONS = [
  { value: '', label: '全部分类' },
  { value: 'ugc-funded', label: '教资会资助' },
  { value: 'self-financed', label: '自资院校' },
  { value: 'sub-degree', label: '副学士院校' },
];

export const HK_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'ugc-funded': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'self-financed': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'sub-degree': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export function getHkCategoryStyle(hkCategory: string | null): string {
  if (!hkCategory) return 'bg-gray-50 text-gray-600 border-gray-200';
  const colors = HK_CATEGORY_COLORS[hkCategory];
  if (!colors) return 'bg-gray-50 text-gray-600 border-gray-200';
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

export function getHkCategoryBadgeClass(hkCategory: string | null): string {
  if (!hkCategory) return 'bg-gray-100 text-gray-600';
  const colors = HK_CATEGORY_COLORS[hkCategory];
  if (!colors) return 'bg-gray-100 text-gray-600';
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`;
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

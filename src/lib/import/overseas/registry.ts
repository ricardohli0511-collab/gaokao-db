import type { OverseasExamFramework } from './types';

export const OVERSEAS_EXAM_REGISTRY: OverseasExamFramework[] = [
  {
    key: 'sat',
    label: 'SAT',
    sourceScope: 'research',
    scoreMode: 'numeric-total',
    subjectRequirementMode: 'none',
    officialSourceFeasibility: 'stable-html',
    officialUrls: ['https://satsuite.collegeboard.org/scores'],
  },
  {
    key: 'act',
    label: 'ACT',
    sourceScope: 'research',
    scoreMode: 'numeric-total',
    subjectRequirementMode: 'none',
    officialSourceFeasibility: 'stable-html',
    officialUrls: ['https://www.act.org/content/act/en/products-and-services/the-act/scores.html'],
  },
  {
    key: 'ap',
    label: 'AP',
    sourceScope: 'research',
    scoreMode: 'grade-band',
    subjectRequirementMode: 'specific-subject-min',
    officialSourceFeasibility: 'stable-html',
    officialUrls: ['https://apstudents.collegeboard.org/about-ap-scores'],
  },
  {
    key: 'ib',
    label: 'IB',
    sourceScope: 'research',
    scoreMode: 'points-plus-core',
    subjectRequirementMode: 'hl-sl-split',
    officialSourceFeasibility: 'stable-html',
    officialUrls: ['https://ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/'],
  },
  {
    key: 'alevel',
    label: 'A-Level',
    sourceScope: 'research',
    scoreMode: 'grade-letter',
    subjectRequirementMode: 'specific-subject-min',
    officialSourceFeasibility: 'stable-html',
    officialUrls: ['https://www.cambridgeinternational.org/programmes-and-qualifications/recognition-and-acceptance/'],
  },
  {
    key: 'dse',
    label: 'DSE',
    sourceScope: 'research',
    scoreMode: 'grade-band',
    subjectRequirementMode: 'specific-subject-min',
    officialSourceFeasibility: 'manual-only',
    officialUrls: [],
  },
];

export function getOverseasExamByKey(key: OverseasExamFramework['key']): OverseasExamFramework {
  const item = OVERSEAS_EXAM_REGISTRY.find((entry) => entry.key === key);
  if (!item) {
    throw new Error(`未找到海外考试配置: ${key}`);
  }
  return item;
}

export type OverseasExamKey = 'sat' | 'act' | 'ap' | 'ib' | 'alevel' | 'dse';

export type ScoreMode =
  | 'numeric-total'
  | 'numeric-section'
  | 'grade-letter'
  | 'grade-band'
  | 'points-plus-core';

export type SubjectRequirementMode =
  | 'none'
  | 'any-n-of-list'
  | 'specific-subject-min'
  | 'hl-sl-split';

export type OfficialSourceFeasibility =
  | 'stable-file'
  | 'stable-html'
  | 'public-json'
  | 'query-only'
  | 'manual-only';

export interface OverseasExamFramework {
  key: OverseasExamKey;
  label: string;
  sourceScope: 'research';
  scoreMode: ScoreMode;
  subjectRequirementMode: SubjectRequirementMode;
  officialSourceFeasibility: OfficialSourceFeasibility;
  officialUrls: string[];
}

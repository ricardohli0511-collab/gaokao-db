export type Granularity = 'institution' | 'group' | 'major';

export type SupportedSourceType = 'html' | 'pdf' | 'xls' | 'xlsx' | 'csv' | 'zip' | 'manual';

export type SourceLevel = 'province-official' | 'chsi' | 'school-official' | 'manual';

export type SourceScope = 'ingest' | 'research';

export type ExamCategory = 'gaokao' | 'sat' | 'act' | 'ap' | 'ib' | 'alevel' | 'dse';

export interface ParentAdmissionLocator {
  examCategory: ExamCategory;
  year: number;
  province: string;
  subjectGroup: string;
  batch: string;
  institutionName: string;
  institutionCode?: string | null;
  admissionType?: string;
  granularity?: Extract<Granularity, 'institution' | 'group'>;
  groupCode?: string | null;
}

export interface SourceRegistryEntry {
  sourceId?: string;
  province: string;
  year: number;
  title: string;
  officialUrl: string;
  sourceType: SupportedSourceType;
  granularity: Granularity;
  examCategory?: ExamCategory;
  sourceScope?: SourceScope;
  sourceLevel?: SourceLevel;
  schoolKey?: string | null;
  priority?: number;
  status?: 'active' | 'candidate' | 'review';
  family?: string;
  crossCheckUrls?: string[];
  expectedGranularity?: Granularity;
  gapPolicy?: string;
  parserKey: string;
  parserVersion: string;
  subjectGroup?: string | null;
  batch?: string | null;
}

export interface RawSourceRow {
  province: string;
  year: number;
  sourceUrl: string;
  sourceTitle: string;
  sourceType: SupportedSourceType;
  parserKey: string;
  parserVersion: string;
  page?: number | null;
  sheetName?: string | null;
  rowNumber?: number | null;
  rawText: string;
  rawFields: Record<string, string | number | null | undefined>;
}

export interface NormalizedAdmissionRecord {
  examCategory?: ExamCategory;
  recordIdentityKey?: string;
  isSyntheticParent?: boolean;
  year: number;
  province: string;
  subjectGroup: string;
  batch: string;
  admissionType: string;
  granularity: Extract<Granularity, 'institution' | 'group'>;
  institutionCode?: string | null;
  rawInstitutionName: string;
  institutionName: string;
  groupCode?: string | null;
  groupName?: string | null;
  groupRequirement?: string | null;
  programVariant?: string | null;
  campusName?: string | null;
  minScore: number;
  avgScore?: number | null;
  minRank?: number | null;
  enrollmentCount?: number | null;
  planCount?: number | null;
  admittedCount?: number | null;
  sourceUrl: string;
  sourceTitle: string;
  rawRowHash: string;
}

export interface NormalizedMajorRecord {
  examCategory?: ExamCategory;
  majorIdentityKey?: string;
  granularity: 'major';
  province?: string;
  year?: number;
  parentAdmissionRowHash: string;
  parentAdmissionLocator?: ParentAdmissionLocator;
  majorName: string;
  majorCode?: string | null;
  majorRequirement?: string | null;
  minScore: number;
  avgScore?: number | null;
  maxScore?: number | null;
  minRank?: number | null;
  majorMinRank?: number | null;
  enrollmentCount?: number | null;
  planCount?: number | null;
  sourceUrl: string;
  rawRowHash: string;
}

export interface ParsedSourceDocument {
  source: SourceRegistryEntry;
  admissions: NormalizedAdmissionRecord[];
  majors: NormalizedMajorRecord[];
  issues: string[];
  gaps: string[];
  verificationNotes: string[];
}

export interface InstitutionMatchResult {
  institutionId: number | null;
  institutionCode: string | null;
  matchedName: string | null;
  unresolvedReason?: string;
}

export interface ImportCounters {
  importedAdmissions: number;
  updatedAdmissions: number;
  importedMajors: number;
  updatedMajors: number;
  supplementedMajors?: number;
  dedupedMajors?: number;
  syntheticParentsCreated?: number;
  skipped: number;
  unresolvedInstitutions: Array<{
    institutionCode?: string | null;
    rawInstitutionName: string;
    sourceUrl: string;
  }>;
}

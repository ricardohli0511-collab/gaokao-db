import type { ImportCounters, ParsedSourceDocument } from '@/lib/import/types';

type MatchedAdmissionCount = {
  granularity: string;
  _count: {
    id: number;
  };
};

type CoverageDoc = {
  id: number;
  province: string;
  year: number;
  examCategory: string | null;
  sourceLevel: string | null;
  sourceScope: string | null;
  schoolKey: string | null;
  sourceType: string;
  granularity: string;
  officialUrl: string;
  parserKey: string;
};

type SourceMeta = {
  status?: string;
  pageMode?: string;
  crossCheckUrls?: string[];
  gapPolicy?: string;
};

type SchoolMeta = {
  schoolKey: string;
  institutionName: string;
  adapterKey: string;
  sourceType: string;
  officialUrl: string;
  priority: number;
  status: 'active' | 'candidate' | 'review';
  pageMode: 'static-table' | 'filter-page' | 'article-list' | 'query-only';
  coverageYears: number[];
  coverageProvinces: string[];
  crossCheckUrls: string[];
};

type SourceLoadMeta = {
  officialUrl: string;
  sourceId?: string;
  parserKey?: string;
  schoolKey?: string | null;
  supplementedMajors?: number;
  dedupedMajors?: number;
  syntheticParentsCreated?: number;
  importedMajors?: number;
  verificationNotes?: string[];
  declaredGaps?: string[];
  gapCount?: number;
};

export function buildGapSummaryEntry(file: string, content: ParsedSourceDocument) {
  return {
    file,
    schoolKey: content.source.schoolKey ?? null,
    sourceId: content.source.sourceId,
    gaps: content.gaps ?? [],
    verificationNotes: content.verificationNotes ?? [],
  };
}

export function buildSourceLoadSummaryEntry(
  file: string,
  content: ParsedSourceDocument,
  counters: ImportCounters
) {
  return {
    file,
    officialUrl: content.source.officialUrl,
    sourceId: content.source.sourceId,
    parserKey: content.source.parserKey,
    schoolKey: content.source.schoolKey ?? null,
    sourceLevel: content.source.sourceLevel,
    importedAdmissions: counters.importedAdmissions,
    updatedAdmissions: counters.updatedAdmissions,
    importedMajors: counters.importedMajors,
    updatedMajors: counters.updatedMajors,
    supplementedMajors: counters.supplementedMajors ?? 0,
    dedupedMajors: counters.dedupedMajors ?? 0,
    syntheticParentsCreated: counters.syntheticParentsCreated ?? 0,
    skipped: counters.skipped,
    declaredGaps: content.gaps ?? [],
    verificationNotes: content.verificationNotes ?? [],
    gapCount: content.gaps?.length ?? 0,
  };
}

export function buildCoverageSummaryEntry(params: {
  doc: CoverageDoc;
  sourceMeta: SourceMeta | null;
  schoolMeta: SchoolMeta | null;
  loadMeta: SourceLoadMeta | null;
  matchedAdmissions: MatchedAdmissionCount[];
  majorCount: number;
}) {
  const { doc, sourceMeta, schoolMeta, loadMeta, matchedAdmissions, majorCount } = params;
  const crossCheckUrls = schoolMeta?.crossCheckUrls ?? sourceMeta?.crossCheckUrls ?? [];
  const declaredGaps = loadMeta?.declaredGaps
    ?? (sourceMeta?.gapPolicy ? [sourceMeta.gapPolicy] : doc.parserKey === 'hunan' ? ['group_only'] : []);
  const verificationNotes = loadMeta?.verificationNotes ?? [];
  const majorImportedCount = Math.max(majorCount, loadMeta?.importedMajors ?? 0);
  const sourceStatus = schoolMeta?.status ?? sourceMeta?.status ?? 'active';
  const pageMode = schoolMeta?.pageMode ?? sourceMeta?.pageMode ?? null;
  const schoolGapState = schoolMeta?.status === 'candidate'
    ? (schoolMeta.pageMode === 'filter-page'
      ? 'school_page_filter_enumeration_unverified'
      : majorImportedCount > 0
        ? null
        : 'school_adapter_pending')
    : schoolMeta?.status === 'review'
      ? 'school_adapter_pending'
      : null;

  return {
    province: doc.province,
    year: doc.year,
    examCategory: doc.examCategory,
    sourceLevel: doc.sourceLevel,
    sourceScope: doc.sourceScope,
    schoolKey: doc.schoolKey,
    sourceType: doc.sourceType,
    granularity: doc.granularity,
    sourceUrl: doc.officialUrl,
    schoolAdapterUsed: Boolean(doc.schoolKey),
    sourceStatus,
    pageMode,
    coverageYears: schoolMeta?.coverageYears ?? [],
    coverageProvinces: schoolMeta?.coverageProvinces ?? [],
    majorImportedCount,
    nativeMajorCount: doc.sourceLevel === 'province-official' ? majorCount : 0,
    schoolSupplementCount: loadMeta?.supplementedMajors ?? 0,
    dedupedMajorCount: loadMeta?.dedupedMajors ?? 0,
    syntheticParentCount: loadMeta?.syntheticParentsCreated ?? 0,
    majorSourcePresent: doc.granularity === 'major' || majorCount > 0,
    crossValidated: crossCheckUrls.length > 0,
    rankDerivedFromOfficial: doc.parserKey === 'shandong',
    declaredGaps,
    verificationNotes,
    schoolGapState,
    schoolSourceCompleted: doc.sourceLevel === 'school-official' ? majorImportedCount > 0 : null,
    researchStatus: doc.sourceScope === 'research' ? 'modeled' : null,
    loadedCounts: matchedAdmissions.map((item) => ({
      granularity: item.granularity,
      count: item._count.id,
    })),
  };
}

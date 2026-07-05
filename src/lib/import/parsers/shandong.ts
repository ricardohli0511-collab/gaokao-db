import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeNumberLike, splitInstitutionVariant } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, NormalizedMajorRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';
import { deriveScoreFromRank, type ScoreRankPoint } from '@/lib/import/score-rank';

function parseInstitution(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^([A-Z]?\d{3,4})\s*(.+)$/);
  return {
    institutionCode: match?.[1] ?? null,
    rawInstitutionName: match?.[2]?.trim() ?? trimmed,
  };
}

function parseMajor(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^([A-Z]?\d{1,4})\s*(.+)$/);
  return {
    majorCode: match?.[1] ?? null,
    majorName: match?.[2]?.trim() ?? trimmed,
  };
}

export function parseShandongRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[],
  scoreLadder: ScoreRankPoint[] = []
): ParsedSourceDocument {
  const admissions: NormalizedAdmissionRecord[] = [];
  const majors: NormalizedMajorRecord[] = [];
  const admissionMap = new Map<string, NormalizedAdmissionRecord>();
  const gaps = new Set<string>();

  for (const row of rows) {
    const institutionInfo = parseInstitution(String(row.rawFields['院校代号及名称'] ?? ''));
    const majorInfo = parseMajor(String(row.rawFields['专业代号及名称'] ?? ''));
    const majorMinRank = normalizeNumberLike(row.rawFields['最低位次']);

    if (!institutionInfo.rawInstitutionName || !majorInfo.majorName || majorMinRank === null) {
      continue;
    }

    const scoreResult = deriveScoreFromRank({
      targetRank: majorMinRank,
      ladder: scoreLadder,
    });

    if (scoreResult.gap) {
      gaps.add('rank_only_waiting_score_ladder');
    }

    const variant = splitInstitutionVariant(institutionInfo.rawInstitutionName);
    const admissionRowHash = createRowHash([
      source.province,
      source.year,
      institutionInfo.institutionCode,
      variant.baseName,
      source.batch ?? '本科批',
      source.subjectGroup ?? '综合',
    ]);

    const admissionMinScore = scoreResult.minScore ?? 0;

    if (!admissionMap.has(admissionRowHash)) {
      admissionMap.set(admissionRowHash, {
        year: source.year,
        province: source.province,
        subjectGroup: mapSubjectGroup(String(source.subjectGroup || '综合')),
        batch: mapBatchLabel(String(source.batch || '本科批')),
        admissionType: normalizeAdmissionType('统招'),
        granularity: 'institution',
        institutionCode: institutionInfo.institutionCode,
        rawInstitutionName: institutionInfo.rawInstitutionName,
        institutionName: variant.baseName,
        programVariant: variant.programVariant,
        campusName: variant.campusName,
        minScore: admissionMinScore,
        minRank: majorMinRank,
        sourceUrl: source.officialUrl,
        sourceTitle: source.title,
        rawRowHash: admissionRowHash,
      });
    }

    majors.push({
      granularity: 'major',
      province: source.province,
      year: source.year,
      parentAdmissionRowHash: admissionRowHash,
      majorName: majorInfo.majorName,
      majorCode: majorInfo.majorCode,
      minScore: admissionMinScore,
      majorMinRank,
      planCount: normalizeNumberLike(row.rawFields['投档计划数']),
      sourceUrl: source.officialUrl,
      rawRowHash: createRowHash([admissionRowHash, majorInfo.majorCode, majorInfo.majorName, row.rowNumber]),
    });
  }

  admissions.push(...admissionMap.values());

  return {
    source,
    admissions,
    majors,
    issues: rows.length === 0 ? ['未读取到山东来源行数据'] : [],
    gaps: [...gaps],
    verificationNotes: scoreLadder.length > 0 ? ['score_derived_from_official_rank'] : [],
  };
}

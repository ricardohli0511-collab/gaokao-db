import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeNumberLike, splitInstitutionVariant } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, NormalizedMajorRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

function parseInstitution(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^([A-Z0-9]+)\s+(.+)$/);
  return {
    institutionCode: match?.[1] ?? null,
    rawInstitutionName: match?.[2]?.trim() ?? trimmed,
  };
}

function parseMajor(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^([A-Z0-9]+)\s+(.+)$/);
  return {
    majorCode: match?.[1] ?? null,
    majorName: match?.[2]?.trim() ?? trimmed,
  };
}

export function parseZhejiangRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const admissions: NormalizedAdmissionRecord[] = [];
  const majors: NormalizedMajorRecord[] = [];
  const admissionMap = new Map<string, NormalizedAdmissionRecord>();

  for (const row of rows) {
    const institutionInfo = parseInstitution(String(row.rawFields['院校代号及名称'] ?? ''));
    const majorInfo = parseMajor(String(row.rawFields['专业代号及名称'] ?? ''));
    const minScore = normalizeNumberLike(row.rawFields['投档分'] ?? row.rawFields['最低分']);

    if (!institutionInfo.rawInstitutionName || !majorInfo.majorName || minScore === null) {
      continue;
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
        minScore,
        minRank: normalizeNumberLike(row.rawFields['位次'] ?? row.rawFields['最低位次']),
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
      minScore,
      majorMinRank: normalizeNumberLike(row.rawFields['位次'] ?? row.rawFields['最低位次']),
      sourceUrl: source.officialUrl,
      rawRowHash: createRowHash([admissionRowHash, majorInfo.majorCode, majorInfo.majorName, row.rowNumber]),
    });
  }

  admissions.push(...admissionMap.values());

  return {
    source,
    admissions,
    majors,
    issues: rows.length === 0 ? ['未读取到浙江来源行数据'] : [],
    gaps: [],
    verificationNotes: [],
  };
}

import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeInstitutionName, normalizeNumberLike, splitInstitutionVariant } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

function buildAdmissionRecord(source: SourceRegistryEntry, row: RawSourceRow): NormalizedAdmissionRecord | null {
  const rawInstitutionName = normalizeInstitutionName(String(row.rawFields['院校名称'] ?? row.rawFields['institutionName'] ?? ''));
  const minScore = normalizeNumberLike(row.rawFields['投档最低分'] ?? row.rawFields['最低分'] ?? row.rawFields['minScore']);

  if (!rawInstitutionName || minScore === null) return null;

  const { baseName, programVariant, campusName } = splitInstitutionVariant(rawInstitutionName);
  const institutionCode = String(row.rawFields['院校代码'] ?? row.rawFields['institutionCode'] ?? '').trim() || null;
  const groupCode = String(row.rawFields['专业组代码'] ?? row.rawFields['groupCode'] ?? '').trim() || null;

  return {
    year: source.year,
    province: source.province,
    subjectGroup: mapSubjectGroup(String(source.subjectGroup || row.rawFields['subjectGroup'] || '')),
    batch: mapBatchLabel(String(source.batch || row.rawFields['batch'] || '本科批')),
    admissionType: normalizeAdmissionType(String(row.rawFields['admissionType'] ?? '统招')),
    granularity: 'group',
    institutionCode,
    rawInstitutionName,
    institutionName: baseName,
    groupCode,
    groupName: groupCode ? `${groupCode}专业组` : null,
    groupRequirement: String(row.rawFields['专业组要求'] ?? row.rawFields['groupRequirement'] ?? '').trim() || null,
    programVariant,
    campusName,
    minScore,
    minRank: normalizeNumberLike(row.rawFields['投档最低排位'] ?? row.rawFields['最低排位'] ?? row.rawFields['minRank']),
    planCount: normalizeNumberLike(row.rawFields['计划数'] ?? row.rawFields['planCount']),
    admittedCount: normalizeNumberLike(row.rawFields['投档人数'] ?? row.rawFields['admittedCount']),
    sourceUrl: source.officialUrl,
    sourceTitle: source.title,
    rawRowHash: createRowHash([
      source.province,
      source.year,
      institutionCode,
      rawInstitutionName,
      groupCode,
      minScore,
      row.rowNumber,
    ]),
  };
}

export function parseGuangdongRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const admissions = rows
    .map((row) => buildAdmissionRecord(source, row))
    .filter((row): row is NormalizedAdmissionRecord => row !== null);

  return {
    source,
    admissions,
    majors: [],
    issues: rows.length === 0 ? ['未读取到广东来源行数据'] : [],
    gaps: [],
    verificationNotes: [],
  };
}

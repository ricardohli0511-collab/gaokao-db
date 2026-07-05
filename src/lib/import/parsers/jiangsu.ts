import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeInstitutionName, normalizeNumberLike, splitInstitutionVariant } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

export function parseJiangsuGroupText(raw: string): {
  institutionCode: string | null;
  rawInstitutionName: string;
  groupCode: string | null;
  groupRequirement: string | null;
  programVariant: string | null;
  campusName: string | null;
} {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  const institutionCodeMatch = trimmed.match(/^([A-Z0-9]+)\s+/);
  const institutionCode = institutionCodeMatch?.[1] ?? null;
  const withoutCode = institutionCode ? trimmed.replace(/^([A-Z0-9]+)\s+/, '') : trimmed;

  const groupMatch = withoutCode.match(/^(.*?)(\d+)\s*专业组((?:\([^()]+\))+)$/);
  if (!groupMatch) {
    const fallback = splitInstitutionVariant(normalizeInstitutionName(withoutCode));
    return {
      institutionCode,
      rawInstitutionName: fallback.baseName || normalizeInstitutionName(withoutCode),
      groupCode: null,
      groupRequirement: null,
      programVariant: fallback.programVariant,
      campusName: fallback.campusName,
    };
  }

  const rawInstitutionName = normalizeInstitutionName(groupMatch[1] ?? '');
  const groupCode = groupMatch[2] ?? null;
  const segments = [...(groupMatch[3] ?? '').matchAll(/\(([^()]+)\)/g)].map((item) => item[1]?.trim() ?? '');
  const [groupRequirementRaw, ...variantSegments] = segments;

  const { programVariant, campusName } = splitInstitutionVariant(
    [rawInstitutionName, ...variantSegments.map((item) => `(${item})`)].join('')
  );

  return {
    institutionCode,
    rawInstitutionName,
    groupCode,
    groupRequirement: groupRequirementRaw ?? null,
    programVariant,
    campusName,
  };
}

function buildAdmissionRecord(
  source: SourceRegistryEntry,
  row: RawSourceRow
): NormalizedAdmissionRecord | null {
  const label = String(row.rawFields['院校、专业组'] ?? row.rawFields['院校专业组'] ?? row.rawFields['院校､专业组(再选科目要求)'] ?? row.rawFields['院校､专业组'] ?? row.rawFields['院校专业组（再选科目要求）'] ?? row.rawFields['groupText'] ?? row.rawText).trim();
  if (!label) return null;

  const parsedGroup = parseJiangsuGroupText(label);
  const rawInstitutionName = parsedGroup.rawInstitutionName;
  if (!rawInstitutionName) return null;

  const minScore = normalizeNumberLike(row.rawFields['投档最低分'] ?? row.rawFields['minScore']);
  if (minScore === null) return null;

  const recordHash = createRowHash([
    source.province,
    source.year,
    rawInstitutionName,
    parsedGroup.groupCode,
    minScore,
    row.rowNumber,
  ]);

  return {
    year: source.year,
    province: source.province,
    subjectGroup: mapSubjectGroup(String(source.subjectGroup || row.rawFields['subjectGroup'] || '')),
    batch: mapBatchLabel(String(source.batch || row.rawFields['batch'] || '本科批')),
    admissionType: normalizeAdmissionType(String(row.rawFields['admissionType'] ?? '统招')),
    granularity: 'group',
    institutionCode: parsedGroup.institutionCode,
    rawInstitutionName,
    institutionName: rawInstitutionName,
    groupCode: parsedGroup.groupCode,
    groupName: parsedGroup.groupCode ? `${parsedGroup.groupCode}专业组` : null,
    groupRequirement: parsedGroup.groupRequirement,
    programVariant: parsedGroup.programVariant,
    campusName: parsedGroup.campusName,
    minScore,
    minRank: normalizeNumberLike(row.rawFields['最低位次'] ?? row.rawFields['minRank']),
    planCount: normalizeNumberLike(row.rawFields['计划数'] ?? row.rawFields['planCount']),
    admittedCount: normalizeNumberLike(row.rawFields['投档人数'] ?? row.rawFields['admittedCount']),
    sourceUrl: source.officialUrl,
    sourceTitle: source.title,
    rawRowHash: recordHash,
  };
}

export function parseJiangsuRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const admissions = rows
    .map((row) => buildAdmissionRecord(source, row))
    .filter((row): row is NormalizedAdmissionRecord => row !== null);

  const issues = rows.length === 0 ? ['未读取到江苏来源行数据'] : [];

  return {
    source,
    admissions,
    majors: [],
    issues,
    gaps: [],
    verificationNotes: [],
  };
}

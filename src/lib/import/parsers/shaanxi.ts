import { buildAdmissionIdentityKey } from '@/lib/import/identity';
import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeNumberLike, splitInstitutionVariant } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

export function parseShaanxiRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const admissions: NormalizedAdmissionRecord[] = [];

  for (const row of rows) {
    const institutionCode = String(row.rawFields['院校代码'] ?? '').trim() || null;
    const rawInstitutionName = String(row.rawFields['院校名称'] ?? '').trim();
    const minScore = normalizeNumberLike(row.rawFields['最低分'] ?? row.rawFields['投档最低分']);
    const minRank = normalizeNumberLike(row.rawFields['最低位次']);

    if (!rawInstitutionName || minScore === null) continue;

    const variant = splitInstitutionVariant(rawInstitutionName);
    const recordIdentityKey = buildAdmissionIdentityKey({
      examCategory: 'gaokao',
      year: source.year,
      province: source.province,
      subjectGroup: mapSubjectGroup(String(row.rawFields['科类'] ?? source.subjectGroup ?? '')),
      batch: mapBatchLabel(String(source.batch || '本科批')),
      admissionType: normalizeAdmissionType('统招'),
      institutionName: variant.baseName,
      institutionCode,
      granularity: 'institution',
      programVariant: variant.programVariant,
      campusName: variant.campusName,
      groupCode: null,
    });

    admissions.push({
      examCategory: 'gaokao',
      recordIdentityKey,
      year: source.year,
      province: source.province,
      subjectGroup: mapSubjectGroup(String(row.rawFields['科类'] ?? source.subjectGroup ?? '')),
      batch: mapBatchLabel(String(source.batch || '本科批')),
      admissionType: normalizeAdmissionType('统招'),
      granularity: 'institution',
      institutionCode,
      rawInstitutionName,
      institutionName: variant.baseName,
      programVariant: variant.programVariant,
      campusName: variant.campusName,
      minScore,
      minRank,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      rawRowHash: createRowHash([recordIdentityKey, row.rowNumber, 'shaanxi']),
    });
  }

  return {
    source,
    admissions,
    majors: [],
    issues: rows.length === 0 ? ['未读取到陕西来源行数据'] : [],
    gaps: ['institution_only_waiting_school_majors'],
    verificationNotes: rows.length > 0 ? ['school_supplement_parent_ready'] : [],
  };
}

import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeNumberLike } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

export function parseHunanRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const admissions: NormalizedAdmissionRecord[] = [];

  for (const row of rows) {
    const institutionCode = String(row.rawFields['院校代号'] ?? row.rawFields['院校代码'] ?? '').trim() || null;
    const institutionName = String(row.rawFields['院校名称'] ?? '').trim();
    const groupCode = String(row.rawFields['专业组编号'] ?? row.rawFields['专业组代码'] ?? '').trim() || null;
    const groupName = String(row.rawFields['专业组名称'] ?? '').trim() || null;
    const minScore = normalizeNumberLike(row.rawFields['投档线'] ?? row.rawFields['投档最低分']);
    const subjectGroup = String(row.rawFields['科类'] ?? source.subjectGroup ?? '');

    if (!institutionName || minScore === null) continue;

    admissions.push({
      year: source.year,
      province: source.province,
      subjectGroup: mapSubjectGroup(subjectGroup),
      batch: mapBatchLabel(String(source.batch || '提前批')),
      admissionType: normalizeAdmissionType('统招'),
      granularity: 'group',
      institutionCode,
      rawInstitutionName: institutionName,
      institutionName,
      groupCode,
      groupName,
      programVariant: String(row.rawFields['计划类别'] ?? '').trim() || null,
      minScore,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      rawRowHash: createRowHash([
        source.province,
        source.year,
        institutionCode,
        institutionName,
        groupCode,
        minScore,
        row.rowNumber,
      ]),
    });
  }

  return {
    source,
    admissions,
    majors: [],
    issues: rows.length === 0 ? ['未读取到湖南来源行数据'] : [],
    gaps: admissions.length > 0 ? ['group_only'] : [],
    verificationNotes: [],
  };
}

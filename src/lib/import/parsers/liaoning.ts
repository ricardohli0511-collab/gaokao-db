import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeNumberLike } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, NormalizedMajorRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

export function parseLiaoningRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const majors: NormalizedMajorRecord[] = [];
  const admissionMap = new Map<string, NormalizedAdmissionRecord>();

  for (const row of rows) {
    const institutionCode = String(row.rawFields['院校编号'] ?? '').trim() || null;
    const institutionName = String(row.rawFields['招生院校'] ?? '').trim();
    const majorCode = String(row.rawFields['专业编号'] ?? '').trim() || null;
    const majorName = String(row.rawFields['招生专业'] ?? '').trim();
    const minScore = normalizeNumberLike(row.rawFields['投档最低分']);

    if (!institutionName || !majorName || minScore === null) continue;

    const admissionRowHash = createRowHash([
      source.province,
      source.year,
      institutionCode,
      institutionName,
      source.subjectGroup,
      source.batch,
    ]);

    if (!admissionMap.has(admissionRowHash)) {
      admissionMap.set(admissionRowHash, {
        year: source.year,
        province: source.province,
        subjectGroup: mapSubjectGroup(String(source.subjectGroup || '')),
        batch: mapBatchLabel(String(source.batch || '本科批')),
        admissionType: normalizeAdmissionType('统招'),
        granularity: 'institution',
        institutionCode,
        rawInstitutionName: institutionName,
        institutionName,
        minScore,
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
      majorName,
      majorCode,
      minScore,
      sourceUrl: source.officialUrl,
      rawRowHash: createRowHash([admissionRowHash, majorCode, majorName, row.rowNumber]),
    });
  }

  return {
    source,
    admissions: [...admissionMap.values()],
    majors,
    issues: rows.length === 0 ? ['未读取到辽宁来源行数据'] : [],
    gaps: [],
    verificationNotes: [],
  };
}

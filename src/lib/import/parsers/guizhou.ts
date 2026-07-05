import { buildAdmissionIdentityKey, buildMajorIdentityKey } from '@/lib/import/identity';
import { createRowHash, mapBatchLabel, mapSubjectGroup, normalizeAdmissionType, normalizeNumberLike, splitInstitutionVariant } from '@/lib/import/normalize';
import type { NormalizedAdmissionRecord, NormalizedMajorRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

export function parseGuizhouRows(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const admissionMap = new Map<string, NormalizedAdmissionRecord>();
  const majors: NormalizedMajorRecord[] = [];

  for (const row of rows) {
    const institutionCode = String(row.rawFields['院校代码'] ?? '').trim() || null;
    const rawInstitutionName = String(row.rawFields['院校名称'] ?? '').trim();
    const majorCode = String(row.rawFields['专业代码'] ?? '').trim() || null;
    const majorName = String(row.rawFields['专业名称'] ?? '').replace(/\s+/g, '');
    const minScore = normalizeNumberLike(row.rawFields['投档最低分']);
    const majorMinRank = normalizeNumberLike(row.rawFields['投档最低位次']);

    if (!rawInstitutionName || !majorName || minScore === null) continue;

    const variant = splitInstitutionVariant(rawInstitutionName);
    const recordIdentityKey = buildAdmissionIdentityKey({
      examCategory: 'gaokao',
      year: source.year,
      province: source.province,
      subjectGroup: String(source.subjectGroup || ''),
      batch: String(source.batch || ''),
      admissionType: normalizeAdmissionType(String(row.rawFields['招考类型'] ?? '统招')),
      institutionName: variant.baseName,
      institutionCode,
      granularity: 'institution',
      programVariant: variant.programVariant,
      campusName: variant.campusName,
      groupCode: null,
    });
    const admissionRowHash = createRowHash([recordIdentityKey, 'guizhou', source.officialUrl]);

    if (!admissionMap.has(recordIdentityKey)) {
      admissionMap.set(recordIdentityKey, {
        examCategory: 'gaokao',
        recordIdentityKey,
        year: source.year,
        province: source.province,
        subjectGroup: mapSubjectGroup(String(source.subjectGroup || '')),
        batch: mapBatchLabel(String(source.batch || '本科批')),
        admissionType: normalizeAdmissionType(String(row.rawFields['招考类型'] ?? '统招')),
        granularity: 'institution',
        institutionCode,
        rawInstitutionName,
        institutionName: variant.baseName,
        programVariant: variant.programVariant,
        campusName: variant.campusName,
        minScore,
        minRank: majorMinRank,
        sourceUrl: source.officialUrl,
        sourceTitle: source.title,
        rawRowHash: admissionRowHash,
      });
    }

    majors.push({
      examCategory: 'gaokao',
      majorIdentityKey: buildMajorIdentityKey({
        examCategory: 'gaokao',
        admissionIdentityKey: recordIdentityKey,
        majorName,
        majorCode,
      }),
      granularity: 'major',
      province: source.province,
      year: source.year,
      parentAdmissionRowHash: admissionRowHash,
      majorName,
      majorCode,
      minScore,
      majorMinRank,
      planCount: normalizeNumberLike(row.rawFields['计划数']),
      enrollmentCount: normalizeNumberLike(row.rawFields['投档人数']),
      sourceUrl: source.officialUrl,
      rawRowHash: createRowHash([recordIdentityKey, majorCode, majorName, row.rowNumber]),
    });
  }

  return {
    source,
    admissions: [...admissionMap.values()],
    majors,
    issues: rows.length === 0 ? ['未读取到贵州来源行数据'] : [],
    gaps: [],
    verificationNotes: rows.length > 0 ? ['province-major-pdf'] : [],
  };
}

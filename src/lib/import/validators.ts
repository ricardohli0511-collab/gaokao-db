import type { NormalizedAdmissionRecord } from '@/lib/import/types';

export function validateAdmissionRecord(record: NormalizedAdmissionRecord): string[] {
  const issues: string[] = [];

  if (!record.institutionName) issues.push('缺少院校名称');
  if (!record.batch) issues.push('缺少批次');
  if (!record.subjectGroup) issues.push('缺少选科');
  if (!Number.isInteger(record.minScore) || record.minScore <= 0) issues.push('最低分无效');
  if (record.minRank !== null && record.minRank !== undefined && record.minRank <= 0) {
    issues.push('最低位次无效');
  }

  return issues;
}

export function isDuplicateRowHash(
  rowHash: string,
  seen: Set<string>
): boolean {
  if (seen.has(rowHash)) return true;
  seen.add(rowHash);
  return false;
}

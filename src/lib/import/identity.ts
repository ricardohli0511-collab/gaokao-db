import { createHash } from 'node:crypto';

import type { ExamCategory, Granularity, ParentAdmissionLocator } from '@/lib/import/types';

function hashParts(parts: Array<string | number | null | undefined>): string {
  return createHash('sha256')
    .update(parts.map((part) => String(part ?? '')).join('||'))
    .digest('hex');
}

export function buildAdmissionIdentityKey(params: {
  examCategory: ExamCategory;
  year: number;
  province: string;
  subjectGroup: string;
  batch: string;
  admissionType: string;
  institutionName: string;
  institutionCode?: string | null;
  granularity: Extract<Granularity, 'institution' | 'group'>;
  programVariant?: string | null;
  campusName?: string | null;
  groupCode?: string | null;
}): string {
  return hashParts([
    params.examCategory,
    params.year,
    params.province,
    params.subjectGroup,
    params.batch,
    params.admissionType,
    params.institutionCode,
    params.institutionName,
    params.granularity,
    params.programVariant,
    params.campusName,
    params.groupCode,
  ]);
}

export function buildMajorIdentityKey(params: {
  examCategory: ExamCategory;
  admissionIdentityKey: string;
  majorName: string;
  majorCode?: string | null;
}): string {
  return hashParts([
    params.examCategory,
    params.admissionIdentityKey,
    params.majorCode,
    params.majorName,
  ]);
}

export function buildParentAdmissionLocator(params: ParentAdmissionLocator): ParentAdmissionLocator {
  return {
    examCategory: params.examCategory,
    year: params.year,
    province: params.province,
    subjectGroup: params.subjectGroup,
    batch: params.batch,
    institutionName: params.institutionName,
    institutionCode: params.institutionCode ?? null,
    admissionType: params.admissionType ?? '统招',
    granularity: params.granularity ?? 'institution',
    groupCode: params.groupCode ?? null,
  };
}

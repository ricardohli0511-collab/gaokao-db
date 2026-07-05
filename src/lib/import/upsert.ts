import { prisma } from '@/lib/prisma';
import { buildAdmissionIdentityKey, buildMajorIdentityKey } from '@/lib/import/identity';
import type { ImportCounters, NormalizedAdmissionRecord, NormalizedMajorRecord } from '@/lib/import/types';
import { matchInstitution } from '@/lib/import/match-institution';
import { splitInstitutionVariant } from '@/lib/import/normalize';
import { validateAdmissionRecord } from '@/lib/import/validators';

async function ensureInstitution(record: NormalizedAdmissionRecord) {
  const matched = await matchInstitution({
    institutionCode: record.institutionCode,
    rawInstitutionName: record.rawInstitutionName,
  });

  if (matched.institutionId) {
    return matched;
  }

  const created = await prisma.institution.create({
    data: {
      name: record.institutionName,
      normalizedName: record.institutionName,
      code: record.institutionCode ?? undefined,
      category: '普通本科',
      province: record.province,
      website: null,
    },
    select: { id: true, code: true, name: true },
  });

  await prisma.institutionAlias.upsert({
    where: {
      institutionId_aliasName: {
        institutionId: created.id,
        aliasName: record.rawInstitutionName,
      },
    },
    update: {
      normalizedAlias: record.institutionName,
      institutionCode: record.institutionCode ?? undefined,
      sourceUrl: record.sourceUrl,
    },
    create: {
      institutionId: created.id,
      aliasName: record.rawInstitutionName,
      normalizedAlias: record.institutionName,
      institutionCode: record.institutionCode ?? undefined,
      sourceName: '官方导入',
      sourceUrl: record.sourceUrl,
    },
  });

  return {
    institutionId: created.id,
    institutionCode: created.code,
    matchedName: created.name,
  };
}

function resolveAdmissionIdentity(record: NormalizedAdmissionRecord) {
  return record.recordIdentityKey ?? buildAdmissionIdentityKey({
    examCategory: record.examCategory ?? 'gaokao',
    year: record.year,
    province: record.province,
    subjectGroup: record.subjectGroup,
    batch: record.batch,
    admissionType: record.admissionType,
    institutionName: record.institutionName,
    institutionCode: record.institutionCode ?? null,
    granularity: record.granularity,
    programVariant: record.programVariant ?? null,
    campusName: record.campusName ?? null,
    groupCode: record.groupCode ?? null,
  });
}

function resolveMajorIdentity(
  major: NormalizedMajorRecord,
  admissionIdentityKey: string
) {
  return major.majorIdentityKey ?? buildMajorIdentityKey({
    examCategory: major.examCategory ?? 'gaokao',
    admissionIdentityKey,
    majorName: major.majorName,
    majorCode: major.majorCode ?? null,
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function upsertAdmissionBundle(params: {
  admissions: NormalizedAdmissionRecord[];
  majorsByRowHash?: Map<string, NormalizedMajorRecord[]>;
  majors?: NormalizedMajorRecord[];
  sourceDocumentId?: number;
}): Promise<ImportCounters> {
  const counters: ImportCounters = {
    importedAdmissions: 0,
    updatedAdmissions: 0,
    importedMajors: 0,
    updatedMajors: 0,
    supplementedMajors: 0,
    dedupedMajors: 0,
    syntheticParentsCreated: 0,
    skipped: 0,
    unresolvedInstitutions: [],
  };
  const admissionIdsByRowHash = new Map<string, { id: number; recordIdentityKey: string }>();

  // 批量预加载：收集所有唯一 institution 并一次性 match/create
  const uniqueInstitutionKeys = new Set<string>();
  const institutionMap = new Map<string, { code: string | null; rawName: string; normalizedName: string }>();

  for (const record of params.admissions) {
    const key = `${record.institutionCode ?? ''}::${record.rawInstitutionName}`;
    if (!uniqueInstitutionKeys.has(key)) {
      uniqueInstitutionKeys.add(key);
      institutionMap.set(key, {
        code: record.institutionCode ?? null,
        rawName: record.rawInstitutionName,
        normalizedName: record.institutionName,
      });
    }
  }

  const institutionCache = new Map<string, { institutionId: number; institutionCode: string | null; matchedName: string }>();

  for (const [key, info] of institutionMap) {
    let matched = await matchInstitution({
      institutionCode: info.code ?? undefined,
      rawInstitutionName: info.rawName,
    });

    if (!matched.institutionId) {
      const created = await prisma.institution.create({
        data: {
          name: info.normalizedName,
          normalizedName: info.normalizedName,
          code: info.code ?? undefined,
          category: '普通本科',
          province: '全国',
          website: null,
        },
        select: { id: true, code: true, name: true },
      });

      await prisma.institutionAlias.upsert({
        where: { institutionId_aliasName: { institutionId: created.id, aliasName: info.rawName } },
        update: { normalizedAlias: info.normalizedName, institutionCode: info.code ?? undefined },
        create: { institutionId: created.id, aliasName: info.rawName, normalizedAlias: info.normalizedName, institutionCode: info.code ?? undefined, sourceName: '官方导入', sourceUrl: params.admissions.find((a) => `${a.institutionCode ?? ''}::${a.rawInstitutionName}` === key)?.sourceUrl },
      });

      matched = { institutionId: created.id, institutionCode: created.code, matchedName: created.name };
    }

    institutionCache.set(key, matched);
  }

  const admissionIdentityKeys = params.admissions.map((record) => resolveAdmissionIdentity(record));
  const existingAdmissionsByIdentity = new Map<string, { id: number; recordIdentityKey: string | null }>();

  for (const chunk of chunkArray(admissionIdentityKeys, 500)) {
    const existing = await prisma.admissionRecord.findMany({
      where: {
        recordIdentityKey: {
          in: chunk,
        },
      },
      select: { id: true, recordIdentityKey: true },
    });
    for (const item of existing) {
      if (item.recordIdentityKey) {
        existingAdmissionsByIdentity.set(item.recordIdentityKey, item);
      }
    }
  }

  for (let admissionIndex = 0; admissionIndex < params.admissions.length; admissionIndex += 1) {
    const record = params.admissions[admissionIndex];
    const issues = validateAdmissionRecord(record);
    if (issues.length > 0) {
      counters.skipped += 1;
      counters.unresolvedInstitutions.push({
        institutionCode: record.institutionCode,
        rawInstitutionName: `${record.rawInstitutionName} (${issues.join('，')})`,
        sourceUrl: record.sourceUrl,
      });
      continue;
    }

    const cacheKey = `${record.institutionCode ?? ''}::${record.rawInstitutionName}`;
    const institution = institutionCache.get(cacheKey);
    if (!institution || !institution.institutionId) {
      counters.skipped += 1;
      counters.unresolvedInstitutions.push({
        institutionCode: record.institutionCode,
        rawInstitutionName: record.rawInstitutionName,
        sourceUrl: record.sourceUrl,
      });
      continue;
    }

    const variant = splitInstitutionVariant(record.rawInstitutionName);
    const recordIdentityKey = admissionIdentityKeys[admissionIndex];
    const existingAdmission = existingAdmissionsByIdentity.get(recordIdentityKey) ?? null;

    const admissionPayload = {
      examCategory: record.examCategory ?? 'gaokao',
      recordIdentityKey,
      isSyntheticParent: record.isSyntheticParent ?? false,
      year: record.year,
      province: record.province,
      subjectGroup: record.subjectGroup,
      batch: record.batch,
      institutionId: institution.institutionId,
      institutionCode: record.institutionCode ?? undefined,
      rawInstitutionName: record.rawInstitutionName,
      groupCode: record.groupCode ?? undefined,
      groupName: record.groupName ?? undefined,
      groupRequirement: record.groupRequirement ?? undefined,
      programVariant: record.programVariant ?? variant.programVariant ?? undefined,
      campusName: record.campusName ?? variant.campusName ?? undefined,
      granularity: record.granularity,
      admissionType: record.admissionType,
      minScore: record.minScore,
      avgScore: record.avgScore ?? null,
      minRank: record.minRank ?? null,
      enrollmentCount: record.enrollmentCount ?? null,
      planCount: record.planCount ?? null,
      admittedCount: record.admittedCount ?? null,
      sourceDocumentId: params.sourceDocumentId ?? null,
      sourceUrl: record.sourceUrl,
      rawRowHash: record.rawRowHash,
    };

    const admission = existingAdmission
      ? await prisma.admissionRecord.update({
          where: { id: existingAdmission.id },
          data: admissionPayload,
          select: { id: true, createdAt: true, updatedAt: true },
        })
      : await prisma.admissionRecord.create({
          data: admissionPayload,
          select: { id: true, createdAt: true, updatedAt: true },
        });

    if (existingAdmission) {
      counters.updatedAdmissions += 1;
    } else {
      counters.importedAdmissions += 1;
      existingAdmissionsByIdentity.set(recordIdentityKey, { id: admission.id, recordIdentityKey });
    }
    admissionIdsByRowHash.set(record.rawRowHash, {
      id: admission.id,
      recordIdentityKey,
    });
  }

  const majors = [
    ...(params.majors ?? []),
    ...Array.from(params.majorsByRowHash?.values() ?? []).flat(),
  ];
  const unresolvedLocatorMajors = majors.filter((major) => !admissionIdsByRowHash.get(major.parentAdmissionRowHash) && major.parentAdmissionLocator);
  const locatorIdentities = unresolvedLocatorMajors.map((major) => buildAdmissionIdentityKey({
    examCategory: major.parentAdmissionLocator?.examCategory ?? 'gaokao',
    year: major.parentAdmissionLocator!.year,
    province: major.parentAdmissionLocator!.province,
    subjectGroup: major.parentAdmissionLocator!.subjectGroup,
    batch: major.parentAdmissionLocator!.batch,
    admissionType: major.parentAdmissionLocator!.admissionType ?? '统招',
    institutionName: major.parentAdmissionLocator!.institutionName,
    institutionCode: major.parentAdmissionLocator!.institutionCode ?? null,
    granularity: major.parentAdmissionLocator!.granularity ?? 'institution',
    programVariant: null,
    campusName: null,
    groupCode: major.parentAdmissionLocator!.groupCode ?? null,
  }));
  const locatedAdmissionsByIdentity = new Map<string, { id: number; recordIdentityKey: string | null }>();

  for (const chunk of chunkArray(locatorIdentities, 500)) {
    const existing = await prisma.admissionRecord.findMany({
      where: {
        recordIdentityKey: {
          in: chunk,
        },
      },
      select: { id: true, recordIdentityKey: true },
    });
    for (const item of existing) {
      if (item.recordIdentityKey) {
        locatedAdmissionsByIdentity.set(item.recordIdentityKey, item);
      }
    }
  }

  const preparedMajors = majors.map((major) => {
    const byRowHash = admissionIdsByRowHash.get(major.parentAdmissionRowHash);
    if (byRowHash) {
      return {
        major,
        parentAdmission: byRowHash,
      };
    }

    if (!major.parentAdmissionLocator) {
      return { major, parentAdmission: null };
    }

    const locatorIdentityKey = buildAdmissionIdentityKey({
      examCategory: major.parentAdmissionLocator.examCategory,
      year: major.parentAdmissionLocator.year,
      province: major.parentAdmissionLocator.province,
      subjectGroup: major.parentAdmissionLocator.subjectGroup,
      batch: major.parentAdmissionLocator.batch,
      admissionType: major.parentAdmissionLocator.admissionType ?? '统招',
      institutionName: major.parentAdmissionLocator.institutionName,
      institutionCode: major.parentAdmissionLocator.institutionCode ?? null,
      granularity: major.parentAdmissionLocator.granularity ?? 'institution',
      programVariant: null,
      campusName: null,
      groupCode: major.parentAdmissionLocator.groupCode ?? null,
    });
    const located = locatedAdmissionsByIdentity.get(locatorIdentityKey);

    return {
      major,
      parentAdmission: located
        ? {
            id: located.id,
            recordIdentityKey: located.recordIdentityKey ?? locatorIdentityKey,
          }
        : null,
    };
  });
  const syntheticPrepared: Array<{ major: NormalizedMajorRecord; parentAdmission: { id: number; recordIdentityKey: string } | null }> = preparedMajors.map((item) => item);
  const syntheticParentBatch: Array<{ parentIdentityKey: string }> = [];
  const pendingSyntheticParents: Array<{
    identityKey: string;
    examCategory: string;
    year: number;
    province: string;
    subjectGroup: string;
    batch: string;
    institutionId: number;
    institutionCode?: string;
    rawInstitutionName: string;
    admissionType: string;
    sourceUrl: string;
  }> = [];

  // 为无父 admission 的 school majors 收集 synthetic parent（先收集，后 batch create）
  for (const { major, parentAdmission } of preparedMajors) {
    if (parentAdmission || !major.parentAdmissionLocator) continue;

    const locatorIdentityKey = buildAdmissionIdentityKey({
      examCategory: major.parentAdmissionLocator.examCategory,
      year: major.parentAdmissionLocator.year,
      province: major.parentAdmissionLocator.province,
      subjectGroup: major.parentAdmissionLocator.subjectGroup,
      batch: major.parentAdmissionLocator.batch,
      admissionType: major.parentAdmissionLocator.admissionType ?? '统招',
      institutionName: major.parentAdmissionLocator.institutionName,
      institutionCode: major.parentAdmissionLocator.institutionCode ?? null,
      granularity: major.parentAdmissionLocator.granularity ?? 'institution',
      programVariant: null,
      campusName: null,
      groupCode: major.parentAdmissionLocator.groupCode ?? null,
    });

    if (syntheticParentBatch.find((s) => s.parentIdentityKey === locatorIdentityKey)) continue;

    // match/create institution
    const institutionKey = `${major.parentAdmissionLocator.institutionCode ?? ''}::${major.parentAdmissionLocator.institutionName}`;
    let institutionResult = institutionCache.get(institutionKey);

    if (!institutionResult) {
      const matched = await matchInstitution({
        institutionCode: major.parentAdmissionLocator.institutionCode ?? undefined,
        rawInstitutionName: major.parentAdmissionLocator.institutionName,
      });

      if (matched.institutionId) {
        institutionResult = matched;
      } else {
        const created = await prisma.institution.create({
          data: {
            name: major.parentAdmissionLocator.institutionName,
            normalizedName: major.parentAdmissionLocator.institutionName,
            code: major.parentAdmissionLocator.institutionCode ?? undefined,
            category: '普通本科',
            province: major.parentAdmissionLocator.province,
            website: null,
          },
          select: { id: true, code: true, name: true },
        });

        await prisma.institutionAlias.upsert({
          where: { institutionId_aliasName: { institutionId: created.id, aliasName: major.parentAdmissionLocator.institutionName } },
          update: { normalizedAlias: major.parentAdmissionLocator.institutionName },
          create: { institutionId: created.id, aliasName: major.parentAdmissionLocator.institutionName, normalizedAlias: major.parentAdmissionLocator.institutionName, sourceName: '官方导入', sourceUrl: major.sourceUrl },
        });

        institutionResult = { institutionId: created.id, institutionCode: created.code, matchedName: created.name };
      }

      institutionCache.set(institutionKey, institutionResult);
    }

    syntheticParentBatch.push({ parentIdentityKey: locatorIdentityKey });
    pendingSyntheticParents.push({
      identityKey: locatorIdentityKey,
      examCategory: major.parentAdmissionLocator.examCategory,
      year: major.parentAdmissionLocator.year,
      province: major.parentAdmissionLocator.province,
      subjectGroup: major.parentAdmissionLocator.subjectGroup,
      batch: major.parentAdmissionLocator.batch,
      institutionId: institutionResult.institutionId,
      institutionCode: major.parentAdmissionLocator.institutionCode ?? undefined,
      rawInstitutionName: major.parentAdmissionLocator.institutionName,
      admissionType: major.parentAdmissionLocator.admissionType ?? '统招',
      sourceUrl: major.sourceUrl,
    });
  }

  // Batch create synthetic parents
  if (pendingSyntheticParents.length > 0) {
    const { count } = await prisma.admissionRecord.createMany({
      data: pendingSyntheticParents.map((sp) => ({
        recordIdentityKey: sp.identityKey,
        isSyntheticParent: true,
        examCategory: sp.examCategory,
        year: sp.year,
        province: sp.province,
        subjectGroup: sp.subjectGroup,
        batch: sp.batch,
        institutionId: sp.institutionId,
        institutionCode: sp.institutionCode,
        rawInstitutionName: sp.rawInstitutionName,
        minScore: 0,
        granularity: 'institution',
        admissionType: sp.admissionType,
        rawRowHash: '',
        sourceUrl: sp.sourceUrl,
      })),
      skipDuplicates: true,
    });
    counters.syntheticParentsCreated = (counters.syntheticParentsCreated ?? 0) + count;
  }

  // 批量查出刚创建的 synthetic parent records
  const syntheticIdentityKeys = pendingSyntheticParents.map((sp) => sp.identityKey);
  if (syntheticIdentityKeys.length > 0) {
    for (const chunk of chunkArray(syntheticIdentityKeys, 500)) {
      const created = await prisma.admissionRecord.findMany({
        where: { recordIdentityKey: { in: chunk } },
        select: { id: true, recordIdentityKey: true },
      });
      for (const rec of created) {
        if (rec.recordIdentityKey) {
          locatedAdmissionsByIdentity.set(rec.recordIdentityKey, rec);
        }
      }
    }
  }

  // 回填 syntheticPrepared（为每个之前无父的 major 挂上 batch-created parent）
  for (const { major, parentAdmission } of preparedMajors) {
    if (parentAdmission || !major.parentAdmissionLocator) continue;

    const locatorIdentityKey = buildAdmissionIdentityKey({
      examCategory: major.parentAdmissionLocator.examCategory,
      year: major.parentAdmissionLocator.year,
      province: major.parentAdmissionLocator.province,
      subjectGroup: major.parentAdmissionLocator.subjectGroup,
      batch: major.parentAdmissionLocator.batch,
      admissionType: major.parentAdmissionLocator.admissionType ?? '统招',
      institutionName: major.parentAdmissionLocator.institutionName,
      institutionCode: major.parentAdmissionLocator.institutionCode ?? null,
      granularity: major.parentAdmissionLocator.granularity ?? 'institution',
      programVariant: null,
      campusName: null,
      groupCode: major.parentAdmissionLocator.groupCode ?? null,
    });

    const existingParent = locatedAdmissionsByIdentity.get(locatorIdentityKey);
    syntheticPrepared.push({
      major,
      parentAdmission: existingParent ? { id: existingParent.id, recordIdentityKey: locatorIdentityKey } : null,
    });
  }

  const majorIdentityKeys = syntheticPrepared
    .filter((item) => item.parentAdmission)
    .map((item) => resolveMajorIdentity(item.major, item.parentAdmission!.recordIdentityKey));
  const existingMajorsByIdentity = new Map<string, { id: number }>();
  const newMajorPayloads: Array<Record<string, unknown>> = [];
  const updateOps: Array<{ id: number; data: Record<string, unknown> }> = [];

  for (const chunk of chunkArray(majorIdentityKeys, 500)) {
    const existing = await prisma.majorRecord.findMany({
      where: {
        majorIdentityKey: {
          in: chunk,
        },
      },
      select: { id: true, majorIdentityKey: true },
    });
    for (const item of existing) {
      if (item.majorIdentityKey) {
        existingMajorsByIdentity.set(item.majorIdentityKey, { id: item.id });
      }
    }
  }

  for (const { major, parentAdmission } of syntheticPrepared) {

    if (!parentAdmission) {
      counters.skipped += 1;
      counters.unresolvedInstitutions.push({
        rawInstitutionName: `未命中父 admission：${major.majorName}`,
        sourceUrl: major.sourceUrl,
      });
      continue;
    }

    const majorIdentityKey = resolveMajorIdentity(major, parentAdmission.recordIdentityKey);
    const existingMajor = existingMajorsByIdentity.get(majorIdentityKey) ?? null;

    const majorPayload = {
      examCategory: major.examCategory ?? 'gaokao',
      majorIdentityKey,
      sourceLevel: major.parentAdmissionLocator ? 'school-official' : null,
      admissionRecordId: parentAdmission.id,
      sourceDocumentId: params.sourceDocumentId ?? null,
      majorName: major.majorName,
      majorCode: major.majorCode ?? undefined,
      majorRequirement: major.majorRequirement ?? undefined,
      minScore: major.minScore,
      avgScore: major.avgScore ?? null,
      maxScore: major.maxScore ?? null,
      minRank: major.minRank ?? null,
      majorMinRank: major.majorMinRank ?? null,
      enrollmentCount: major.enrollmentCount ?? null,
      planCount: major.planCount ?? null,
      sourceUrl: major.sourceUrl,
      rawRowHash: major.rawRowHash,
      granularity: major.granularity,
    };

    if (existingMajor) {
      updateOps.push({ id: existingMajor.id, data: majorPayload });
      counters.updatedMajors += 1;
      counters.dedupedMajors = (counters.dedupedMajors ?? 0) + 1;
      if (major.parentAdmissionLocator) {
        counters.supplementedMajors = (counters.supplementedMajors ?? 0) + 1;
      }
    } else {
      newMajorPayloads.push(majorPayload);
      counters.importedMajors += 1;
      existingMajorsByIdentity.set(majorIdentityKey, { id: 0 }); // placeholder
      if (major.parentAdmissionLocator) {
        counters.supplementedMajors = (counters.supplementedMajors ?? 0) + 1;
      }
    }
  }

  // Batch create new majors in chunks of 500
  if (newMajorPayloads.length > 0) {
    for (const chunk of chunkArray(newMajorPayloads, 500)) {
      const { count } = await prisma.majorRecord.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      counters.importedMajors = (counters.importedMajors ?? 0) - (chunk.length - count);
    }
  }

  // Batch update existing majors sequentially (Prisma doesn't support batch update)
  for (const op of updateOps) {
    await prisma.majorRecord.update({ where: { id: op.id }, data: op.data });
  }

  return counters;
}

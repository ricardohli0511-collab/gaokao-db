import type { InstitutionMatchResult } from '@/lib/import/types';
import { normalizeInstitutionName, splitInstitutionVariant } from '@/lib/import/normalize';
import { prisma } from '@/lib/prisma';

export async function matchInstitution(params: {
  institutionCode?: string | null;
  rawInstitutionName: string;
}): Promise<InstitutionMatchResult> {
  const { institutionCode, rawInstitutionName } = params;
  const normalizedName = normalizeInstitutionName(rawInstitutionName);
  const { baseName } = splitInstitutionVariant(normalizedName);

  if (institutionCode) {
    const byCode = await prisma.institution.findUnique({
      where: { code: institutionCode },
      select: { id: true, code: true, name: true },
    });

    if (byCode) {
      return {
        institutionId: byCode.id,
        institutionCode: byCode.code,
        matchedName: byCode.name,
      };
    }
  }

  const byAlias = await prisma.institutionAlias.findFirst({
    where: {
      OR: [
        { normalizedAlias: normalizedName },
        { normalizedAlias: baseName },
      ],
    },
    include: {
      institution: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (byAlias?.institution) {
    return {
      institutionId: byAlias.institution.id,
      institutionCode: byAlias.institution.code,
      matchedName: byAlias.institution.name,
    };
  }

  const byName = await prisma.institution.findFirst({
    where: {
      OR: [
        { normalizedName: normalizedName },
        { normalizedName: baseName },
        { name: normalizedName },
        { name: baseName },
      ],
    },
    select: { id: true, code: true, name: true },
  });

  if (byName) {
    return {
      institutionId: byName.id,
      institutionCode: byName.code,
      matchedName: byName.name,
    };
  }

  return {
    institutionId: null,
    institutionCode: institutionCode ?? null,
    matchedName: null,
    unresolvedReason: '未匹配到标准院校',
  };
}

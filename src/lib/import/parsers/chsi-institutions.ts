import { normalizeInstitutionName } from '@/lib/import/normalize';

export interface ChsiInstitutionSeed {
  name: string;
  normalizedName: string;
  category: string;
  province: string;
  website: string | null;
}

export function parseChsiInstitutionLinks(markdown: string): ChsiInstitutionSeed[] {
  const lines = markdown.split('\n');
  const result: ChsiInstitutionSeed[] = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith('#') || cleaned.startsWith('[') === false) continue;

    const linkMatch = cleaned.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (!linkMatch) continue;

    const name = linkMatch[1]?.trim();
    if (!name || /院校查询|院校库|满意度|点击进入/.test(name)) continue;

    result.push({
      name,
      normalizedName: normalizeInstitutionName(name),
      category: '普通本科',
      province: '',
      website: linkMatch[2] ?? null,
    });
  }

  return result;
}

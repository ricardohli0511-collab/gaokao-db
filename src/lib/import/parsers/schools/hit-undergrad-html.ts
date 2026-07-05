import { buildParentAdmissionLocator } from '@/lib/import/identity';
import { createRowHash, normalizeNumberLike } from '@/lib/import/normalize';
import type { NormalizedMajorRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

function normalizeProvince(rawProvince: string): string {
  const trimmed = rawProvince.trim();
  return /省|市|自治区|回族自治区|维吾尔自治区/.test(trimmed) ? trimmed : `${trimmed}`;
}

function mapHitSubjectGroup(category: string): string {
  const normalized = category.replace(/\s+/g, '');
  if (normalized.includes('历史')) return '历史类';
  if (normalized.includes('艺术')) return '艺术类';
  if (normalized.includes('物理')) return '物理类';
  return category.trim() || '物理类';
}

function mapInstitutionName(campus: string): string {
  const normalized = campus.replace(/\s+/g, '');
  if (normalized === '校本部' || !normalized) return '哈尔滨工业大学';
  if (normalized.includes('威海')) return '哈尔滨工业大学(威海)';
  if (normalized.includes('深圳')) return '哈尔滨工业大学(深圳)';
  return `哈尔滨工业大学(${campus.trim()})`;
}

export function parseHitUndergradHtml(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const html = String(rows[0]?.rawFields?.html ?? '');
  const headingMatch = html.match(/(\d{4})\s*([^\s<]+)\s*(?:<\/h\d>|<table|$)/i);
  const filterInfoMatch = html.match(/id="filter-info"[^>]*data-province="([^"]+)"[^>]*data-year="([^"]+)"/i);
  const year = Number.parseInt(headingMatch?.[1] ?? filterInfoMatch?.[2] ?? String(source.year), 10);
  const province = normalizeProvince(headingMatch?.[2] ?? filterInfoMatch?.[1] ?? '全国');
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const majors: NormalizedMajorRecord[] = [];

  for (const tr of rowMatches) {
    const cells = Array.from(tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
      .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (cells.length < 6 || cells[0] === '校区' || cells[1]?.startsWith('录取分数')) {
      continue;
    }

    const campus = cells[0] ?? '';
    const majorName = cells[1] ?? '';
    const category = cells[2] ?? '';
    const minScore = normalizeNumberLike(cells[5]);

    if (!majorName || minScore === null) {
      continue;
    }

    const subjectGroup = mapHitSubjectGroup(category);
    const institutionName = mapInstitutionName(campus);
    const locator = buildParentAdmissionLocator({
      examCategory: 'gaokao',
      year: Number.isFinite(year) ? year : source.year,
      province,
      subjectGroup,
      batch: '本科批',
      institutionName,
      institutionCode: null,
      admissionType: '统招',
      granularity: 'institution',
      groupCode: null,
    });
    const parentAdmissionRowHash = createRowHash([
      source.schoolKey,
      locator.year,
      locator.province,
      locator.subjectGroup,
      locator.institutionName,
      'institution',
    ]);

    majors.push({
      examCategory: 'gaokao',
      granularity: 'major',
      province,
      year: Number.isFinite(year) ? year : source.year,
      parentAdmissionRowHash,
      parentAdmissionLocator: locator,
      majorName,
      majorCode: null,
      minScore,
      maxScore: normalizeNumberLike(cells[3]),
      avgScore: normalizeNumberLike(cells[4]),
      sourceUrl: source.officialUrl,
      rawRowHash: createRowHash([parentAdmissionRowHash, majorName, category, minScore]),
    });
  }

  return {
    source,
    admissions: [],
    majors,
    issues: rows.length === 0 ? ['未读取到哈尔滨工业大学分数页静态内容'] : [],
    gaps: majors.length === 0 ? ['school_adapter_pending'] : [],
    verificationNotes: rows.length > 0 ? ['school_static_table_detected'] : [],
  };
}

import { createRowHash } from '@/lib/import/normalize';
import type { NormalizedMajorRecord, ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

export function parseBitUndergradHtml(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const html = String(rows[0]?.rawFields?.html ?? '');
  const htmlKind = String(rows[0]?.rawFields?.htmlKind ?? '');

  // 如果在 fetch 阶段已成功枚举筛选组合并合成完整数据
  const isFetched = html.includes('data-ajax-fetched="true"');

  if (isFetched) {
    const trMatches = html.match(/<tr\s+data-ajax-/gi);
    if (!trMatches || trMatches.length === 0) {
      return {
        source,
        admissions: [],
        majors: [],
        issues: [],
        gaps: ['school_adapter_pending'],
        verificationNotes: ['school_ajax_fetch_no_rows'],
      };
    }

    const majors: NormalizedMajorRecord[] = [];
    const rowRegex = /<tr\s+data-ajax-nf="([^"]*)"\s+data-ajax-ssmc="([^"]*)"><td>(.*?)<\/td><\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const [, yearStr, province, cellsText] = match;
      const cells = cellsText.split('</td><td>');
      const majorName = cells[5] ?? '';
      const minScoreStr = cells[6] ?? '';
      const minScore = Number.parseInt(minScoreStr, 10);
      if (!majorName || Number.isNaN(minScore)) continue;

      const year = Number.parseInt(yearStr, 10);
      const parentLocator = {
        examCategory: 'gaokao' as const,
        year,
        province: cells[1] ?? province,
        subjectGroup: cells[2] || undefined,
        batch: '本科批' as const,
        admissionType: '统招' as const,
        institutionName: '北京理工大学',
        institutionCode: null as string | null,
        granularity: 'institution' as const,
        campusName: cells[4] || undefined,
        groupCode: null as string | null,
      };

      majors.push({
        examCategory: 'gaokao',
        granularity: 'major',
        majorName,
        majorCode: null,
        minScore,
        majorMinRank: null,
        parentAdmissionRowHash: '',
        parentAdmissionLocator: parentLocator,
        sourceUrl: source.officialUrl,
        rawRowHash: '',
      });
    }

    return {
      source,
      admissions: [],
      majors,
      issues: [],
      gaps: majors.length === 0 ? ['school_adapter_pending'] : [],
      verificationNotes: ['school_ajax_fully_fetched'],
    };
  }

  const hasEmptyState = html.includes('没有找到匹配的记录');
  const hasFilterHooks = html.includes('f/ajax_lnfs') || html.includes('filterCache_copy.js') || html.includes('data-param="');

  return {
    source,
    admissions: [],
    majors: [],
    issues: rows[0] ? [] : ['未读取到北京理工大学官网静态页面内容'],
    gaps: htmlKind === 'home-shell'
      ? ['school_page_home_shell_fallback', 'school_page_filter_enumeration_unverified']
      : hasEmptyState
        ? ['school_page_default_state_incomplete', 'school_page_filter_enumeration_unverified']
        : hasFilterHooks
          ? ['school_page_filter_enumeration_unverified']
        : ['school_adapter_pending'],
    verificationNotes: rows[0]
      ? [`captured_html_snapshot:${createRowHash([source.officialUrl, rows[0].rawText.slice(0, 80)])}`]
      : [],
  };
}

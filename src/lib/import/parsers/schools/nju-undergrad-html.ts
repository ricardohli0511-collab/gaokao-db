import { createRowHash } from '@/lib/import/normalize';
import type { ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

export function parseNjuUndergradHtml(
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
): ParsedSourceDocument {
  const html = String(rows[0]?.rawFields?.html ?? '');
  const hasSingleVisibleRow = /<tr>\s*<td>\s*2025\s*<\/td>\s*<td>\s*江苏\s*<\/td>/i.test(html);

  return {
    source,
    admissions: [],
    majors: [],
    issues: rows.length === 0 ? ['未读取到南京大学分数页静态内容'] : [],
    gaps: hasSingleVisibleRow
      ? ['school_page_filter_enumeration_unverified']
      : ['school_adapter_pending'],
    verificationNotes: rows.length > 0
      ? [`captured_html_snapshot:${createRowHash([source.officialUrl, html.slice(0, 120)])}`]
      : [],
  };
}

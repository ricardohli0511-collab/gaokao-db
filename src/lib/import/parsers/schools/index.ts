import type { ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';
import { parseBitUndergradHtml } from './bit-undergrad-html';
import { parseHitUndergradHtml } from './hit-undergrad-html';
import { parseNjuUndergradHtml } from './nju-undergrad-html';

export type SchoolAdapterHandler = (
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
) => ParsedSourceDocument;

const SCHOOL_ADAPTER_REGISTRY: Record<string, SchoolAdapterHandler> = {
  'bit-undergrad-html': parseBitUndergradHtml,
  'hit-undergrad-html': parseHitUndergradHtml,
  'nju-undergrad-html': parseNjuUndergradHtml,
};

export function getSchoolAdapterByKey(adapterKey: string): SchoolAdapterHandler {
  const adapter = SCHOOL_ADAPTER_REGISTRY[adapterKey];
  if (!adapter) {
    throw new Error(`未注册的学校适配器: ${adapterKey}`);
  }

  return adapter;
}

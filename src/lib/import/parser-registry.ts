import type { ParsedSourceDocument, RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';
import { parseGuangdongRows } from '@/lib/import/parsers/guangdong';
import { parseJiangsuRows } from '@/lib/import/parsers/jiangsu';
import { parseZhejiangRows } from '@/lib/import/parsers/zhejiang';
import { parseShandongRows } from '@/lib/import/parsers/shandong';
import { parseHebeiRows } from '@/lib/import/parsers/hebei';
import { parseLiaoningRows } from '@/lib/import/parsers/liaoning';
import { parseHunanRows } from '@/lib/import/parsers/hunan';
import { parseGuizhouRows } from '@/lib/import/parsers/guizhou';
import { parseShaanxiRows } from '@/lib/import/parsers/shaanxi';
import { getSchoolAdapterByKey } from '@/lib/import/parsers/schools';

export type ParserHandler = (
  source: SourceRegistryEntry,
  rows: RawSourceRow[]
) => ParsedSourceDocument;

const PARSER_REGISTRY: Record<string, ParserHandler> = {
  guangdong: parseGuangdongRows,
  jiangsu: parseJiangsuRows,
  zhejiang: parseZhejiangRows,
  shandong: parseShandongRows,
  hebei: parseHebeiRows,
  guizhou: parseGuizhouRows,
  shaanxi: parseShaanxiRows,
  liaoning: parseLiaoningRows,
  hunan: parseHunanRows,
};

export function getParserByKey(parserKey: string): ParserHandler {
  const parser = PARSER_REGISTRY[parserKey];
  if (parser) {
    return parser;
  }

  if (parserKey.includes('undergrad') || parserKey.includes('school') || parserKey.includes('html')) {
    return getSchoolAdapterByKey(parserKey);
  }
  throw new Error(`未注册的 parserKey: ${parserKey}`);
}

export function listParserKeys(): string[] {
  return [...Object.keys(PARSER_REGISTRY), 'bit-undergrad-html', 'hit-undergrad-html', 'nju-undergrad-html'];
}

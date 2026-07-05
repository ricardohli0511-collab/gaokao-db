import test from 'node:test';
import assert from 'node:assert/strict';

import { parseShaanxiRows } from './shaanxi';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
  sourceId: 'shaanxi:2024:physics',
  province: '陕西',
  year: 2024,
  title: '2024年陕西省普通高校招生本科一批录取正式投档信息（理工）',
  officialUrl: 'https://www.sneac.com/htm/2024/1BZS-LG.html',
  sourceType: 'html',
  granularity: 'institution',
  examCategory: 'gaokao',
  sourceScope: 'ingest',
  sourceLevel: 'province-official',
  family: 'province-institution-html',
  expectedGranularity: 'institution',
  gapPolicy: 'institution_only_waiting_school_majors',
  parserKey: 'shaanxi',
  parserVersion: '1',
  subjectGroup: '物理类',
  batch: '本科批',
};

test('parseShaanxiRows 只输出 admission 并保留父记录型 gap', () => {
  const rows: RawSourceRow[] = [
    {
      province: '陕西',
      year: 2024,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'html',
      parserKey: 'shaanxi',
      parserVersion: '1',
      rawText: '1001 北京大学 702',
      rawFields: {
        院校代码: '1001',
        院校名称: '北京大学',
        投档最低分: '702',
      },
    },
  ];

  const parsed = parseShaanxiRows(source, rows);
  assert.equal(parsed.admissions.length, 1);
  assert.equal(parsed.majors.length, 0);
  assert.equal(parsed.gaps.includes('institution_only_waiting_school_majors'), true);
});

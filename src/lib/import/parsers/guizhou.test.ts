import test from 'node:test';
import assert from 'node:assert/strict';

import { parseGuizhouRows } from './guizhou';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
  sourceId: 'guizhou:2025:physics',
  province: '贵州',
  year: 2025,
  title: '贵州省2025年高考本科批第2次征集志愿投档情况（首选科目物理）',
  officialUrl: 'http://zsksy.guizhou.gov.cn/ygpt/tdqk/202507/P020250728609925730354.pdf',
  sourceType: 'pdf',
  granularity: 'major',
  examCategory: 'gaokao',
  sourceScope: 'ingest',
  sourceLevel: 'province-official',
  family: 'province-major-pdf',
  expectedGranularity: 'major',
  parserKey: 'guizhou',
  parserVersion: '1',
  subjectGroup: '物理类',
  batch: '本科批',
};

test('parseGuizhouRows 能从专业级 PDF 行中生成 admission 与 majors', () => {
  const rows: RawSourceRow[] = [
    {
      province: '贵州',
      year: 2025,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'pdf',
      parserKey: 'guizhou',
      parserVersion: '1',
      rawText: '0319 重庆城市科技学院 502 大数据管理与应用 一般统考生 1 1 473 73929',
      rawFields: {
        院校代码: '0319',
        院校名称: '重庆城市科技学院',
        专业代码: '502',
        专业名称: '大数据管理与应用',
        招考类型: '一般统考生',
        计划数: '1',
        投档人数: '1',
        投档最低分: '473',
        投档最低位次: '73929',
      },
    },
  ];

  const parsed = parseGuizhouRows(source, rows);
  assert.equal(parsed.admissions.length, 1);
  assert.equal(parsed.majors.length, 1);
  assert.equal(parsed.majors[0].majorName, '大数据管理与应用');
  assert.equal(parsed.majors[0].majorMinRank, 73929);
});

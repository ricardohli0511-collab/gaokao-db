import test from 'node:test';
import assert from 'node:assert/strict';

import { parseHebeiRows } from './hebei';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
  sourceId: 'hebei:2025:physics',
  province: '河北',
  year: 2025,
  title: '2025年河北省普通高校招生本科批-物理科目组合平行志愿投档情况统计',
  officialUrl: 'https://file.hebeea.edu.cn/files/article/2025/07/20250722201758_787.xlsx',
  sourceType: 'xlsx',
  granularity: 'major',
  examCategory: 'gaokao',
  sourceScope: 'ingest',
  sourceLevel: 'province-official',
  family: 'province-major-xls',
  expectedGranularity: 'major',
  parserKey: 'hebei',
  parserVersion: '1',
  subjectGroup: '物理科目组合',
  batch: '本科批',
};

test('parseHebeiRows 能从本科批专业级行中生成 admission 与 majors', () => {
  const rows: RawSourceRow[] = [
    {
      province: '河北',
      year: 2025,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'xlsx',
      parserKey: 'hebei',
      parserVersion: '1',
      rawText: '1001 北京大学 01 理科试验班 682 1',
      rawFields: {
        院校代号: '1001',
        院校名称: '北京大学',
        专业代号: '01',
        专业名称: '理科试验班',
        投档最低分: '682',
        志愿号: '1',
      },
    },
    {
      province: '河北',
      year: 2025,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'xlsx',
      parserKey: 'hebei',
      parserVersion: '1',
      rawText: '1001 北京大学 02 工商管理类 679 2',
      rawFields: {
        院校代号: '1001',
        院校名称: '北京大学',
        专业代号: '02',
        专业名称: '工商管理类',
        投档最低分: '679',
        志愿号: '2',
      },
    },
  ];

  const parsed = parseHebeiRows(source, rows);
  assert.equal(parsed.admissions.length, 1);
  assert.equal(parsed.majors.length, 2);
  assert.equal(parsed.admissions[0].institutionName, '北京大学');
  assert.equal(parsed.majors[0].majorCode, '01');
  assert.equal(parsed.majors[0].parentAdmissionRowHash, parsed.admissions[0].rawRowHash);
  assert.equal(parsed.majors[1].minScore, 679);
});

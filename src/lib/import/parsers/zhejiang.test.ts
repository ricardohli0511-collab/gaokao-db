import test from 'node:test';
import assert from 'node:assert/strict';

import { parseZhejiangRows } from './zhejiang';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
  province: '浙江',
  year: 2025,
  title: '浙江省2025年普通高校招生普通类第一段平行投档分数线表',
  officialUrl: 'https://www.zjzs.net/attach/0/8d8d48bdfabe4347b73ccc6009f328e4.xls',
  sourceType: 'xls',
  granularity: 'major',
  parserKey: 'zhejiang',
  parserVersion: '1',
  subjectGroup: '综合',
  batch: '本科批',
};

test('parseZhejiangRows 能生成 admission 与 major 的父子关系', () => {
  const rows: RawSourceRow[] = [
    {
      province: '浙江',
      year: 2025,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'xls',
      parserKey: 'zhejiang',
      parserVersion: '1',
      rawText: '0301 法学 10335 浙江大学 664 1234',
      rawFields: {
        专业代号及名称: '0301 法学',
        院校代号及名称: '10335 浙江大学',
        投档分: '664',
        位次: '1234',
      },
    },
  ];

  const parsed = parseZhejiangRows(source, rows);
  assert.equal(parsed.admissions.length, 1);
  assert.equal(parsed.majors.length, 1);
  assert.equal(parsed.majors[0].parentAdmissionRowHash, parsed.admissions[0].rawRowHash);
  assert.equal(parsed.majors[0].majorName, '法学');
});

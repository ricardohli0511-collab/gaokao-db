import test from 'node:test';
import assert from 'node:assert/strict';

import { parseHunanRows } from './hunan';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
  province: '湖南',
  year: 2025,
  title: '湖南省2025年普通高校招生本科提前批采用平行志愿的其他类院校第一次投档分数线(普通类)',
  officialUrl: 'https://www.hneeb.cn/hnxxg/741/742/2025070903pt.xlsx',
  sourceType: 'xlsx',
  granularity: 'group',
  parserKey: 'hunan',
  parserVersion: '1',
  subjectGroup: '普通类',
  batch: '提前批',
};

test('parseHunanRows 能把院校专业组表转成 group admission 记录', () => {
  const rows: RawSourceRow[] = [
    {
      province: '湖南',
      year: 2025,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'xlsx',
      parserKey: 'hunan',
      parserVersion: '1',
      rawText: '1101 北京大学 A51 第A51组(其他院校) 661',
      rawFields: {
        计划类别: '采用平行志愿的其他院校',
        科类: '普通类(首选历史)',
        院校代号: '1101',
        院校名称: '北京大学',
        专业组编号: 'A51',
        专业组名称: '第A51组(其他院校)',
        投档线: '661',
        备注: '要求英语语种',
      },
    },
  ];

  const parsed = parseHunanRows(source, rows);
  assert.equal(parsed.admissions.length, 1);
  assert.equal(parsed.admissions[0].granularity, 'group');
  assert.equal(parsed.admissions[0].groupCode, 'A51');
  assert.equal(parsed.admissions[0].groupName, '第A51组(其他院校)');
  assert.equal(parsed.admissions[0].subjectGroup, '历史类');
});

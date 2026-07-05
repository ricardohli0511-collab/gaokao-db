import test from 'node:test';
import assert from 'node:assert/strict';

import { parseShandongRows } from './shandong';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
  province: '山东',
  year: 2025,
  title: '山东省2025年普通类常规批第1次志愿投档情况表',
  officialUrl: 'https://www.sdzk.cn/Floadup/file/20250719/6388855130412530367357143.xls',
  sourceType: 'xls',
  granularity: 'major',
  parserKey: 'shandong',
  parserVersion: '1',
  subjectGroup: '综合',
  batch: '本科批',
};

test('parseShandongRows 在只给最低位次时会保留 majorMinRank 并声明 gap', () => {
  const rows: RawSourceRow[] = [
    {
      province: '山东',
      year: 2025,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'xls',
      parserKey: 'shandong',
      parserVersion: '1',
      rawText: '本科 52 城乡规划 A019中国农业大学 1 41446',
      rawFields: {
        层次: '本科',
        专业代号及名称: '52 城乡规划',
        院校代号及名称: 'A019 中国农业大学',
        投档计划数: '1',
        最低位次: '41446',
      },
    },
  ];

  const parsed = parseShandongRows(source, rows);
  assert.equal(parsed.admissions.length, 1);
  assert.equal(parsed.majors.length, 1);
  assert.equal(parsed.majors[0].majorMinRank, 41446);
  assert.equal(parsed.majors[0].minScore, 0);
  assert.equal(parsed.gaps[0], 'rank_only_waiting_score_ladder');
});

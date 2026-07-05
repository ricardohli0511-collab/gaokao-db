import test from 'node:test';
import assert from 'node:assert/strict';

import { parseLiaoningRows } from './liaoning';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
  province: '辽宁',
  year: 2024,
  title: '辽宁省2024年普通高等学校招生录取普通类本科批（物理学科类）投档最低分',
  officialUrl: 'https://www.lnzsks.com/lnzkbfiles/2024/2024gkbktdxsiexieft02l.zip',
  sourceType: 'zip',
  granularity: 'major',
  parserKey: 'liaoning',
  parserVersion: '1',
  subjectGroup: '物理类',
  batch: '本科批',
};

test('parseLiaoningRows 能把专业+学校投档表转成 major 记录', () => {
  const rows: RawSourceRow[] = [
    {
      province: '辽宁',
      year: 2024,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'zip',
      parserKey: 'liaoning',
      parserVersion: '1',
      rawText: '0378 安徽财经大学 01 经济学类 561',
      rawFields: {
        院校编号: '0378',
        招生院校: '安徽财经大学',
        专业编号: '01',
        招生专业: '经济学类(经济学、国民经济管理)',
        投档最低分: '561',
      },
    },
  ];

  const parsed = parseLiaoningRows(source, rows);
  assert.equal(parsed.admissions.length, 1);
  assert.equal(parsed.majors.length, 1);
  assert.equal(parsed.majors[0].majorCode, '01');
  assert.equal(parsed.majors[0].majorName, '经济学类(经济学、国民经济管理)');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNjuUndergradHtml } from './nju-undergrad-html';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

test('NJU adapter 在默认态不全时保留筛选未验证 gap', () => {
  const source: SourceRegistryEntry = {
    sourceId: 'school:nju-undergrad:https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html',
    province: '全国',
    year: 2026,
    title: '南京大学本科招生历年分数页',
    officialUrl: 'https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html',
    sourceType: 'html',
    granularity: 'major',
    examCategory: 'gaokao',
    sourceScope: 'ingest',
    sourceLevel: 'school-official',
    schoolKey: 'nju-undergrad',
    priority: 90,
    status: 'candidate',
    family: 'school-major-html-filtered',
    parserKey: 'nju-undergrad-html',
    parserVersion: '1',
  };

  const rows: RawSourceRow[] = [
    {
      province: '全国',
      year: 2026,
      sourceUrl: source.officialUrl,
      sourceTitle: source.title,
      sourceType: 'html',
      parserKey: 'nju-undergrad-html',
      parserVersion: '1',
      rawText: '年份 省市 科类 类型 最低分 2025 江苏 物理类 普通批次 661',
      rawFields: {
        html: '<table><tr><td>2025</td><td>江苏</td><td>物理类</td><td>普通批次</td><td>661</td></tr></table>',
      },
    },
  ];

  const parsed = parseNjuUndergradHtml(source, rows);
  assert.equal(parsed.majors.length, 0);
  assert.equal(parsed.gaps.includes('school_page_filter_enumeration_unverified'), true);
});

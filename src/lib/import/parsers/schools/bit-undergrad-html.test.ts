import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBitUndergradHtml } from './bit-undergrad-html';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

test('BIT adapter 在默认空表态下输出筛选未验证 gap', () => {
  const source: SourceRegistryEntry = {
    sourceId: 'school:bit-undergrad:https://admission.bit.edu.cn/html/1/m/168/172/index.html',
    province: '全国',
    year: 2026,
    title: '北京理工大学历年分数页',
    officialUrl: 'https://admission.bit.edu.cn/html/1/m/168/172/index.html',
    sourceType: 'html',
    granularity: 'major',
    examCategory: 'gaokao',
    sourceScope: 'ingest',
    sourceLevel: 'school-official',
    schoolKey: 'bit-undergrad',
    priority: 100,
    status: 'candidate',
    family: 'school-major-html-filtered',
    parserKey: 'bit-undergrad-html',
    parserVersion: '1',
  };
  const rows: RawSourceRow[] = [{
    province: '全国',
    year: 2026,
    sourceUrl: source.officialUrl,
    sourceTitle: source.title,
    sourceType: 'html',
    parserKey: 'bit-undergrad-html',
    parserVersion: '1',
    rawText: '<table><tr><td>没有找到匹配的记录</td></tr></table>',
    rawFields: { html: '<table><tr><td>没有找到匹配的记录</td></tr></table>' },
  }];

  const parsed = parseBitUndergradHtml(source, rows);
  assert.equal(parsed.gaps.includes('school_page_default_state_incomplete'), true);
  assert.equal(parsed.gaps.includes('school_page_filter_enumeration_unverified'), true);
});

test('BIT adapter 在抓到首页壳时输出首页回退 gap', () => {
  const source: SourceRegistryEntry = {
    sourceId: 'school:bit-undergrad:https://admission.bit.edu.cn/html/1/m/168/172/index.html:2025',
    province: '全国',
    year: 2025,
    title: '北京理工大学历年分数页',
    officialUrl: 'https://admission.bit.edu.cn/html/1/m/168/172/index.html',
    sourceType: 'html',
    granularity: 'major',
    examCategory: 'gaokao',
    sourceScope: 'ingest',
    sourceLevel: 'school-official',
    schoolKey: 'bit-undergrad',
    priority: 100,
    status: 'candidate',
    family: 'school-major-html-filtered',
    parserKey: 'bit-undergrad-html',
    parserVersion: '1',
  };
  const html = '<html><body><a href="/">首页</a><a href="/html/1/m/168/172/index.html">历年分数</a></body></html>';
  const rows: RawSourceRow[] = [{
    province: '全国',
    year: 2025,
    sourceUrl: source.officialUrl,
    sourceTitle: source.title,
    sourceType: 'html',
    parserKey: 'bit-undergrad-html',
    parserVersion: '1',
    rawText: html,
    rawFields: { html, htmlKind: 'home-shell' },
  }];

  const parsed = parseBitUndergradHtml(source, rows);
  assert.equal(parsed.gaps.includes('school_page_home_shell_fallback'), true);
  assert.equal(parsed.gaps.includes('school_page_filter_enumeration_unverified'), true);
});

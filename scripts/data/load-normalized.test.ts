import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGapSummaryEntry, buildSourceLoadSummaryEntry } from '@/lib/import/load-report-helpers';
import type { ImportCounters, ParsedSourceDocument } from '@/lib/import/types';

test('buildSourceLoadSummaryEntry 会保留学校维度字段与缺口信息', () => {
  const content: ParsedSourceDocument = {
    source: {
      sourceId: 'school:hit-undergrad:https://zsb.hit.edu.cn/information/score:2025',
      province: '全国',
      year: 2025,
      title: '哈尔滨工业大学本科招生官网',
      officialUrl: 'https://zsb.hit.edu.cn/information/score',
      sourceType: 'html',
      granularity: 'major',
      examCategory: 'gaokao',
      sourceScope: 'ingest',
      sourceLevel: 'school-official',
      schoolKey: 'hit-undergrad',
      parserKey: 'hit-undergrad-html',
      parserVersion: '1',
    },
    admissions: [],
    majors: [],
    issues: [],
    gaps: ['school_page_filter_enumeration_unverified'],
    verificationNotes: ['school_static_table_detected'],
  };
  const counters: ImportCounters = {
    importedAdmissions: 0,
    updatedAdmissions: 0,
    importedMajors: 2,
    updatedMajors: 0,
    supplementedMajors: 2,
    dedupedMajors: 0,
    syntheticParentsCreated: 1,
    skipped: 0,
    unresolvedInstitutions: [],
  };

  const summary = buildSourceLoadSummaryEntry('data/normalized/hit.json', content, counters);
  assert.equal(summary.schoolKey, 'hit-undergrad');
  assert.equal(summary.parserKey, 'hit-undergrad-html');
  assert.deepEqual(summary.declaredGaps, ['school_page_filter_enumeration_unverified']);
  assert.deepEqual(summary.verificationNotes, ['school_static_table_detected']);
  assert.equal(summary.gapCount, 1);
});

test('buildGapSummaryEntry 会保留 schoolKey 方便定位学校来源缺口', () => {
  const content: ParsedSourceDocument = {
    source: {
      sourceId: 'school:bit-undergrad:https://admission.bit.edu.cn/html/1/m/168/172/index.html:2025',
      province: '全国',
      year: 2025,
      title: '北京理工大学本科招生官网',
      officialUrl: 'https://admission.bit.edu.cn/html/1/m/168/172/index.html',
      sourceType: 'html',
      granularity: 'major',
      examCategory: 'gaokao',
      sourceScope: 'ingest',
      sourceLevel: 'school-official',
      schoolKey: 'bit-undergrad',
      parserKey: 'bit-undergrad-html',
      parserVersion: '1',
    },
    admissions: [],
    majors: [],
    issues: [],
    gaps: ['school_page_home_shell_fallback'],
    verificationNotes: [],
  };

  const gapEntry = buildGapSummaryEntry('data/normalized/bit.json', content);
  assert.equal(gapEntry.schoolKey, 'bit-undergrad');
  assert.deepEqual(gapEntry.gaps, ['school_page_home_shell_fallback']);
});

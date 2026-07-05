import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCoverageSummaryEntry } from '@/lib/import/load-report-helpers';

test('buildCoverageSummaryEntry 对候选学校源输出 pageMode 与未完成状态', () => {
  const summary = buildCoverageSummaryEntry({
    doc: {
      id: 1,
      province: '全国',
      year: 2025,
      examCategory: 'gaokao',
      sourceLevel: 'school-official',
      sourceScope: 'ingest',
      schoolKey: 'nju-undergrad',
      sourceType: 'html',
      granularity: 'major',
      officialUrl: 'https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html',
      parserKey: 'nju-undergrad-html',
    },
    sourceMeta: null,
    schoolMeta: {
      schoolKey: 'nju-undergrad',
      institutionName: '南京大学',
      adapterKey: 'nju-undergrad-html',
      sourceType: 'html',
      officialUrl: 'https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html',
      priority: 90,
      status: 'candidate',
      pageMode: 'filter-page',
      coverageYears: [2025, 2024, 2023],
      coverageProvinces: ['江苏'],
      crossCheckUrls: [],
    },
    loadMeta: {
      officialUrl: 'https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html',
      sourceId: 'school:nju-undergrad:https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html:2025',
      parserKey: 'nju-undergrad-html',
      schoolKey: 'nju-undergrad',
      supplementedMajors: 0,
      dedupedMajors: 0,
      syntheticParentsCreated: 0,
      importedMajors: 0,
      verificationNotes: ['captured_html_snapshot:abc'],
      declaredGaps: ['school_page_filter_enumeration_unverified'],
      gapCount: 1,
    },
    matchedAdmissions: [],
    majorCount: 0,
  });

  assert.equal(summary.pageMode, 'filter-page');
  assert.equal(summary.schoolGapState, 'school_page_filter_enumeration_unverified');
  assert.equal(summary.schoolSourceCompleted, false);
  assert.deepEqual(summary.coverageYears, [2025, 2024, 2023]);
});

test('buildCoverageSummaryEntry 对已产出 majors 的学校源标记完成', () => {
  const summary = buildCoverageSummaryEntry({
    doc: {
      id: 2,
      province: '全国',
      year: 2025,
      examCategory: 'gaokao',
      sourceLevel: 'school-official',
      sourceScope: 'ingest',
      schoolKey: 'hit-undergrad',
      sourceType: 'html',
      granularity: 'major',
      officialUrl: 'https://zsb.hit.edu.cn/information/score',
      parserKey: 'hit-undergrad-html',
    },
    sourceMeta: null,
    schoolMeta: {
      schoolKey: 'hit-undergrad',
      institutionName: '哈尔滨工业大学',
      adapterKey: 'hit-undergrad-html',
      sourceType: 'html',
      officialUrl: 'https://zsb.hit.edu.cn/information/score',
      priority: 95,
      status: 'candidate',
      pageMode: 'static-table',
      coverageYears: [2025, 2024],
      coverageProvinces: ['河北', '北京'],
      crossCheckUrls: [],
    },
    loadMeta: {
      officialUrl: 'https://zsb.hit.edu.cn/information/score',
      sourceId: 'school:hit-undergrad:https://zsb.hit.edu.cn/information/score:2025',
      parserKey: 'hit-undergrad-html',
      schoolKey: 'hit-undergrad',
      supplementedMajors: 2,
      dedupedMajors: 0,
      syntheticParentsCreated: 1,
      importedMajors: 2,
      verificationNotes: ['school_static_table_detected'],
      declaredGaps: [],
      gapCount: 0,
    },
    matchedAdmissions: [],
    majorCount: 2,
  });

  assert.equal(summary.schoolSourceCompleted, true);
  assert.equal(summary.schoolSupplementCount, 2);
  assert.equal(summary.syntheticParentCount, 1);
  assert.equal(summary.sourceStatus, 'candidate');
});

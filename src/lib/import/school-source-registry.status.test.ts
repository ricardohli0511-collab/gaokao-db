import test from 'node:test';
import assert from 'node:assert/strict';

import { SCHOOL_SOURCE_REGISTRY, getSchoolSourceByKey } from './school-source-registry';

test('学校来源 registry 包含候选与评审态学校并带页面模式', () => {
  const keys = SCHOOL_SOURCE_REGISTRY.map((item) => item.schoolKey).sort();
  assert.deepEqual(keys, ['bit-undergrad', 'hit-undergrad', 'nju-undergrad', 'seu-undergrad']);

  const bit = getSchoolSourceByKey('bit-undergrad');
  const hit = getSchoolSourceByKey('hit-undergrad');
  const nju = getSchoolSourceByKey('nju-undergrad');
  const seu = getSchoolSourceByKey('seu-undergrad');

  assert.equal(bit.status, 'candidate');
  assert.equal(nju.status, 'candidate');
  assert.equal(hit.status, 'candidate');
  assert.equal(seu.status, 'review');
  assert.equal(bit.officialUrl.includes('lnfs') || bit.officialUrl.includes('score') || bit.officialUrl.includes('/172/'), true);
  assert.equal(hit.pageMode, 'static-table');
  assert.equal(seu.pageMode, 'article-list');
  assert.equal(typeof bit.pageMode, 'string');
  assert.equal(typeof nju.pageMode, 'string');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { getSchoolSourceByKey, SCHOOL_SOURCE_REGISTRY } from './school-source-registry';

test('学校官网来源 registry 能返回样板适配器来源', () => {
  assert.equal(SCHOOL_SOURCE_REGISTRY.length > 0, true);
  const source = getSchoolSourceByKey(SCHOOL_SOURCE_REGISTRY[0].schoolKey);
  assert.equal(source.schoolKey, SCHOOL_SOURCE_REGISTRY[0].schoolKey);
  assert.equal(typeof source.adapterKey, 'string');
});

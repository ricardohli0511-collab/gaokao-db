import test from 'node:test';
import assert from 'node:assert/strict';

import { OVERSEAS_EXAM_REGISTRY, getOverseasExamByKey } from './registry';

test('海外考试 registry 至少包含 SAT、ACT、AP、IB、A-Level、DSE', () => {
  const keys = OVERSEAS_EXAM_REGISTRY.map((item) => item.key).sort();
  assert.deepEqual(keys, ['act', 'alevel', 'ap', 'dse', 'ib', 'sat']);
});

test('IB 定义为 points-plus-core 成绩模式', () => {
  const ib = getOverseasExamByKey('ib');
  assert.equal(ib.scoreMode, 'points-plus-core');
  assert.equal(ib.sourceScope, 'research');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { SCHOOL_SOURCE_REGISTRY } from './school-source-registry';
import { getSchoolIngestSources, getSourcesByProvinceYear } from './source-registry';

test('source registry 包含河北 2025 两条官方来源', () => {
  const sources = getSourcesByProvinceYear('河北', 2025);
  assert.equal(sources.length, 2);
  assert.deepEqual(
    sources.map((item) => item.parserKey),
    ['hebei', 'hebei']
  );
});

test('source registry 包含山东 2025 第 2 次志愿来源', () => {
  const shandongSources = getSourcesByProvinceYear('山东', 2025);
  assert.equal(
    shandongSources.some((item) => item.title.includes('第2次志愿') && item.parserKey === 'shandong'),
    true
  );
});

test('学校 ingest source 的 year 与 sourceId 不随 referenceYear 漂移', () => {
  const generatedFromPast = getSchoolIngestSources(2020);
  const generatedFromFuture = getSchoolIngestSources(2030);

  assert.equal(generatedFromPast.length, SCHOOL_SOURCE_REGISTRY.length);
  assert.equal(generatedFromFuture.length, SCHOOL_SOURCE_REGISTRY.length);

  const pastSnapshot = generatedFromPast.map((item) => ({
    schoolKey: item.schoolKey,
    year: item.year,
    sourceId: item.sourceId,
  }));
  const futureSnapshot = generatedFromFuture.map((item) => ({
    schoolKey: item.schoolKey,
    year: item.year,
    sourceId: item.sourceId,
  }));

  assert.deepEqual(pastSnapshot, futureSnapshot);

  for (const item of generatedFromPast) {
    const registryItem = SCHOOL_SOURCE_REGISTRY.find((entry) => entry.schoolKey === item.schoolKey);
    assert.ok(registryItem);
    assert.equal(item.year, Math.max(...registryItem.coverageYears));
    assert.equal(item.sourceId, `school:${item.schoolKey}:${item.officialUrl}:${Math.max(...registryItem.coverageYears)}`);
  }
});

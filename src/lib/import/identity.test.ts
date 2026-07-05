import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdmissionIdentityKey,
  buildMajorIdentityKey,
  buildParentAdmissionLocator,
} from './identity';

test('buildAdmissionIdentityKey 不受行号变化影响', () => {
  const first = buildAdmissionIdentityKey({
    examCategory: 'gaokao',
    year: 2025,
    province: '浙江',
    subjectGroup: '综合',
    batch: '本科批',
    admissionType: '统招',
    institutionName: '浙江大学',
    institutionCode: '0001',
    granularity: 'institution',
    programVariant: null,
    campusName: null,
    groupCode: null,
  });

  const second = buildAdmissionIdentityKey({
    examCategory: 'gaokao',
    year: 2025,
    province: '浙江',
    subjectGroup: '综合',
    batch: '本科批',
    admissionType: '统招',
    institutionName: '浙江大学',
    institutionCode: '0001',
    granularity: 'institution',
    programVariant: null,
    campusName: null,
    groupCode: null,
  });

  assert.equal(first, second);
});

test('buildMajorIdentityKey 对同一 admission 下同名同代码专业稳定', () => {
  const majorIdentity = buildMajorIdentityKey({
    admissionIdentityKey: 'admission-key',
    majorName: '计算机科学与技术',
    majorCode: '080901',
    examCategory: 'gaokao',
  });

  assert.equal(
    majorIdentity,
    buildMajorIdentityKey({
      admissionIdentityKey: 'admission-key',
      majorName: '计算机科学与技术',
      majorCode: '080901',
      examCategory: 'gaokao',
    })
  );
});

test('buildParentAdmissionLocator 能生成学校官网补专业所需定位信息', () => {
  const locator = buildParentAdmissionLocator({
    examCategory: 'gaokao',
    year: 2025,
    province: '浙江',
    subjectGroup: '综合',
    batch: '本科批',
    institutionName: '浙江大学',
    institutionCode: '0001',
  });

  assert.equal(locator.province, '浙江');
  assert.equal(locator.institutionCode, '0001');
});

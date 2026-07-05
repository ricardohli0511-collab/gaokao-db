import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeInstitutionName,
  splitInstitutionVariant,
  normalizeNumberLike,
  mapBatchLabel,
  mapSubjectGroup,
} from './normalize';
import { parseJiangsuGroupText } from './parsers/jiangsu';

test('normalizeInstitutionName 会去除空白和全角括号差异', () => {
  assert.equal(
    normalizeInstitutionName(' 南京中医药大学（中外合作办学） '),
    '南京中医药大学(中外合作办学)'
  );
});

test('splitInstitutionVariant 会拆出标准院校、项目变体和校区', () => {
  assert.deepEqual(
    splitInstitutionVariant('南京中医药大学(中外合作办学)(泰州校区)'),
    {
      baseName: '南京中医药大学',
      programVariant: '中外合作办学',
      campusName: '泰州校区',
    }
  );
});

test('normalizeNumberLike 会清洗千分位和空字符串', () => {
  assert.equal(normalizeNumberLike('13,967'), 13967);
  assert.equal(normalizeNumberLike(''), null);
  assert.equal(normalizeNumberLike(undefined), null);
});

test('mapBatchLabel 和 mapSubjectGroup 会统一常见官方口径', () => {
  assert.equal(mapBatchLabel('普通类本科批次'), '本科批');
  assert.equal(mapSubjectGroup('普通类(物理)'), '物理类');
  assert.equal(mapSubjectGroup('历史等科目类'), '历史类');
});

test('parseJiangsuGroupText 会拆出院校代码、专业组和再选要求', () => {
  assert.deepEqual(
    parseJiangsuGroupText('1108 南京师范大学36专业组(地理)'),
    {
      institutionCode: '1108',
      rawInstitutionName: '南京师范大学',
      groupCode: '36',
      groupRequirement: '地理',
      programVariant: null,
      campusName: null,
    }
  );
});

test('parseJiangsuGroupText 会保留中外合作和校区信息', () => {
  assert.deepEqual(
    parseJiangsuGroupText('1113 南京中医药大学18专业组(不限)(中外合作办学)(泰州校区)'),
    {
      institutionCode: '1113',
      rawInstitutionName: '南京中医药大学',
      groupCode: '18',
      groupRequirement: '不限',
      programVariant: '中外合作办学',
      campusName: '泰州校区',
    }
  );
});

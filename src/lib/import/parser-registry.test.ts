import test from 'node:test';
import assert from 'node:assert/strict';

import { getParserByKey } from './parser-registry';

test('getParserByKey 能返回浙江、山东和河北 parser', () => {
  assert.equal(typeof getParserByKey('zhejiang'), 'function');
  assert.equal(typeof getParserByKey('shandong'), 'function');
  assert.equal(typeof getParserByKey('hebei'), 'function');
});

test('getParserByKey 遇到未知 parserKey 会抛错', () => {
  assert.throws(() => getParserByKey('unknown-parser'));
});

test('getParserByKey 能返回学校官网 adapter', () => {
  assert.equal(typeof getParserByKey('bit-undergrad-html'), 'function');
});

test('getParserByKey 能返回贵州、陕西、南大与哈工大学校 adapter', () => {
  assert.equal(typeof getParserByKey('guizhou'), 'function');
  assert.equal(typeof getParserByKey('shaanxi'), 'function');
  assert.equal(typeof getParserByKey('nju-undergrad-html'), 'function');
  assert.equal(typeof getParserByKey('hit-undergrad-html'), 'function');
});

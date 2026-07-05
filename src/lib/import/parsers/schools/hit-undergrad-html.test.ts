import test from 'node:test';
import assert from 'node:assert/strict';

import { parseHitUndergradHtml } from './hit-undergrad-html';
import type { RawSourceRow, SourceRegistryEntry } from '@/lib/import/types';

const source: SourceRegistryEntry = {
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
  priority: 95,
  status: 'candidate',
  family: 'school-major-html-static',
  parserKey: 'hit-undergrad-html',
  parserVersion: '1',
};

test('parseHitUndergradHtml 能从静态表格中生成 majors 并附带 parentAdmissionLocator', () => {
  const html = `
    <h2>2025 河北</h2>
    <table>
      <tr><th>校区</th><th>专业</th><th>类别</th><th>最高分</th><th>平均分</th><th>最低分</th></tr>
      <tr><td>校本部</td><td>工科试验班（尖班）</td><td>物理+化学</td><td>681</td><td>681</td><td>681</td></tr>
      <tr><td>校本部</td><td>录取分数（物理类）</td><td>物理+化学</td><td>681</td><td>675.2</td><td>673</td></tr>
      <tr><td>校本部</td><td>经济管理试验班</td><td>历史</td><td>645</td><td>638.6</td><td>637</td></tr>
    </table>
  `;
  const rows: RawSourceRow[] = [{
    province: '全国',
    year: 2025,
    sourceUrl: source.officialUrl,
    sourceTitle: source.title,
    sourceType: 'html',
    parserKey: 'hit-undergrad-html',
    parserVersion: '1',
    rawText: html.replace(/\s+/g, ' ').trim(),
    rawFields: { html },
  }];

  const parsed = parseHitUndergradHtml(source, rows);
  assert.equal(parsed.admissions.length, 0);
  assert.equal(parsed.majors.length, 2);
  assert.equal(parsed.majors[0].majorName, '工科试验班（尖班）');
  assert.equal(parsed.majors[0].parentAdmissionLocator?.province, '河北');
  assert.equal(parsed.majors[0].parentAdmissionLocator?.subjectGroup, '物理类');
  assert.equal(parsed.majors[1].parentAdmissionLocator?.subjectGroup, '历史类');
  assert.equal(parsed.majors.every((item) => Boolean(item.parentAdmissionLocator)), true);
});

test('HIT adapter 能从回填后的 AJAX 数据 <tbody id="score-list"> 中提取 majors', () => {
  const html = `
    <h2>2025 黑龙江</h2>
    <table>
      <thead><tr><th>校区</th><th>专业</th><th>类别</th><th>最高分</th><th>平均分</th><th>最低分</th></tr></thead>
      <tbody id="score-list">
        <tr><td>校本部</td><td>工科试验班</td><td>物理+化学</td><td>681</td><td>681</td><td>681</td></tr>
        <tr><td>校本部</td><td>经济管理试验班</td><td>历史</td><td>645</td><td>638.6</td><td>637</td></tr>
        <tr><td>威海校区</td><td>智能材料与结构（中外合作办学）</td><td>物理+化学</td><td>632</td><td>626.5</td><td>625</td></tr>
      </tbody>
    </table>
  `;
  const rows: RawSourceRow[] = [{
    province: '全国',
    year: 2025,
    sourceUrl: source.officialUrl,
    sourceTitle: source.title,
    sourceType: 'html',
    parserKey: 'hit-undergrad-html',
    parserVersion: '1',
    rawText: html.replace(/\s+/g, ' ').trim(),
    rawFields: { html },
  }];

  const parsed = parseHitUndergradHtml(source, rows);
  assert.equal(parsed.majors.length, 3);
  assert.equal(parsed.majors[0].majorName, '工科试验班');
  assert.equal(parsed.majors[0].parentAdmissionLocator?.province, '黑龙江');
  assert.equal(parsed.majors[2].majorName, '智能材料与结构（中外合作办学）');
  assert.equal(parsed.majors.every((item) => Boolean(item.parentAdmissionLocator)), true);
});

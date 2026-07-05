import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveScoreFromRank } from './score-rank';

test('deriveScoreFromRank 能按官方一分一段表回推分数', () => {
  const ladder = [
    { score: 620, cumulativeCount: 8598 },
    { score: 619, cumulativeCount: 8897 },
    { score: 618, cumulativeCount: 9205 },
  ];

  const result = deriveScoreFromRank({
    targetRank: 8897,
    ladder,
  });

  assert.deepEqual(result, {
    minScore: 619,
    derivedFromOfficialRank: true,
    gap: null,
  });
});

test('deriveScoreFromRank 在缺少可命中位次时返回 gap', () => {
  const ladder = [
    { score: 620, cumulativeCount: 100 },
    { score: 619, cumulativeCount: 200 },
  ];

  const result = deriveScoreFromRank({
    targetRank: 500,
    ladder,
  });

  assert.equal(result.minScore, null);
  assert.equal(result.derivedFromOfficialRank, false);
  assert.equal(result.gap, 'rank_not_covered');
});

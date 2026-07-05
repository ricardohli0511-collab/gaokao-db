export interface ScoreRankPoint {
  score: number;
  cumulativeCount: number;
}

export function deriveScoreFromRank(params: {
  targetRank: number;
  ladder: ScoreRankPoint[];
}): {
  minScore: number | null;
  derivedFromOfficialRank: boolean;
  gap: 'rank_not_covered' | null;
} {
  const { targetRank, ladder } = params;

  const matched = ladder.find((item) => item.cumulativeCount >= targetRank);
  if (!matched) {
    return {
      minScore: null,
      derivedFromOfficialRank: false,
      gap: 'rank_not_covered',
    };
  }

  return {
    minScore: matched.score,
    derivedFromOfficialRank: true,
    gap: null,
  };
}

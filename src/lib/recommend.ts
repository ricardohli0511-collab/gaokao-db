import { getRecommendThresholds } from './constants';

interface RecordLike {
  minScore: number;
  institutionId: number;
  institution: { id: number; name: string; category: string; type?: string | null };
}

interface AssociateLike {
  minScore: number | null;
  programmeName: string;
  institution: { id: number; name: string; category: string; hkCategory?: string | null };
}

export function applyRecommend<T extends RecordLike>(
  records: T[],
  score: number,
  examCategory: string,
): { reach: T[]; match: T[]; safety: T[] } {
  const { reachOffset, matchOffset } = getRecommendThresholds(examCategory);
  const reachLower = score;
  const reachUpper = score + reachOffset;
  const matchLower = score - matchOffset;
  const matchUpper = score;

  const reach = records
    .filter((r) => r.minScore > reachLower && r.minScore <= reachUpper)
    .sort((a, b) => a.minScore - b.minScore);

  const match = records
    .filter((r) => r.minScore <= matchUpper && r.minScore >= matchLower)
    .sort((a, b) => b.minScore - a.minScore);

  const safety = records
    .filter((r) => r.minScore < matchLower)
    .sort((a, b) => b.minScore - a.minScore);

  return { reach, match, safety };
}

export function applyAssociateRecommend<T extends AssociateLike>(
  records: T[],
  score: number,
  examCategory: string,
): { reach: T[]; match: T[]; safety: T[] } {
  const { reachOffset, matchOffset } = getRecommendThresholds(examCategory);
  const reachLower = score;
  const reachUpper = score + reachOffset;
  const matchLower = score - matchOffset;
  const matchUpper = score;

  const valid = records.filter((r) => r.minScore !== null) as Array<T & { minScore: number }>;

  const reach = valid
    .filter((r) => r.minScore > reachLower && r.minScore <= reachUpper)
    .sort((a, b) => a.minScore - b.minScore);

  const match = valid
    .filter((r) => r.minScore <= matchUpper && r.minScore >= matchLower)
    .sort((a, b) => b.minScore - a.minScore);

  const safety = valid
    .filter((r) => r.minScore < matchLower)
    .sort((a, b) => b.minScore - a.minScore);

  return { reach, match, safety };
}

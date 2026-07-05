import crypto from 'node:crypto';

export function normalizeInstitutionName(input: string): string {
  return input
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+/g, '')
    .replace(/〔/g, '(')
    .replace(/〕/g, ')')
    .trim();
}

export function splitInstitutionVariant(rawName: string): {
  baseName: string;
  programVariant: string | null;
  campusName: string | null;
} {
  const normalized = normalizeInstitutionName(rawName);
  const matches = [...normalized.matchAll(/\(([^()]+)\)/g)].map((item) => item[1]?.trim() ?? '');
  const baseName = normalized.replace(/\([^()]+\)/g, '').trim();

  let programVariant: string | null = null;
  let campusName: string | null = null;

  for (const fragment of matches) {
    if (!fragment) continue;

    if (
      /校区|分校|校址|校本部/.test(fragment) &&
      !campusName
    ) {
      campusName = fragment;
      continue;
    }

    if (!programVariant) {
      programVariant = fragment;
      continue;
    }

    if (!campusName) {
      campusName = fragment;
    }
  }

  return {
    baseName,
    programVariant,
    campusName,
  };
}

export function normalizeNumberLike(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const normalized = String(value).replace(/,/g, '').trim();
  if (!normalized || normalized === '-' || normalized === '—') return null;

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function mapBatchLabel(input: string): string {
  const normalized = input.replace(/\s+/g, '');

  if (/本科/.test(normalized)) return '本科批';
  if (/专科/.test(normalized)) return '专科批';
  if (/提前/.test(normalized)) return '提前批';
  return input.trim();
}

export function mapSubjectGroup(input: string): string {
  const normalized = input.replace(/\s+/g, '');

  if (/物理/.test(normalized)) return '物理类';
  if (/历史/.test(normalized)) return '历史类';
  if (/理科/.test(normalized)) return '理科';
  if (/文科/.test(normalized)) return '文科';
  if (/综合/.test(normalized)) return '综合';
  return input.trim();
}

export function createRowHash(parts: Array<string | number | null | undefined>): string {
  const payload = parts.map((item) => String(item ?? '')).join('||');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function normalizeAdmissionType(input?: string | null): string {
  if (!input) return '统招';
  return input.trim() || '统招';
}

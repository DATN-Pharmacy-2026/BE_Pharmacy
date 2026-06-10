import { createHash } from 'crypto';

export const buildErrorFingerprint = (
  parts: Array<string | undefined | null>,
): string => {
  const normalized = parts.filter(Boolean).join('|').toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
};

export const parseBackoffDelays = (value?: string): number[] => {
  const raw = value ?? '5000,30000,120000,600000';
  const values = raw
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item >= 0);
  return values.length > 0 ? values : [5000, 30000, 120000, 600000];
};

export const withJitter = (
  delayMs: number,
  enabled: boolean,
  ratio: number,
): number => {
  if (!enabled || ratio <= 0) return delayMs;
  const delta = Math.floor(delayMs * Math.max(0, ratio) * Math.random());
  const signed = Math.random() < 0.5 ? -delta : delta;
  return Math.max(0, delayMs + signed);
};

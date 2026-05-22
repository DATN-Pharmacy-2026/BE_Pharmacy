import { REDACTED_VALUE, SENSITIVE_KEYS } from '../constants/logger.constants';

const sensitiveKeySet = new Set<string>(
  SENSITIVE_KEYS.map((key) => key.toLowerCase()),
);

export const maskSensitiveData = <T>(input: T): T => {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => maskSensitiveData(item)) as T;
  }

  if (typeof input !== 'object') {
    return input;
  }

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (sensitiveKeySet.has(key.toLowerCase())) {
      output[key] = REDACTED_VALUE;
      continue;
    }

    output[key] = maskSensitiveData(value);
  }

  return output as T;
};

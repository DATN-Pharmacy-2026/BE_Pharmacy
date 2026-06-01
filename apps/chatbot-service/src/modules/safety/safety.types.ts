export type HandoffReason = 'MEDICAL_SAFETY';

export interface SafetyCheckResult {
  handoffRequired: boolean;
  reason?: HandoffReason;
  matchedRules: string[];
}

export type Policy = {
  goal: string;
  horizon: string;
  risk: string;
  asset: string;
  liquidity: string;
  ai: string;
};

export const emptyPolicy: Policy = { goal: "", horizon: "", risk: "", asset: "", liquidity: "", ai: "" };

export function canContinue(step: number, policy: Policy): boolean {
  if (step === 1) return Boolean(policy.goal);
  if (step === 2) return Boolean(policy.horizon && policy.risk);
  if (step === 3) return Boolean(policy.asset && policy.liquidity && policy.ai);
  return true;
}

export function nextStep(step: number, returningToReview = false): number {
  return returningToReview ? 4 : Math.min(step + 1, 5);
}

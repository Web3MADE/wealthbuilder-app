import { z } from 'zod';
import type { ActionPlan } from '@/domain';

const shortText = z.string().trim().min(1).max(500);
const amount = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/)
  .refine((value) => Number(value) > 0 && Number.isFinite(Number(value)));

// The current MVP permits only the Fuji USDC supply concept. Policy validation
// remains a separate deterministic step in a later goal.
export const ActionPlanSchema: z.ZodType<ActionPlan> = z.object({
  summary: shortText,
  reasoning: z.string().trim().min(1).max(2000),
  steps: z.array(shortText).min(1).max(8),
  proposedActions: z.array(z.object({
    type: z.literal('SUPPLY'),
    asset: z.literal('usdc'),
    amount,
    protocol: z.literal('aave-v3'),
    chain: z.literal('avalanche-fuji'),
  }).strict()).min(1).max(3),
}).strict();

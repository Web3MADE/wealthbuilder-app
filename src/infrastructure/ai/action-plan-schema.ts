import { z } from 'zod';
import type { ActionPlan } from '@/domain';

const shortText = z.string().trim().min(1).max(500);
const amount = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/)
  .refine((value) => Number(value) > 0 && Number.isFinite(Number(value)));
const identifier = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{0,63}$/);

// The model can propose only a domain-level SUPPLY intent. Asset and protocol
// allow-lists are evaluated separately by the deterministic policy engine.
export const ActionPlanSchema: z.ZodType<ActionPlan> = z
  .object({
    summary: shortText,
    reasoning: z.string().trim().min(1).max(2000),
    steps: z.array(shortText).min(1).max(8),
    proposedActions: z
      .array(
        z
          .object({
            type: z.literal('SUPPLY'),
            asset: identifier,
            amount,
            protocol: identifier,
            chain: z.literal('avalanche-fuji'),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();

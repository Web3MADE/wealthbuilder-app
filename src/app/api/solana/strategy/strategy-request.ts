import { z } from 'zod';
import { solanaStrategyGoals, solanaStrategyRisks, solanaStrategyTimelines } from '@/domain';

export const solanaStrategyRequestSchema = z
  .object({
    goal: z.enum(solanaStrategyGoals),
    timeline: z.enum(solanaStrategyTimelines),
    risk: z.enum(solanaStrategyRisks),
    solBalanceLamports: z.string().regex(/^\d+$/),
    cluster: z.enum(['devnet', 'localnet']),
  })
  .strict();

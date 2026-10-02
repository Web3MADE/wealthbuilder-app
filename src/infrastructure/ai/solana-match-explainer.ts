import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import type {
  SolanaMatchExplanation,
  SolanaMatchExplainerPort,
} from '@/application/interfaces/solana-match-explainer';
import { GroqConfigSchema, type GroqConfig } from './groq-ai-planner';

const shortText = z.string().trim().min(1).max(280);

export const SolanaMatchExplanationSchema: z.ZodType<SolanaMatchExplanation> = z
  .object({
    headline: shortText,
    summary: z.string().trim().min(1).max(700),
    reasons: z.array(shortText).min(2).max(3),
    riskNote: shortText,
  })
  .strict();

export class GroqSolanaMatchExplainer implements SolanaMatchExplainerPort {
  private readonly config: GroqConfig;

  constructor(config: GroqConfig) {
    this.config = GroqConfigSchema.parse(config);
  }

  async explain(
    input: Parameters<SolanaMatchExplainerPort['explain']>[0],
  ): Promise<SolanaMatchExplanation> {
    const { text } = await generateText({
      model: createGroq({ apiKey: this.config.apiKey })(this.config.model),
      instructions: `You explain a deterministic WealthBuilder opportunity match. Return only strict JSON with headline, summary, reasons, and riskNote. You must explain only the supplied match. Do not change or restate a different protocol, opportunity, asset, allocation, risk classification, recipient, program, or execution route. Do not claim guaranteed returns, APY, market data, TVL, audits, safety scores, or historical performance. Do not use hype or trading language. State that the user reviews and approves any future action.`,
      prompt: JSON.stringify({
        userProfile: input.preferences,
        currentSolBalanceLamports: input.solBalanceLamports.toString(),
        selectedOpportunity: {
          id: input.selectedOpportunity.id,
          protocol: input.selectedOpportunity.protocol,
          name: input.selectedOpportunity.name,
          asset: input.selectedOpportunity.asset,
          category: input.selectedOpportunity.category,
          riskLevel: input.selectedOpportunity.riskLevel,
          liquidity: input.selectedOpportunity.liquidity,
          description: input.selectedOpportunity.description,
          whyItExists: input.selectedOpportunity.whyItExists,
          isDevelopmentFixture: input.selectedOpportunity.isDevelopmentFixture,
        },
        deterministicReasons: input.deterministicReasons,
        proposedAllocationPercent: input.allocationPercent,
      }),
      maxOutputTokens: 500,
    });
    return SolanaMatchExplanationSchema.parse(parseJson(text));
  }
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

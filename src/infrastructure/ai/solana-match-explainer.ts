import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import type {
  SolanaMatchExplanation,
  SolanaMatchExplainerPort,
} from '@/application/interfaces/solana-match-explainer';
import { GroqConfigSchema, type GroqConfig } from './groq-ai-planner';

const shortText = z.string().trim().min(1).max(280);
const unsupportedClaimPattern =
  /\b(vetted|supported|safe|safety|healthy|audited|audit|reliable|apy|interest|yield|returns?|guaranteed|market(?:\s+conditions?)?|protocol\s+health|smart[- ]contract|counter[- ]party|suspend(?:ed)? withdrawals?|protocol incidents?)\b/i;

export const SolanaMatchExplanationSchema: z.ZodType<SolanaMatchExplanation> = z
  .object({
    headline: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(700),
    whyThisFits: z.array(shortText).length(3),
    walletInsight: shortText,
    riskNote: shortText,
    reviewWhen: z.array(shortText).min(2).max(3),
  })
  .strict()
  .superRefine((explanation, context) => {
    const text = [
      explanation.headline,
      explanation.summary,
      ...explanation.whyThisFits,
      explanation.walletInsight,
      explanation.riskNote,
      ...explanation.reviewWhen,
    ].join(' ');
    if (unsupportedClaimPattern.test(text))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Explanation contains an unsupported claim.',
      });
  });

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
      instructions: `You explain a deterministic WealthBuilder plan in calm, plain English. Return only strict JSON with headline, summary, whyThisFits, walletInsight, riskNote, and reviewWhen. whyThisFits must contain exactly 3 concise items. reviewWhen must contain 2 or 3 concise, general conditions. Explain only the supplied user input, deterministic personal wealth profile, public wallet snapshot facts, fixed plan, and exclusions. The drawdown response is a stated preference, never observed history. The wallet snapshot is bounded and may be partial, never a complete portfolio. The fixed strategy, protocol example, allocation, and exclusions are immutable: never choose another strategy, modify a percentage, introduce a protocol, or recommend a different plan. Never call a protocol vetted, supported, safe, healthy, audited, or reliable. Never invent holdings, historical behaviour, interest, yields, returns, APY, protocol failure scenarios, withdrawal restrictions, counterparty claims, market conditions, TVL, audits, safety claims, or guaranteed outcomes. Make riskNote a practical caution grounded only in the partial snapshot, stated timeline, or fixed reserve. When walletShapeBasis is partial-valuation, say the observation is based on holdings with available values. reviewWhen may only cover needing money sooner, a goal change, a change in stated drawdown tolerance, a material change to visible crypto allocation, or beginning to rely on the portfolio for regular income. Do not use hype, trading language, or financial-adviser framing.`,
      prompt: JSON.stringify({
        userInput: { ...input.planSuitability, goalText: input.goalText },
        personalWealthProfile: input.wealthProfile,
        publicWalletSnapshot: input.walletSnapshot,
        fixedPlan: {
          selectedStrategy: input.selectedOpportunity.name,
          protocolExample: input.selectedOpportunity.protocol,
          allocation: input.allocation,
          allocationPercent: input.allocationPercent,
          deterministicReasons: input.deterministicReasons,
          exclusions: input.ruledOut,
        },
      }),
      maxOutputTokens: 700,
    });
    return SolanaMatchExplanationSchema.parse(parseJson(text));
  }
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1] ?? jsonObjectIn(trimmed);
  return JSON.parse(candidate);
}

function jsonObjectIn(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

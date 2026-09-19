import type { PersonalWealthPolicy, Portfolio } from '@/domain';
import type { ProtocolCapability } from './protocol';
export type UntrustedRecommendationDTO = Readonly<{
  title: string;
  rationale: string;
  action: Readonly<{ type: 'SUPPLY'; assetId: string; amountAtomic: string; protocolId: string }>;
}>;
export interface AIPlannerPort {
  generate(
    input: Readonly<{
      portfolio: Portfolio;
      policy: PersonalWealthPolicy;
      capabilities: readonly ProtocolCapability[];
    }>,
  ): Promise<UntrustedRecommendationDTO>;
}

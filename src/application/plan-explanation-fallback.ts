import type {
  PersonalWealthProfile,
  PlanAllocation,
  PublicWalletSnapshotFacts,
  SolanaOpportunity,
} from '@/domain';
import type { SolanaMatchExplanation } from './interfaces/solana-match-explainer';

/** Keeps a plan useful when the optional explanatory model is unavailable. */
export function deterministicPlanExplanation(
  input: Readonly<{
    opportunity: SolanaOpportunity;
    allocation: readonly PlanAllocation[];
    deterministicReasons: readonly string[];
    wealthProfile: PersonalWealthProfile;
    walletSnapshot: PublicWalletSnapshotFacts;
  }>,
): SolanaMatchExplanation {
  const productive = input.allocation[0]!;
  const reserve = input.allocation[1]!;
  const reserveDescription =
    reserve.status === 'target'
      ? `A further ${reserve.percent}% is a ${reserve.label.toLowerCase()}, not a detected holding.`
      : `The remaining ${reserve.percent}% stays in ${reserve.label.toLowerCase()}.`;

  return {
    headline: `${input.opportunity.name} example for your crypto plan`,
    summary: `${input.opportunity.name} is one approach that may align with the supported assets visible in this public snapshot. This example allocation uses ${productive.percent}% for ${productive.label.toLowerCase()}. ${reserveDescription}`,
    whyThisFits: input.deterministicReasons.slice(0, 3),
    walletInsight: walletInsight(input.wealthProfile, input.walletSnapshot),
    riskNote:
      'This example allocation is based on a partial public snapshot, not a complete wallet allocation.',
    reviewWhen: [
      'You expect to need this money sooner.',
      'Your goal or stated comfort with large drops changes.',
      'Your visible crypto allocation changes materially.',
    ],
  };
}

function walletInsight(
  profile: PersonalWealthProfile,
  snapshot: PublicWalletSnapshotFacts,
): string {
  if (snapshot.walletShapeBasis === 'partial-valuation')
    return `Based on the visible holdings with available USD values, this public snapshot looks ${profile.walletShape}. Some visible holdings do not have USD values.`;
  if (snapshot.walletShapeBasis === 'asset-presence')
    return `This public snapshot looks ${profile.walletShape} based on detected asset presence rather than USD values.`;
  return `This public snapshot looks ${profile.walletShape} based on the available USD values.`;
}

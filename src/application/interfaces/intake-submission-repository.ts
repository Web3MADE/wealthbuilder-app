export type IntakeSubmission = Readonly<{
  id: string;
  goal: string;
  portfolio: string;
  timeHorizon: string;
  liquidityPreference: string;
  riskPreference: string;
  cryptoExperience: string;
  additionalContext: string | null;
  email: string;
  contactHandle: string | null;
}>;

export interface IntakeSubmissionRepositoryPort {
  create(input: IntakeSubmission): Promise<void>;
}

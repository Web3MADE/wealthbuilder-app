import type { Metadata } from 'next';
import { OnboardingFlow } from '@/presentation/onboarding/onboarding-flow';

export const metadata: Metadata = {
  title: 'Create your wealth policy | WealthBuilder',
  description: 'Define your goals and preferences for a personal WealthBuilder policy.',
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}

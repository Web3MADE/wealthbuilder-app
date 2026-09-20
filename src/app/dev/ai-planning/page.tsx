import { notFound } from 'next/navigation';
import { PlanningWorkbench } from '@/presentation/planning/PlanningWorkbench';

export default function AIPlanningPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PlanningWorkbench />;
}

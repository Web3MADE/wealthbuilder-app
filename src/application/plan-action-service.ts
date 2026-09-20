import type { AIPlannerPort, PlannerResult } from './interfaces/ai-planner';

export async function planAction(planner: AIPlannerPort, request: string): Promise<PlannerResult> {
  const normalized = request.trim();
  if (!normalized || normalized.length > 1000) throw new Error('Enter a request of up to 1000 characters.');
  return planner.generate({ request: normalized });
}

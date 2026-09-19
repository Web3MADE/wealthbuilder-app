import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateDemoAction } from '@/bootstrap';

const inputSchema = z.object({
  amountUsdc: z.number().int().min(1).max(100),
  reserveBps: z.number().int().min(0).max(10_000),
  autonomousLimitUsdc: z.number().int().min(0).max(100),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid policy evaluation request.' }, { status: 400 });
  const decision = await evaluateDemoAction(parsed.data);
  return NextResponse.json({
    outcome: decision.outcome,
    actionValueMicros: decision.actionValue.micros.toString(),
    violations: decision.violations,
  });
}

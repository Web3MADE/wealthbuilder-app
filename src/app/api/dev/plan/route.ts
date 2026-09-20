import { NextResponse } from 'next/server';
import { z } from 'zod';
import { planAction } from '@/application/plan-action-service';
import { PlanningError } from '@/application/interfaces/ai-planner';
import { OpenCodeAIPlanner, OpenCodeConfigSchema } from '@/infrastructure/ai/opencode-ai-planner';

export const runtime = 'nodejs';
const requestSchema = z.object({ request: z.string().trim().min(1).max(1000) }).strict();

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Enter a request of up to 1000 characters.' }, { status: 400 });
  const config = OpenCodeConfigSchema.safeParse({
    apiUrl: process.env.OPENCODE_API_URL || undefined,
    apiKey: process.env.OPENCODE_API_KEY,
    model: process.env.OPENCODE_MODEL || undefined,
  });
  if (!config.success) return NextResponse.json({ error: 'OpenCode is not configured. Set OPENCODE_API_KEY.' }, { status: 503 });
  try {
    return NextResponse.json(await planAction(new OpenCodeAIPlanner(config.data), parsed.data.request));
  } catch (error) {
    if (error instanceof PlanningError)
      return NextResponse.json({ error: error.message, code: error.code, metadata: error.metadata }, { status: error.code === 'INVALID_PLAN' ? 422 : 502 });
    return NextResponse.json({ error: 'Could not create a plan.' }, { status: 500 });
  }
}

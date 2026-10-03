import { NextResponse } from 'next/server';
import { z } from 'zod';
import { IntakeSubmissionService } from '@/application/intake-submission-service';
import { DrizzleIntakeSubmissionRepository } from '@/infrastructure/persistence/drizzle-intake-submission-repository';
import { createDatabase, type Database } from '@/infrastructure/persistence/postgres';

export const runtime = 'nodejs';

const intakeSchema = z
  .object({
    goal: z.string().trim().min(3, 'Tell us a little about what you want from crypto.').max(2_000),
    portfolio: z
      .string()
      .trim()
      .min(2, 'Tell us roughly what your portfolio looks like.')
      .max(2_000),
    timeHorizon: z.enum(['within-1-year', '1-3-years', '3-5-years', '5-plus-years'], {
      errorMap: () => ({ message: 'Choose when you might need this money.' }),
    }),
    liquidityPreference: z.enum(['most', 'some', 'very-little', 'not-sure'], {
      errorMap: () => ({ message: 'Choose how much you need to keep accessible.' }),
    }),
    riskPreference: z.enum(['lower-risk', 'balanced', 'high-volatility'], {
      errorMap: () => ({ message: 'Choose how comfortable you are with crypto risk.' }),
    }),
    cryptoExperience: z.enum(['new', 'comfortable', 'advanced-defi-user'], {
      errorMap: () => ({ message: 'Choose your crypto experience.' }),
    }),
    additionalContext: z.string().trim().max(2_000).optional().default(''),
    email: z.string().trim().email('Enter a valid email address.').max(320),
    contactHandle: z.string().trim().max(320).optional().default(''),
  })
  .strict();

let database: Database | null = null;

function intakeSubmissions() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  database ??= createDatabase(url);
  return new IntakeSubmissionService(new DrizzleIntakeSubmissionRepository(database));
}

export async function POST(request: Request) {
  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const submissions = intakeSubmissions();
  if (!submissions)
    return NextResponse.json(
      { error: "We couldn't save your details. Please try again." },
      { status: 503 },
    );

  try {
    await submissions.create({
      ...parsed.data,
      additionalContext: parsed.data.additionalContext || null,
      contactHandle: parsed.data.contactHandle || null,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "We couldn't save your details. Please try again." },
      { status: 503 },
    );
  }
}

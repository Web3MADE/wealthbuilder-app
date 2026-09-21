import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function disabledResponse() {
  return NextResponse.json(
    { error: 'The legacy OpenCode planning endpoint is disabled. Use the Groq chat flow.' },
    { status: 410 },
  );
}

export function GET() {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
  return disabledResponse();
}

export function POST() {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
  return disabledResponse();
}

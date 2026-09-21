import { NextResponse } from 'next/server';
import { fujiPortfolioSource } from '@/infrastructure/dev/fuji-portfolio-source';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const portfolio = await fujiPortfolioSource().refresh();
    const totalUsdMicros = portfolio.positions.reduce(
      (total, position) => total + position.value.micros,
      0n,
    );
    return NextResponse.json({
      wallet: portfolio.walletId,
      capturedAt: portfolio.capturedAt.toISOString(),
      totalUsdMicros: totalUsdMicros.toString(),
      positions: portfolio.positions.map((position) => ({
        id: `${position.location}:${position.protocolId ?? 'wallet'}:${position.asset.id}`,
        symbol: position.asset.symbol,
        amountAtomic: position.amount.value.toString(),
        decimals: position.amount.decimals,
        valueUsdMicros: position.value.micros.toString(),
        location: position.location,
        protocolId: position.protocolId ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Could not read the Fuji portfolio.' }, { status: 502 });
  }
}

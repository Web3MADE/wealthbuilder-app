import { NextRequest, NextResponse } from 'next/server';
import { portfolioService } from '@/bootstrap';
import { avalancheFuji } from '@/config';
import { readSession, sessionCookieName } from '@/infrastructure/auth/session';

export async function GET(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const wallet = secret ? readSession(request.cookies.get(sessionCookieName)?.value, secret) : null;
  if (!wallet)
    return NextResponse.json({ error: 'Authenticate your wallet first.' }, { status: 401 });
  try {
    const portfolio = await portfolioService().refresh(wallet, avalancheFuji);
    return NextResponse.json({
      wallet: portfolio.walletId,
      network: 'Avalanche Fuji',
      capturedAt: portfolio.capturedAt.toISOString(),
      estimatedUsdMicros: portfolio.positions
        .reduce((sum, position) => sum + position.value.micros, 0n)
        .toString(),
      positions: portfolio.positions.map((position) => ({
        assetId: position.asset.id,
        symbol: position.asset.symbol,
        amountAtomic: position.amount.value.toString(),
        decimals: position.amount.decimals,
        estimatedUsdMicros: position.value.micros.toString(),
      })),
      pricingNote: 'Test USDC is valued at a configured $1. AVAX has no fiat quote.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Fuji balance read failed. Try again shortly.' },
      { status: 502 },
    );
  }
}

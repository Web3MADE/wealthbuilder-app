export type PublicSolanaTokenHolding = Readonly<{
  name: string;
  symbol: string;
  amount: string;
  usdValue: number | null;
}>;

export type PublicSolanaPortfolio = Readonly<{
  source: 'wallet' | 'example';
  label?: string;
  walletAddress?: string;
  solBalance: string;
  solUsdValue: number | null;
  topTokenHoldings: readonly PublicSolanaTokenHolding[];
  approximateTotalUsdValue: number | null;
  isPartial: boolean;
}>;

type OpendexOverview = Readonly<{
  walletBalanceNative?: number;
  walletBalanceNativeStr?: string;
  walletBalanceUsd?: number;
  walletBalanceUsdStr?: string;
}>;

type OpendexToken = Readonly<{
  tokenName?: string;
  tokenSymbol?: string;
  remainingTokens?: number;
  remainingTokensStr?: string;
  balanceUsd?: number;
  balanceUsdStr?: string;
}>;

type OpendexTokenResponse = Readonly<{ tokens?: readonly OpendexToken[] }>;

export class OpendexPortfolioError extends Error {}

const timeRange = 'NINETY_DAY';

/** Reads the bounded public trader snapshot used by the public plan experience. */
export async function fetchOpendexSolanaPortfolio(
  walletAddress: string,
): Promise<PublicSolanaPortfolio> {
  const apiKey = process.env.OPENDEX_API_KEY;
  if (!apiKey) throw new OpendexPortfolioError('OpenDEX portfolio access is not configured.');

  const apiBase = (process.env.OPENDEX_API_BASE_URL ?? 'https://api.opendex.ws').replace(/\/$/, '');
  const headers = { 'x-api-key': apiKey };
  const endpoint = `${apiBase}/v2/traders/SOL/${walletAddress}`;
  const [overviewResponse, tokensResponse] = await Promise.all([
    fetch(`${endpoint}?timeRange=${timeRange}`, { cache: 'no-store', headers }),
    fetch(`${endpoint}/tokens?timeRange=${timeRange}&status=ACTIVE`, {
      cache: 'no-store',
      headers,
    }),
  ]);

  if (!overviewResponse.ok || !tokensResponse.ok)
    throw new OpendexPortfolioError('OpenDEX could not retrieve this wallet right now.');

  const [overview, tokenResponse] = (await Promise.all([
    overviewResponse.json(),
    tokensResponse.json(),
  ])) as [OpendexOverview, OpendexTokenResponse];

  const solBalance =
    stringValue(overview.walletBalanceNativeStr, overview.walletBalanceNative) ?? '0';
  const solUsdValue = numberValue(overview.walletBalanceUsd, overview.walletBalanceUsdStr);
  const topTokenHoldings = (tokenResponse.tokens ?? [])
    .filter((token) => numberValue(token.remainingTokens, token.remainingTokensStr) !== null)
    .map((token) => ({
      name: token.tokenName ?? 'Unknown token',
      symbol: token.tokenSymbol ?? 'Token',
      amount: stringValue(token.remainingTokensStr, token.remainingTokens) ?? '0',
      usdValue: numberValue(token.balanceUsd, token.balanceUsdStr),
    }))
    .sort((left, right) => (right.usdValue ?? -1) - (left.usdValue ?? -1))
    .slice(0, 5);

  const knownValues = [solUsdValue, ...topTokenHoldings.map((holding) => holding.usdValue)].filter(
    (value): value is number => value !== null,
  );

  return {
    source: 'wallet',
    walletAddress,
    solBalance,
    solUsdValue,
    topTokenHoldings,
    approximateTotalUsdValue: knownValues.length
      ? knownValues.reduce((total, value) => total + value, 0)
      : null,
    // OpenDEX returns a trader snapshot, not an authoritative inventory of every wallet asset.
    isPartial: true,
  };
}

function numberValue(number?: number, string?: string) {
  const value = number ?? (string ? Number(string) : Number.NaN);
  return Number.isFinite(value) ? value : null;
}

function stringValue(string?: string, number?: number) {
  if (string !== undefined && string !== '') return string;
  return numberValue(number) === null ? null : String(number);
}

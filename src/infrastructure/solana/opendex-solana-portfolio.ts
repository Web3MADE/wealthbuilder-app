export type PublicSolanaTokenHolding = Readonly<{
  mint?: string;
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

type RpcResponse<T> = Readonly<{ result?: T; error?: Readonly<{ message?: string }> }>;
type TokenAccount = Readonly<{
  account?: Readonly<{
    data?: Readonly<{
      parsed?: Readonly<{
        info?: Readonly<{
          mint?: string;
          tokenAmount?: Readonly<{ uiAmountString?: string }>;
        }>;
      }>;
    }>;
  }>;
}>;
type TokenSearchResult = Readonly<{
  tokenAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  quote?: Readonly<{ priceUsd?: number | string | null }>;
}>;

export class SolanaPortfolioError extends Error {}

const tokenPrograms = [
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
] as const;
const wrappedSolMint = 'So11111111111111111111111111111111111111112';
export const knownStablecoinMints = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH',
]);
const maximumEnrichedMints = 200;
const lookupBatchSize = 50;

/** Reads authoritative wallet inventory from Solana RPC and enriches known mints with OpenDEX. */
export async function fetchSolanaPortfolio(walletAddress: string): Promise<PublicSolanaPortfolio> {
  const apiKey = process.env.OPENDEX_API_KEY;
  const solanaRpcUrl = process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet.solana.com';
  const apiBase = (process.env.OPENDEX_API_BASE_URL ?? 'https://api.opendex.ws').replace(/\/$/, '');
  const enrichmentHeaders = apiKey ? { 'x-api-key': apiKey } : undefined;
  const [balanceResult, ...tokenResults] = await Promise.all([
    solanaRpc<number>(solanaRpcUrl, 'getBalance', [walletAddress, { commitment: 'confirmed' }]),
    ...tokenPrograms.map((programId) =>
      solanaRpc<readonly TokenAccount[]>(solanaRpcUrl, 'getTokenAccountsByOwner', [
        walletAddress,
        { programId },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ]).catch(() => null),
    ),
  ]);

  const amounts = new Map<string, number>();
  for (const accounts of tokenResults) {
    for (const item of accounts ?? []) {
      const info = item.account?.data?.parsed?.info;
      const amount = Number(info?.tokenAmount?.uiAmountString);
      if (info?.mint && Number.isFinite(amount) && amount > 0)
        amounts.set(info.mint, (amounts.get(info.mint) ?? 0) + amount);
    }
  }

  const allMints = [...amounts.keys()];
  const selectedMints = allMints
    .sort(
      (left, right) =>
        Number(knownStablecoinMints.has(right)) - Number(knownStablecoinMints.has(left)),
    )
    .slice(0, maximumEnrichedMints);
  const metadata = await fetchMetadata(apiBase, enrichmentHeaders, [
    wrappedSolMint,
    ...selectedMints,
  ]);
  const solBalance = balanceResult / 1_000_000_000;
  const solPrice = price(metadata.get(wrappedSolMint)?.quote?.priceUsd);
  const solUsdValue = solPrice === null ? null : solBalance * solPrice;
  const topTokenHoldings = selectedMints
    .map((mint): PublicSolanaTokenHolding => {
      const token = metadata.get(mint);
      const amount = amounts.get(mint)!;
      const tokenPrice = price(token?.quote?.priceUsd);
      return {
        mint,
        name: token?.tokenName || 'Unknown token',
        symbol: token?.tokenSymbol || shortMint(mint),
        amount: String(amount),
        usdValue: tokenPrice === null ? null : amount * tokenPrice,
      };
    })
    .sort((left, right) => (right.usdValue ?? -1) - (left.usdValue ?? -1));
  const knownValues = [solUsdValue, ...topTokenHoldings.map((holding) => holding.usdValue)].filter(
    (value): value is number => value !== null,
  );

  return {
    source: 'wallet',
    walletAddress,
    solBalance: String(solBalance),
    solUsdValue,
    topTokenHoldings,
    approximateTotalUsdValue: knownValues.length
      ? knownValues.reduce((total, value) => total + value, 0)
      : null,
    isPartial:
      tokenResults.some((result) => result === null) ||
      allMints.length > maximumEnrichedMints ||
      solPrice === null ||
      topTokenHoldings.some((holding) => holding.usdValue === null),
  };
}

async function solanaRpc<T>(
  rpcUrl: string,
  method: string,
  params: readonly unknown[],
): Promise<T extends number ? number : readonly TokenAccount[]> {
  let response: Response;
  try {
    response = await fetch(rpcUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
    });
  } catch {
    throw new SolanaPortfolioError('Solana could not retrieve this wallet right now.');
  }
  if (!response.ok)
    throw new SolanaPortfolioError('Solana could not retrieve this wallet right now.');
  const body = (await response.json()) as RpcResponse<
    T extends number ? Readonly<{ value?: number }> : Readonly<{ value?: readonly TokenAccount[] }>
  >;
  if (body.error || body.result?.value === undefined)
    throw new SolanaPortfolioError('Solana could not retrieve this wallet right now.');
  return body.result.value as T extends number ? number : readonly TokenAccount[];
}

async function fetchMetadata(
  apiBase: string,
  headers: Record<string, string> | undefined,
  mints: readonly string[],
): Promise<Map<string, TokenSearchResult>> {
  const result = new Map<string, TokenSearchResult>();
  if (!headers) return result;
  for (let offset = 0; offset < mints.length; offset += lookupBatchSize) {
    const query = new URLSearchParams();
    for (const mint of mints.slice(offset, offset + lookupBatchSize))
      query.append('lookup', `SOL:${mint}`);
    try {
      const response = await fetch(`${apiBase}/v2/scanner/tokens/search?${query}`, {
        cache: 'no-store',
        headers,
      });
      if (!response.ok) continue;
      const body = (await response.json()) as unknown;
      const tokens = tokenArray(body);
      for (const token of tokens) if (token.tokenAddress) result.set(token.tokenAddress, token);
    } catch {
      // Metadata and prices are best-effort; the on-chain balances remain useful without them.
    }
  }
  return result;
}

function tokenArray(body: unknown): readonly TokenSearchResult[] {
  if (Array.isArray(body)) return body as readonly TokenSearchResult[];
  if (!body || typeof body !== 'object') return [];
  const record = body as Record<string, unknown>;
  for (const key of ['tokens', 'data', 'results'])
    if (Array.isArray(record[key])) return record[key] as readonly TokenSearchResult[];
  return [];
}

function price(value: number | string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function shortMint(mint: string) {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

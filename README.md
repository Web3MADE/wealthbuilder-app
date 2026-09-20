# WealthBuilder

Goal 2 is a Fuji-only wallet, portfolio, and Personal Wealth Policy shell.

## Setup

1. Install dependencies with `pnpm install`.
2. Create a Supabase Postgres database and copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` to the Supabase Postgres connection string and `SESSION_SECRET` to a random secret of at least 32 characters.
4. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to a Reown project ID for the full AppKit wallet modal. Without it, the app uses an injected EVM wallet connector.
5. Run `pnpm db:migrate`, then `pnpm dev`.

The Fuji RPC defaults to Avalanche's public testnet endpoint. The app reads native AVAX and the configured Fuji test USDC contract. Additional test ERC-20s can be supplied as `FUJI_ERC20_TOKENS_JSON`, an array of objects with `id`, `symbol`, `decimals`, `isStablecoin`, and `address`. Example:

```json
[
  {
    "id": "test-token",
    "symbol": "TEST",
    "decimals": 18,
    "isStablecoin": false,
    "address": "0x0000000000000000000000000000000000000001"
  }
]
```

Only test USDC has a configured nominal $1 price. AVAX and extra tokens display real balances but zero USD valuation. This is an estimate for the Fuji shell, not market pricing.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm build` for validation. The browser test mocks wallet signing and API responses; it does not use live credentials.

See [the manual Fuji smoke test](docs/goal-2-fuji-smoke.md) for the live flow.

For the local Anvil fork and development-only OpenCode planning flow, see [Local AI Planning and Fuji Fork](docs/local-ai-and-fuji-fork.md).

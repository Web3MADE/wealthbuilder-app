# Goal 2 Fuji smoke test

Requires a funded Fuji EVM test wallet, a Supabase Postgres connection, a `SESSION_SECRET`, and a Reown project ID. Apply the Drizzle migration with `pnpm db:migrate` before starting the app.

1. Open Home on desktop or mobile and connect the test wallet.
2. If the wallet starts on another network, confirm the warning and switch to Avalanche Fuji (43113).
3. Sign the SIWE message and confirm the wallet address appears as authenticated.
4. Open Portfolio and confirm the live AVAX and configured test-token balances match the wallet. Check the USDC balance against a Fuji explorer.
5. Open Policy, set each of the seven Goal 1 fields, and save. Confirm version 1 appears.
6. Change one field, save, and confirm version 2 appears. Save unchanged settings and confirm the version does not increase.
7. Refresh the page, then navigate Home → Policy; confirm the session and saved policy remain available.
8. Disconnect, reconnect, sign in, and confirm the same policy returns.
9. Connect another wallet and confirm it cannot read the first wallet's policy.

The public RPC was checked separately with a public address: chain ID 43113, AVAX balance, and test USDC `balanceOf` all returned. The full wallet and database flow needs live credentials.

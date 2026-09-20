# Local AI Planning and Fuji Fork

## Fuji fork

Install Foundry so `anvil` is on your path. In one terminal:

```bash
FUJI_FORK_UPSTREAM_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc pnpm fork:start
```

Anvil listens at `http://127.0.0.1:8545` with chain ID `43113`. It forks live Fuji state, including the configured Aave V3 pool and test USDC contracts. The publicly known Anvil development mnemonic is `test test test test test test test test test test test junk`; account 0 is `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`. Use this account only on the local fork. Anvil funds it with test AVAX locally.

In another terminal, verify the fork or reset it:

```bash
pnpm test:fork
pnpm fork:reset
pnpm fork:fund-usdc
```

`fork:fund-usdc` is a local-only helper. It finds a holder from recent Fuji USDC transfers, impersonates that address on Anvil, and transfers the configured development amount to account 0. `test:fork` runs this helper, reads the chain, verifies Aave and USDC bytecode, sends one local transfer, executes a 20 USDC Aave supply, and verifies the wallet and supplied position. `fork:reset` re-applies the configured Fuji fork parameters before removing local transactions, so Aave state remains valid. For repeatable upstream state, set `FUJI_FORK_BLOCK_NUMBER` to a block supported by your RPC provider. Set `FUJI_FORK_PORT` to change the local port and `FUJI_FORK_RPC_URL` to point the smoke test at that port.

To run chat execution against the fork, start the app with `FUJI_RPC_URL=http://127.0.0.1:8545`. Keep `FUJI_FORK_UPSTREAM_RPC_URL` set to the remote endpoint in the Anvil terminal so the fork does not point to itself. The chat uses the deterministic Anvil account only on localhost; it performs the exact USDC allowance and Aave V3 supply flow after policy approval. These variables are documented in `.env.example`.

## OpenCode planning

Set these server-side variables in `.env.local`:

```dotenv
OPENCODE_API_KEY=your-opencode-go-subscription-key
OPENCODE_MODEL=deepseek-v4-pro
```

`OPENCODE_API_KEY` is required. `OPENCODE_MODEL` defaults to DeepSeek V4 Pro and can be changed in the development page. DeepSeek V4 Pro, GLM 5.3, and Kimi K2.6 use OpenCode Go chat completions; Qwen3.7 Plus uses OpenCode Go Messages; GPT-5.6 Luna uses OpenCode Go Responses. The adapter selects the endpoint internally and never passes a transaction tool to the model. `OPENCODE_GO_BASE_URL` is optional for local debugging; it defaults to `https://opencode.ai/zen/go/v1`.

Run `pnpm dev` and open `/dev/ai-planning`. Select one of the five models, enter a request, create the plan, and inspect the steps, proposed supply action, and provider metadata. The status selector previews all presentation states. This route and its API return 404 in production. A missing API key returns a clear configuration error. Invalid model output returns an invalid-plan error with schema failure metadata. API errors include the HTTP status and a safe error code without logging provider bodies or secrets. No policy approval or transaction is performed.

Example validated output:

```json
{
  "summary": "Supply a small amount of idle USDC",
  "reasoning": "Aave V3 may provide yield, pending balance and policy checks.",
  "steps": [
    "Check available USDC",
    "Verify Personal Wealth Policy",
    "Supply 10 USDC to Aave V3",
    "Confirm resulting position"
  ],
  "proposedActions": [
    { "type": "SUPPLY", "asset": "usdc", "amount": "10", "protocol": "aave-v3", "chain": "avalanche-fuji" }
  ]
}
```

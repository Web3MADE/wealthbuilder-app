# WealthBuilder MVP — 80/20 Product + Test Reference

## How `/plan` works

```text
User
  ↓
Real Solana wallet OR Try an example
  ↓
Portfolio data
  - Real wallet → OpenDEX public snapshot
  - Example → hard-coded demo portfolio
  ↓
Free-text goal
  ↓
Groq classifies intent
  → grow / safer / income / freedom
  ↓
Time horizon + drop behaviour
  ↓
Deterministic Personal Wealth Profile
  ↓
Deterministic strategy + allocation + exclusions
  ↓
Groq explains the fixed plan
  ↓
Personalized plan shown + submission saved
```

### Current user inputs

- **Goal:** free text
- **Time horizon:** Within 1 year / 1–3 / 3–5 / 5+ years
- **Drop behaviour:** Sell / Hold / Buy more / It depends

### Current portfolio modes

1. **Real Solana wallet**
   - User pastes a public address
   - OpenDEX reads a partial public wallet snapshot
   - No wallet connection, signing, or transaction required

2. **Try an example**
   - `SOL-heavy`: 18.4 SOL
   - `Stablecoin-heavy`: 1.3 SOL + 620 USDC + 190 USDT
   - `Diversified`: 4.1 SOL + 830 JUP + 260 USDC

3. **No-Solana-wallet manual portfolio**
   - **Not implemented yet**
   - Planned fallback for users who own crypto but do not have a Solana wallet

## Core dependencies

| Dependency | Purpose |
|---|---|
| **OpenDEX** | Read public Solana wallet holdings / approximate values |
| **Deterministic matcher** | Build profile, choose strategy, allocation, exclusions |
| **Groq GPT-OSS 120B** | Classify free-text goal + explain the fixed plan |
| **Postgres / Drizzle** | Save submissions and generated plans |
| **RugCheck** | Planned optional enrichment for risky / unknown Solana tokens |
| **Jito** | Current concrete SOL liquid-staking strategy / execution example |

## Public Solana wallets for testing

These are public entity/exchange wallets useful for **wallet-ingestion stress testing**, not realistic individual financial profiles.

| Test case | Public wallet | Address |
|---|---|---|
| SOL-heavy | Coinbase 5 | `59L2oxymiQQ9Hvhh92nt8Y7nDYjsauFkdb3SybdnsG6h` |
| Liquid-staked SOL | Kraken validator | `krakeNd6ednDPEXxHAmoBs1qKVM8kLg79PvWF2mhXV1` |
| Stablecoin-heavy | Bybit Wallet 12 | `2qo8jvuc49pFmTjmUHLiARSV6ppPTaE7gw27ZJ6DnNZy` |
| Diversified / noisy | Kraken Hot Wallet | `6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF` |
| Speculative / token-heavy | OKX Hot Wallet | `5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD` |

### References

- Coinbase wallet: https://solscan.io/account/59L2oxymiQQ9Hvhh92nt8Y7nDYjsauFkdb3SybdnsG6h
- Kraken validator: https://solscan.io/account/krakeNd6ednDPEXxHAmoBs1qKVM8kLg79PvWF2mhXV1
- Bybit wallet: https://solscan.io/account/2qo8jvuc49pFmTjmUHLiARSV6ppPTaE7gw27ZJ6DnNZy
- Kraken hot wallet: https://solscan.io/account/6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF
- OKX hot wallet: https://solscan.io/account/5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD
- Solscan public-name labels: https://info.solscan.io/public-names-and-private-names/

## What `/plan` does **not** do

- No login
- No wallet connection
- No signing
- No on-chain execution
- No Jito transaction from `/plan`
- No complete wallet audit — OpenDEX data is treated as a partial public snapshot

## Current validation goal

Ask real users:

> **Would you actually follow this plan? Why or why not?**

The next product work should come from those reactions, not from adding more features first.

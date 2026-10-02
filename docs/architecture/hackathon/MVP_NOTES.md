WealthBuilder is not a trading bot. It’s a risk-aware matchmaking and execution layer for on-chain wealth opportunities.

The core loop is:
Understand the user → filter opportunities → match the best fit → explain why → user approves → execute.

The underlying strategies might involve staking, lending, vaults, liquidity provision, or even a swap as part of entering a position. But the objective is long-term yield / wealth building, not predicting price movements or frequently trading the market.

On onboarding, I would keep it extremely light.

You probably only need three signals initially:
- Goal: preserve / build long-term / grow aggressively
- Risk: conservative / balanced / growth
- Timeline: 1–3 / 3–5 / 5+ years

That is enough to filter the catalogue meaningfully.

The concern about users refusing to answer is valid, but I would not solve that by immediately integrating Binance/OKX. That adds OAuth/API-key handling, privacy concerns, exchange-specific integrations, and significantly more product complexity.

Instead, I’d give users two paths:
- “Personalise my strategy” → answer the 3 questions.
- “Show me opportunities” → skip onboarding and browse a conservative/default set, then ask for more information only when needed.

| Risk | Strategy | Example Solana route | Why it fits |
|---|---|---|---|
| **Low** | Liquid staking | SOL → **JitoSOL** | Simple, liquid, no borrowing/leverage. JitoSOL represents staked SOL and remains usable in DeFi. ([Jito Network][1]) |
| **Medium** | Staking + lending | SOL → JitoSOL → **supply JitoSOL to a lending market such as Kamino** | Adds another yield layer without borrowing. More smart-contract/protocol risk, but no leveraged debt position. Kamino supports JitoSOL/SOL markets and broader lending/yield products. ([Kamino Forum][2]) |
| **High** | Leveraged yield loop | JitoSOL collateral → borrow SOL → swap/deposit → repeat via **Project 0 / similar loop** | Adds leverage, borrow-rate risk and liquidation/position-management risk. Project 0 explicitly supports atomic leveraged loops and cross-venue strategies. ([MarginFi Documentation][3]) |

[1]: https://www.jito.network/docs/jitosol/jitosol-liquid-staking/liquid-staking-basics/?utm_source=chatgpt.com "Liquid Staking Basics | Jito Foundation"

[2]: https://gov.kamino.finance/t/introducing-the-jito-market/261?utm_source=chatgpt.com "Introducing: The Jito Market - Governance - Kamino Forum"

[3]: https://docs.marginfi.com/guides/looping-and-strategies?utm_source=chatgpt.com "Looping & Strategies"


| Criterion | What we show Sunday |
|---|---|
| Product + Execution | Real wallet → real assets → real matching → real Jito transaction |
| Founder + Market Fit | Your fintech/DeFi/security background + direct user interviews |
| Insight | Users shouldn't have to become DeFi experts; WealthBuilder matches existing products to them |
| Traction | Interviews, waitlist, social engagement, beta interest |
| Communication | One extremely understandable 60-second flow |


Google/email
→ embedded wallet automatically created
→ receive demo Devnet SOL
→ 3-question wealth profile
→ matcher
→ Jito recommendation
→ one-click user-approved execution
→ real JitoSOL position

It’s:
“Watch me turn $1,000 of crypto into a personalised investment strategy in 30 seconds.”

Then visually:
1. Sign in with Google
2. “I want long-term growth / Balanced risk / 5+ years”
3. WealthBuilder instantly shows the match
4. “Put 20% to work”
5. Tap approve
6. ✓ Strategy active
7. Show the actual on-chain position

| # | Milestone | Status | Definition |
|---|---|---|---|
| **1** | Solana product shell | ✅ Done | Clean Solana-only experience; AVAX/Fuji removed from demo path |
| **2** | Wealth profile | ✅ Done | Goal → Timeline → Risk |
| **3** | Matchmaking | ✅ Done | Jito best match + other strategy previews |
| **4** | Real Jito execution | ✅ Built / 🟡 smoke test | Real Devnet SOL → JitoSOL, confirmation + real balance refresh |
| **5** | Demo continuity | ✅ Done | Wallet-specific local state survives reload |
| **6** | Frictionless account onboarding | 🔜 **Next** | Google/email → embedded self-custodial Solana wallet automatically created |
| **7** | Automatic Devnet funding | 🔜 | New demo wallet receives a small capped amount of Devnet SOL automatically |
| **8** | First-time-user E2E flow | 🔜 | Remove wallet/network knowledge from the happy path; take brand-new user from login → active strategy |
| **9** | UX/content polish | 🔜 | Make every screen understandable without narration; tighten copy, transitions and mobile presentation |
| **10** | Demo hardening | ⏳ Final | Rehearse, record 30–60 sec flow, use it with interviewees, capture reactions/signups |


## TODO

Do this next:
1. Create/configure the Dynamic Sandbox environment.
2. Enable Google + email.
3. Enable Solana embedded wallets + Create on sign up.
4. Configure Solana Devnet and allow http://localhost:3000.
5. Add NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.
6. Sign up with a fresh Google/email account.
7. Confirm WealthBuilder creates the Solana wallet automatically.
8. Manually send that wallet ~1–2 Devnet SOL.
9. Run the complete flow through Approve & stake.
10. Confirm Dynamic shows the signing approval, Jito transaction confirms, and JitoSOL appears.





Elsa helps you do crypto. WealthBuilder helps you decide what crypto should do for your life.

WealthBuilder:
help me reach my goals without becoming a trader.

Bankr:
tell me what transaction to perform. docs.bankr.bot

WealthBuilder:
tell me which actions actually fit me.

## So instead of trying to convince people to “sign up for another crypto app,” the hook becomes:
- Get your free personalized crypto wealth plan.

That is much easier to market.
And the loop is clean:
Content / interview
→ “What are you trying to achieve financially?”
→ Submit wallet + 3 questions
→ WealthBuilder produces the tailored plan
→ Ask “Would you actually follow this?”
→ feedback improves matcher
→ reaction becomes content
→ CTA sends more people to get their own plan.
The important shift is that the plan itself is the acquisition product.


Phase 1: personalized plans = distribution + learning
Phase 2: one-click execution = product utility
Phase 3: integrations/API/MCP = distribution through products people already use
Phase 4: ongoing Personal Wealth Policy = recurring relationship


| Phase | What we build | Priority |
|---|---|---|
| **1. Wealth Plan engine/API** | Input wallet + goal + timeline + risk → read real SOL balance → existing matcher → personalized recommendation | **NOW** |
| **2. Tiny public `/plan` UI** | No login. Paste wallet, answer 3 questions, click `Build my plan` | **NOW** |
| **3. Plan result** | Holdings, recommended allocation, amount, why it fits, liquidity/risk, Jito secondary details | **NOW** |
| **4. Lead/feedback capture** | After result: email + `Would you actually follow this? Yes / Not yet` | **Tomorrow** |
| **5. Interview validation** | Put it in front of real people and generate their plan live | **Tomorrow** |
| **6. Social/demo** | Record `Give me your wallet and 30 seconds` transformation | **Tomorrow** |
| **7. MCP/API proof** | Expose same engine through 1–2 MCP tools | **Bonus after core works** |
| **8. Execution** | Existing `/solana` Jito flow proves we can execute recommendations | **Bonus / demo proof** |
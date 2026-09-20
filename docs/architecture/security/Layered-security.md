# ADR-009: Layered Security and Bounded Authority

## Status
Accepted

## Context
WealthBuilder must support automated onchain actions while preserving self-custody and preventing AI, integrations, or compromised sessions from gaining unrestricted control over user funds.

## Decision
Use layered authority:

User Root Authority  
→ Personal Wealth Policy  
→ Scoped Session Keys  
→ Approved Protocol/Function Permissions  
→ Transaction Simulation  
→ Execution

Security controls:

1. **Root authority stays with the user.** AI never receives root-wallet authority.
2. **AI only receives scoped session keys.** Permissions can be limited by time, amount, asset, protocol, action type, chain, and frequency.
3. **Protocol allowlists.** Only pre-approved protocols and contract addresses may be called.
4. **Function-level permissions.** A session may allow `supply()` USDC while blocking `borrow()`, `transfer()`, or arbitrary calldata.
5. **Per-action and cumulative limits.** Example: max $100/action, $500/day, or 10% portfolio allocation.
6. **Policy enforcement stays outside the AI.** AI proposes; deterministic rules approve, require approval, or block.
7. **Transactions are simulated before execution.** Unexpected state changes, approvals, slippage, or asset flows should fail safely.
8. **Withdrawals receive stronger protection.** New destinations, large transfers, or major policy changes may require stronger authentication or delays.
9. **Circuit breakers stop automation** when protocol risk, oracle anomalies, suspicious upgrades, or unexpected behavior are detected.
10. **Compartmentalization limits blast radius.** One compromised session should never expose the full portfolio.
11. **Fast revocation.** Users can revoke active AI/session permissions immediately.
12. **Recovery should avoid seed-phrase fragility.** Passkeys, guardians, or hardware-backed recovery may be used while preserving self-custody.
13. **Permission UX must be transparent.** Users should always be able to see exactly what AI is currently allowed to do with their funds.

## Consequences
This preserves user control while reducing risks from compromised permissions, unsafe automation, human error, and excessive access.

## Deferred
Recovery architecture, advanced circuit breakers, automated protocol-risk scoring, and protected-vs-active capital separation are deferred until needed.
# AGENTS.md

## Purpose

This repo contains the WealthBuilder application.

AI agents should optimize for:
- fast MVP delivery
- clear architecture
- reliable financial logic
- small, reviewable changes
- minimal unnecessary abstraction

Working software takes priority over theoretical perfection.

---

## Architecture

Use the agreed 4-layer architecture:

1. `presentation` — UI and view logic
2. `application` — application services and ports
3. `domain` — pure WealthBuilder business logic
4. `infrastructure` — chains, protocols, AI, persistence, external APIs

Dependency rules:

- Domain depends on nothing external.
- Application depends on Domain.
- Infrastructure implements Application ports.
- Presentation uses Application and Domain.
- Application must not import Infrastructure.
- Presentation must not call blockchain/database/AI SDKs directly.

Smart contracts are maintained separately from this repo.

---

## Development Approach

Develop feature-first and test-backed.

For each task:

1. Understand the requested user outcome.
2. Inspect existing code before changing anything.
3. Define concise acceptance criteria.
4. Identify affected layers.
5. Write tests for important business logic.
6. Implement the smallest complete solution.
7. Run checks.
8. Manually verify the user flow where applicable.
9. Report what changed.

Do not build speculative future functionality.

---

## Testing

Use strong testing where mistakes matter:

- policy rules
- money calculations
- execution state transitions
- idempotency
- security-sensitive logic
- chain/protocol adapter behavior

Keep UI testing lean.

Prefer:
- unit tests for Domain logic
- focused integration tests for Infrastructure
- a small number of important Playwright E2E flows
- manual testing for presentation polish

Do not write trivial tests solely to increase coverage.

---

## Web3 Rules

WealthBuilder is chain-agnostic by default.

Domain/Application should work with financial concepts such as:

`SUPPLY USDC 500`

not:

`call 0x123... with calldata 0x...`

Chain- and protocol-specific details belong in Infrastructure.

Use existing ecosystem SDKs/protocols before building custom infrastructure.

AI recommends actions.
Deterministic policy logic decides whether they are permitted.
AI must never directly execute arbitrary transactions.

---

## Code Quality

Keep code simple and explicit.

Avoid:
- premature abstractions
- unnecessary interfaces
- empty future directories
- generic `services/` or `utils/` dumping grounds
- duplicated logic
- giant files/classes
- introducing dependencies without a clear need

Group related behavior into cohesive modules.

Do not refactor unrelated code during a feature task unless necessary.

---

## Changes Requiring Approval

Ask before:

- changing the agreed architecture
- adding major dependencies
- changing database strategy
- adding custom smart contracts
- introducing new infrastructure/platforms
- making broad repo-wide refactors
- changing established domain behavior

Small implementation decisions can be made independently.

---

## Validation

Before considering a task complete, run the relevant checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
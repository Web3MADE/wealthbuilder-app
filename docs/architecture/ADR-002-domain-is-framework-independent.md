# ADR-002: Domain is framework-independent

## Status

Accepted

## Context

WealthBuilder business rules must remain independent from specific chains, providers, and frameworks.

## Decision

`src/domain` is pure TypeScript and owns WealthBuilder business concepts and rules, including `PersonalWealthPolicy`, `Portfolio`, `ProposedAction`, `Recommendation`, `PolicyDecision`, `ExecutionResult`, money value objects, and domain errors.

It cannot import Next.js, React, viem, wagmi, Reown, Drizzle, Supabase, AI SDKs, RPC clients, protocol SDKs, or environment variables.

## Consequences

Financial policy can be tested and evolved without framework or provider dependencies. External models and SDK types stay outside the Domain layer.

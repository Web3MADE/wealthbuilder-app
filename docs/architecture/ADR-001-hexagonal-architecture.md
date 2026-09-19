# ADR-001: Hexagonal architecture

## Context

WealthBuilder must add chains and protocols without making financial policy depend on infrastructure.

## Decision

Use Domain → Application → Ports, with adapters implementing ports at the outer boundary.

## Consequences

Composition happens only in `apps/web`; use cases remain testable with fakes.

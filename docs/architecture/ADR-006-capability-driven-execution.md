# ADR-006: Capability-driven execution

## Context

Application use cases need to discover safe actions without scattered chain conditionals.

## Decision

Protocol adapters declare typed financial capabilities; application code queries support by action, asset, chain, and authorization mode.

## Consequences

Unsupported capabilities fail closed and new chains/protocols can be added behind feature flags.

# ADR-004: AI cannot execute

## Context

AI output is untrusted and must not control user assets.

## Decision

AI adapters return untrusted normalized DTOs. Application validation and deterministic policy evaluation precede every authorization and execution path.

## Consequences

AI never receives a wallet, signing capability, calldata interface, or execution port.

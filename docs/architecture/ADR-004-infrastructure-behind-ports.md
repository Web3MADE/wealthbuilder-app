# ADR-004: Infrastructure behind ports

## Status

Accepted

## Context

External systems must not dictate the shape of application or business logic.

## Decision

All external-system integrations live in `src/infrastructure` and implement Application ports. This includes AI providers, blockchain RPC and wallet SDKs, protocols such as Aave, persistence, and external APIs when those integrations are present.

SDK-specific types must not leak into Application or Domain. Current examples are `ChainPort` implemented by `EvmChainAdapter` (configured for Avalanche Fuji) and `ProtocolPort` implemented by `AaveV3ProtocolAdapter`. `AIPlannerPort` and repository ports define the corresponding boundaries for AI and persistence adapters.

## Consequences

External providers are replaceable without changing business rules or application orchestration.

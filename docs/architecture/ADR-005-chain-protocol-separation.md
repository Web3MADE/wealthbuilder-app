# ADR-005: Chain and protocol separation

## Context

A protocol can exist on many chains and a chain can support many protocols.

## Decision

Use separate chain and protocol ports/adapters composed through typed deployment configuration.

## Consequences

There are no chain-protocol service combinations such as `AvalancheAaveService`.

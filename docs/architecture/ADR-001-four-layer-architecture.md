# ADR-001: Four-layer architecture

## Status

Accepted

## Context

We need clear architectural boundaries without overengineering the MVP.

## Decision

Use four layers: Presentation, Application, Domain, and Infrastructure. Use Ports & Adapters specifically at the infrastructure boundary.

Dependencies are limited to:

- Domain → nothing
- Application → Domain
- Infrastructure → Application ports + Domain
- Presentation → Application + Domain

`src/app` contains Next.js routes and API entry points; the layer code lives in `src/presentation`, `src/application`, `src/domain`, and `src/infrastructure`.

## Consequences

Business logic remains independent from Web3 infrastructure, external providers can be replaced, and the boundaries remain understandable for a small team. This avoids unnecessary package-level fragmentation.

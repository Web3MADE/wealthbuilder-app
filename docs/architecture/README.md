# Architecture decision records

WealthBuilder uses a strict four-layer architecture with Ports & Adapters at the infrastructure boundary:

```text
Presentation
    ↓
Application
    ↓
Domain

Infrastructure
    ↓
Application Ports + Domain
```

ADRs are added only after an architectural decision is confirmed. During this MVP stage, superseded decisions are updated or removed rather than retained as stale documentation.

## Current ADRs

- [ADR-001: Four-layer architecture](ADR-001-four-layer-architecture.md)
- [ADR-002: Domain is framework-independent](ADR-002-domain-is-framework-independent.md)
- [ADR-003: Application services and ports](ADR-003-application-services-and-ports.md)
- [ADR-004: Infrastructure behind ports](ADR-004-infrastructure-behind-ports.md)
- [ADR-005: Chain-agnostic domain actions](ADR-005-chain-agnostic-domain-actions.md)
- [ADR-006: AI recommends; policy decides](ADR-006-ai-recommends-policy-decides.md)
- [ADR-007: Composition root](ADR-007-composition-root.md)
- [ADR-008: Contracts live separately](ADR-008-contracts-live-separately.md)

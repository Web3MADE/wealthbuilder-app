# ADR-003: Application services and ports

## Status

Accepted

## Context

The application needs a small, cohesive orchestration layer without turning every interaction into a separate use-case file.

## Decision

`src/application` contains cohesive application services such as `PortfolioService`, `PolicyService`, `RecommendationService`, and `ExecutionService`, plus the ports they require.

Application services orchestrate Domain behavior. They do not contain chain-specific logic, protocol-specific logic, database implementation details, or AI implementation details. Avoid both a one-file-per-use-case explosion and a generic dumping-ground `services/` directory.

## Consequences

Application behavior is expressed through Domain types and port interfaces, so its external dependencies remain replaceable and explicit.

# ADR-002: Domain has no infrastructure dependencies

## Context

Financial correctness must remain independently testable and portable.

## Decision

`@wealthbuilder/core` is pure TypeScript and imports no framework, SDK, persistence, environment, or deployment configuration.

## Consequences

Adapters map external models to domain entities; database rows and SDK types never enter core.

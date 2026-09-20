# ADR-007: Composition root

## Status

Accepted

## Context

Constructing Infrastructure dependencies in routes or components would obscure dependencies and violate layer boundaries.

## Decision

`src/bootstrap.ts` wires server-side repositories, authentication, Fuji reads, and application services. `src/bootstrap-client.tsx` wires the browser wallet adapter to the presentation shell. Routes and presentation components do not construct Infrastructure dependencies.

## Consequences

Concrete wiring is centralized and application services can be tested with explicit fakes.

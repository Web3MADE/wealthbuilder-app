# ADR-007: Composition root

## Status

Accepted

## Context

Constructing Infrastructure dependencies in routes or components would obscure dependencies and violate layer boundaries.

## Decision

`src/bootstrap.ts` is the composition root. It is the place to instantiate repositories, chain and protocol adapters, and AI adapters, then inject them into application services. Routes and components must not construct Infrastructure dependencies themselves.

## Consequences

Concrete wiring is centralized and application services can be tested with explicit fakes.

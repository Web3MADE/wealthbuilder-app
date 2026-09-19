# ADR-003: Integer money representation

## Context

Floating point arithmetic is unsafe for financial policy decisions.

## Decision

Represent USD in integer micros and token quantities in atomic units with explicit decimals.

## Consequences

Boundaries serialize integers deliberately; policy calculations do not use JavaScript numbers for value arithmetic.

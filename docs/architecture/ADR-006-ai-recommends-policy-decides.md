# ADR-006: AI recommends; policy decides

## Status

Accepted

## Context

AI output is untrusted and must not control user assets.

## Decision

AI is advisory, never authoritative. An AI-assisted path is:

```text
portfolio + policy → AI recommendation → schema validation → normalized ProposedAction
→ deterministic policy evaluation → decision → optional execution
```

AI must never bypass policy rules, produce trusted executable transactions, or directly execute blockchain actions. The deterministic Policy layer is authoritative.

## Consequences

An AI integration is constrained to untrusted recommendation input; policy evaluation remains required before an action can be approved or executed.

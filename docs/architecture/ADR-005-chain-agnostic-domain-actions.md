# ADR-005: Chain-agnostic domain actions

## Status

Accepted

## Context

WealthBuilder must express financial intent independently of a particular blockchain implementation.

## Decision

Domain and Application operate on normalized financial actions. For example:

```text
SUPPLY
asset: USDC
amount: 500
protocolType: LENDING
```

They must not operate on calldata, contract addresses, gas parameters, wallet-provider objects, or chain-specific SDK transaction types. Infrastructure creates those details only after policy evaluation and approval.

## Consequences

WealthBuilder is chain-agnostic by default, while Infrastructure can translate approved actions for a specific chain or protocol.

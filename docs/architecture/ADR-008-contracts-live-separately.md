# ADR-008: Contracts live separately

## Status

Accepted

## Context

The current application is an orchestration and product layer using ecosystem infrastructure and SDKs.

## Decision

This repository contains no smart-contract source or Foundry setup. If custom WealthBuilder contracts become necessary for a concrete product or hackathon requirement, they will live in the separate `wealthbuilder-contracts` repository.

## Consequences

Contract development does not add tooling, deployment, or security-review concerns to this application repository until there is a concrete requirement.

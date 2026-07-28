# ADR-001: Operations Summary Engine

**Status:** Accepted

## Purpose

This document records the architectural decision to introduce the Operations Summary Engine as the single source of calculated operational truth within BoatiesMate.

## Decision

All operational calculations will be performed by the Operations Summary Engine.

Presentation components must consume the resulting summary object rather than performing independent calculations.

Current consumers are:

- Operations Brief
- Action Centre
- Marina Health

## Guiding Principles

- Interpret operational data rather than simply display it.
- Every operational statement should be traceable to supporting evidence.
- AI recommends. Humans decide.
- Each operational calculation exists in only one place.
- Every operational decision has a single authoritative source of truth.

## Future Direction

The next architectural capability will be an Operational Event Framework that records significant operational events and supplies future operational intelligence.

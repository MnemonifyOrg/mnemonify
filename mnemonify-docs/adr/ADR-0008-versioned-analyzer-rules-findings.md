# ADR-0008: Versioned Deterministic Analyzer Rules and Findings

**Status:** Accepted

## Context

Course Health will include definite technical errors and contextual instructional recommendations. Institutions need reproducible reports, while authors need transparent evidence and the ability to document intentional exceptions.

## Decision

Analyzer rules are deterministic, versioned, side-effect free, and organized into composable profiles. Findings include severity, confidence, basis, evidence, affected object identities, stable fingerprints, and whether human judgment is required.

Suppressions require justification, author, timestamp, scope, and revision applicability. Analyzer snapshots record the course revision, engine version, active rule-pack versions, findings, and suppressions.

## Consequences

- The same revision and rule versions produce equivalent findings.
- Heuristic recommendations are distinguishable from verified defects.
- Publish policies can block errors without treating every suggestion as mandatory.
- Rule changes can be audited across course revisions.
- Optional AI output cannot silently become a deterministic publish authority.

# ADR-0010: Domain Specialization Prefers Data Before Core Schema

**Status:** Accepted

## Context

Specialized fields such as pathology case stages, nursing scenarios, or compliance workflows can often be represented with existing blocks, triggers, variables, embeds, templates, and Analyzer profiles. Adding each domain to the core schema would increase complexity and reduce portability.

## Decision

Mnemonify prefers, in order:

1. templates and page patterns;
2. instructional and trigger recipes;
3. Analyzer profiles and rules;
4. embed-provider presets and import mappings;
5. executable plugins;
6. core schema changes only when a capability is broadly reusable and cannot be represented safely through earlier mechanisms.

## Consequences

- The core remains general-purpose.
- Pathology can serve as a flagship starter pack without defining the platform boundary.
- WSI and similar specialist services are integrated through embeds unless a proven unmet requirement justifies more.
- New schema proposals must demonstrate cross-domain value and migration implications.

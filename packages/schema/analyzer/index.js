// Phase 4.5c: the minimal technical Course Analyzer engine.
// analyzeCourse(courseJson) -> Finding[] is a pure function: deterministic,
// side-effect free, no randomness, no network/AI calls. Same input always
// produces the same findings (COURSE-ANALYZER.md section 1's own goal
// list, and this phase's explicit acceptance criterion).
//
// Builds the dependency index ONCE per call and hands it to every rule --
// rules never rebuild it themselves (see rules.js's own header comment).
// Importable by both the server (pre-publish gating, if/when a
// server-side publish flow needs it) and the editor (the live findings
// panel), the same "framework-agnostic, lives in packages/schema" pattern
// block-registry.js and dependency-index.js established in Phase 4.5b.

import { buildDependencyIndex, getBrokenReferences } from '../dependency-index.js';
import { RULES } from './rules.js';

export function analyzeCourse(courseJson, options = {}) {
  if (!courseJson) return [];
  const depIndex = options.dependencyIndex || buildDependencyIndex(courseJson);
  const context = {
    ...options,
    dependencyIndex: depIndex,
    brokenReferences: options.brokenReferences || getBrokenReferences(courseJson, depIndex),
  };
  const findings = [];
  for (const rule of RULES) {
    findings.push(...rule(courseJson, context));
  }
  return findings;
}

export function getBlockingFindings(findings = []) {
  return findings.filter((finding) => finding.severity === 'error');
}

export { RULES } from './rules.js';

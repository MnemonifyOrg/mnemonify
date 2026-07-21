// Phase 4.5c: the ~15 deterministic technical rules that make up the
// minimal Course Analyzer (COURSE-ANALYZER.md section 16 "Phase 1:
// foundation" -- finding model, schema/reference errors, basic
// accessibility checks, basic asset checks). Deliberately NOT built here:
// rule versioning/packs, analyzer profiles, confidence/evidence fields,
// suppression, snapshots, or any of the pedagogical/learning-alignment
// rule categories (sections 6.3 "trigger and logic" beyond broken
// references, 6.5-6.8) -- see DECISIONS.md for the explicit deferral.
//
// Every rule has the signature (course, depIndex) => Finding[], where
// depIndex is `buildDependencyIndex(course)`, built ONCE by the engine
// (analyzer/index.js) and passed to every rule -- rules never rebuild it
// themselves, and never re-walk triggers/conditions/asset-refs to answer
// "what references this" questions the dependency index (Phase 4.5b)
// already answers. Rules that need "does anything reference X" use a
// reverse lookup against depIndex; rules that need "does X exist" build a
// small local Set/inventory (a different, simpler concern than reference
// tracking, and not something the dependency index exposes).
//
// Finding shape (COURSE-ANALYZER.md section 3, simplified per this
// phase's Step 1 -- see DECISIONS.md for the full list of what's cut):
//   { ruleId, severity: 'error'|'warning', message, entityType, entityId,
//     location: { page_id?, block_id? } }

import { validateCourse } from '../index.js';
import { labelForBlock } from '../dependency-index.js';

// Walks every block on every page, including nested ones (two_column
// left/right, accordion/tabs item body_blocks) -- the same recursion
// shape already duplicated three times in this codebase for three
// different purposes (CourseEditor.jsx's id-remap functions, migration
// 0001, dependency-index.js's own walkBlock/buildDependencyIndex). This
// is a fourth, deliberately separate instance for a fourth distinct
// purpose (per-block rule predicates, not id-remapping or edge-building)
// -- see DECISIONS.md for why unifying the four into one generic walker
// was judged not worth the risk/complexity for this phase.
function collectAllBlocks(course) {
  const result = [];
  function walk(block, page) {
    if (!block) return;
    result.push({ block, page });
    if (block.left) walk(block.left, page);
    if (block.right) walk(block.right, page);
    for (const item of block.content?.items || []) {
      if (item && typeof item === 'object' && item.body_blocks) {
        for (const child of item.body_blocks) walk(child, page);
      }
    }
  }
  for (const page of course.pages || []) {
    for (const block of page.blocks || []) walk(block, page);
  }
  return result;
}

function collectBlockIds(course) {
  return new Set(collectAllBlocks(course).map(({ block }) => block.block_id));
}

function labelFor(block, page) {
  return labelForBlock(block, page.blocks);
}

function blockLocation(page, block) {
  return { page_id: page.page_id, block_id: block.block_id };
}

// Reverse lookup: every variable name whose depIndex entry contains an
// edge of the given referenceType owned by ownerId (a block_id or
// page_id, depending on referenceType). Reuses the index the same way a
// "used by" inspector would, rather than re-parsing a condition tree --
// see the visibility/continue-gate reachability rules below.
function variablesReadVia(depIndex, referenceType, ownerId) {
  const names = [];
  for (const [varName, edges] of Object.entries(depIndex)) {
    if (edges.some((e) => e.referenceType === referenceType && e.id === ownerId)) {
      names.push(varName);
    }
  }
  return names;
}

function isVariableEverWritten(varName, depIndex) {
  return (depIndex[varName] || []).some((e) => e.referenceType === 'trigger_writes_variable');
}

// ---------------------------------------------------------------------
// 1. SCHEMA VALIDITY / STRUCTURAL
// ---------------------------------------------------------------------

// Reuses the exact same ajv validator migration/loading already calls
// (packages/schema/index.js) -- does not reimplement schema checking.
export function ruleSchemaValidity(course) {
  const { valid, errors } = validateCourse(course);
  if (valid) return [];
  return errors.map((message) => ({
    ruleId: 'schema.invalid',
    severity: 'error',
    message: `This course fails schema validation: ${message}`,
    entityType: 'course',
    entityId: course.meta?.course_id || 'course',
    location: {},
  }));
}

// ---------------------------------------------------------------------
// 2-7. BROKEN REFERENCES -- one shared pass over depIndex, grouped by
// referenceType, checking each referenced id against the real entity
// collection it's supposed to name. A key present in depIndex but absent
// from that collection is, by definition, a broken reference: something
// still points at an id that no longer exists.
// ---------------------------------------------------------------------

// Rule 2 (+ continue_gate, the third variable-reading source
// dependency-index.js tracks): a trigger action/condition, or a page's
// continue_gate, references a variable name not in course.variables.
export function ruleBrokenVariableReferences(course, depIndex) {
  const validNames = new Set((course.variables || []).map((v) => v.name));
  const relevantTypes = new Set(['trigger_reads_variable', 'trigger_writes_variable', 'continue_gate_reads_variable']);
  const findings = [];
  for (const [varName, edges] of Object.entries(depIndex)) {
    if (validNames.has(varName)) continue;
    for (const edge of edges) {
      if (!relevantTypes.has(edge.referenceType)) continue;
      findings.push({
        ruleId: 'broken_ref.variable_missing',
        severity: 'error',
        message: `${edge.label} references a variable ("${varName}") that no longer exists.`,
        entityType: edge.entityType,
        entityId: edge.id,
        location: edge.entityType === 'block' ? { page_id: edge.pageId, block_id: edge.id } : { page_id: edge.pageId },
      });
    }
  }
  return findings;
}

// Rule 5: a block's own visibility_condition (P1-55) references a
// variable that no longer exists. Kept as its own rule (not folded into
// rule 2 above) because the task's own rule list separates it, and
// because it is authored in a different UI surface than a trigger.
export function ruleBrokenVisibilityVariableReferences(course, depIndex) {
  const validNames = new Set((course.variables || []).map((v) => v.name));
  const findings = [];
  for (const [varName, edges] of Object.entries(depIndex)) {
    if (validNames.has(varName)) continue;
    for (const edge of edges) {
      if (edge.referenceType !== 'visibility_condition_reads_variable') continue;
      findings.push({
        ruleId: 'broken_ref.visibility_variable_missing',
        severity: 'error',
        message: `${edge.label}'s visibility condition references a variable ("${varName}") that no longer exists.`,
        entityType: 'block',
        entityId: edge.id,
        location: { page_id: edge.pageId, block_id: edge.id },
      });
    }
  }
  return findings;
}

// Rule 3: a trigger's SHOW_BLOCK/HIDE_BLOCK/ENABLE_BLOCK/DISABLE_BLOCK
// target doesn't exist on the page (or anywhere). dependency-index.js
// collapses all four action types into one referenceType
// ('trigger_targets_block') since they share the same brokenness risk.
export function ruleBrokenBlockTargetReferences(course, depIndex) {
  const validBlockIds = collectBlockIds(course);
  const findings = [];
  for (const [targetId, edges] of Object.entries(depIndex)) {
    if (validBlockIds.has(targetId)) continue;
    for (const edge of edges) {
      if (edge.referenceType !== 'trigger_targets_block') continue;
      findings.push({
        ruleId: 'broken_ref.block_target_missing',
        severity: 'error',
        message: `${edge.label}'s trigger targets a block that no longer exists.`,
        entityType: 'block',
        entityId: edge.id,
        location: { page_id: edge.pageId, block_id: edge.id },
      });
    }
  }
  return findings;
}

// Rule 4: a trigger's (or a utility-bar custom item's) JUMP_TO_PAGE
// target doesn't exist in the course.
export function ruleBrokenPageTargetReferences(course, depIndex) {
  const validPageIds = new Set((course.pages || []).map((p) => p.page_id));
  const findings = [];
  for (const [targetId, edges] of Object.entries(depIndex)) {
    if (validPageIds.has(targetId)) continue;
    for (const edge of edges) {
      if (edge.referenceType !== 'trigger_navigates_to_page' && edge.referenceType !== 'utility_item_navigates_to_page') continue;
      findings.push({
        ruleId: 'broken_ref.page_target_missing',
        severity: 'error',
        message: `${edge.label} jumps to a page that no longer exists.`,
        entityType: edge.entityType,
        entityId: edge.id,
        location: edge.entityType === 'block' ? { page_id: edge.pageId, block_id: edge.id } : {},
      });
    }
  }
  return findings;
}

// Rule 6: a knowledge-check/image/video/audio/carousel block (or a
// rich-text inline asset link) references an asset_id not in
// course.assets.
export function ruleBrokenAssetReferences(course, depIndex) {
  const validAssetIds = new Set((course.assets || []).map((a) => a.asset_id));
  const findings = [];
  for (const [assetId, edges] of Object.entries(depIndex)) {
    if (validAssetIds.has(assetId)) continue;
    for (const edge of edges) {
      if (edge.referenceType !== 'block_uses_asset') continue;
      findings.push({
        ruleId: 'broken_ref.asset_missing',
        severity: 'error',
        message: `${edge.label} references an image or media file that no longer exists.`,
        entityType: 'block',
        entityId: edge.id,
        location: { page_id: edge.pageId, block_id: edge.id },
      });
    }
  }
  return findings;
}

// Rule 7: a page_group (meta.page_groups) references a page_id that
// doesn't exist. Not tracked by dependency-index.js at all (page_groups
// are a nav-drawer-only construct with no trigger/condition involvement),
// so this is a small standalone check rather than a depIndex reverse
// lookup -- there is no existing reference-tracking logic to reuse here.
export function rulePageGroupMissingPage(course) {
  const validPageIds = new Set((course.pages || []).map((p) => p.page_id));
  const findings = [];
  for (const group of course.meta?.page_groups || []) {
    for (const pageId of group.page_ids || []) {
      if (validPageIds.has(pageId)) continue;
      findings.push({
        ruleId: 'broken_ref.page_group_missing',
        severity: 'error',
        message: `Page group "${group.title}" references a page that no longer exists.`,
        entityType: 'page_group',
        entityId: group.group_id,
        location: {},
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------
// 8-11. ACCESSIBILITY (P1-11's pre-publish checklist requirements,
// formalized here -- see DECISIONS.md for confirmation there was no
// competing ad hoc checklist to consolidate).
// ---------------------------------------------------------------------

// Rule 8: an image block's asset has no alt text.
export function ruleImageMissingAlt(course) {
  const assetsById = new Map((course.assets || []).map((a) => [a.asset_id, a]));
  const findings = [];
  for (const { block, page } of collectAllBlocks(course)) {
    if (block.type !== 'image' || !block.content?.asset_id) continue;
    const asset = assetsById.get(block.content.asset_id);
    if (asset && !asset.alt?.trim()) {
      findings.push({
        ruleId: 'a11y.image_alt_missing',
        severity: 'warning',
        message: `${labelFor(block, page)} has no alt text.`,
        entityType: 'block',
        entityId: block.block_id,
        location: blockLocation(page, block),
      });
    }
  }
  return findings;
}

// Rule 9: a carousel block contains an image with no alt text.
export function ruleCarouselImageMissingAlt(course) {
  const assetsById = new Map((course.assets || []).map((a) => [a.asset_id, a]));
  const findings = [];
  for (const { block, page } of collectAllBlocks(course)) {
    if (block.type !== 'carousel') continue;
    const hasMissingAlt = (block.content?.asset_ids || []).some((id) => {
      const asset = assetsById.get(id);
      return asset && !asset.alt?.trim();
    });
    if (hasMissingAlt) {
      findings.push({
        ruleId: 'a11y.carousel_image_alt_missing',
        severity: 'warning',
        message: `${labelFor(block, page)} has at least one image with no alt text.`,
        entityType: 'block',
        entityId: block.block_id,
        location: blockLocation(page, block),
      });
    }
  }
  return findings;
}

// Rule 10: uploaded videos need ready captions. Caption status is
// denormalized onto the course asset by the editor from the server-side
// captions table so this pure analyzer can remain synchronous and free of
// database calls.
export function ruleVideoMissingCaptions(course) {
  const assetsById = new Map((course.assets || []).map((asset) => [asset.asset_id, asset]));
  const findings = [];
  for (const { block, page } of collectAllBlocks(course)) {
    if (block.type !== 'video' || !block.content?.asset_id) continue;
    const asset = assetsById.get(block.content.asset_id);
    if (asset && asset.caption_status === 'ready') continue;
    if (!asset) continue; // broken asset is reported by the reference rule.
    findings.push({
      ruleId: 'a11y.video_captions_missing',
      severity: 'warning',
      message: `${labelFor(block, page)} has no generated or uploaded captions ready for review.`,
      entityType: 'block',
      entityId: block.block_id,
      location: blockLocation(page, block),
    });
  }
  return findings;
}

export function ruleVideoCaptionsUnreviewed(course) {
  const assetsById = new Map((course.assets || []).map((asset) => [asset.asset_id, asset]));
  const findings = [];
  for (const { block, page } of collectAllBlocks(course)) {
    if (block.type !== 'video' || !block.content?.asset_id) continue;
    const asset = assetsById.get(block.content.asset_id);
    if (!asset || asset.caption_status !== 'ready' || asset.caption_review_status === 'reviewed') continue;
    findings.push({
      ruleId: 'a11y.video_captions_unreviewed',
      severity: 'warning',
      message: `${labelFor(block, page)} has captions that have not been marked reviewed.`,
      entityType: 'block',
      entityId: block.block_id,
      location: blockLocation(page, block),
    });
  }
  return findings;
}

export function ruleAudioMissingTranscript(course) {
  const assetsById = new Map((course.assets || []).map((asset) => [asset.asset_id, asset]));
  const findings = [];
  for (const { block, page } of collectAllBlocks(course)) {
    if (block.type !== 'audio' || !block.content?.asset_id) continue;
    const asset = assetsById.get(block.content.asset_id);
    if (asset && asset.transcript_status === 'ready') continue;
    if (!asset) continue;
    findings.push({
      ruleId: 'a11y.audio_transcript_missing',
      severity: 'warning',
      message: `${labelFor(block, page)} has no transcript ready for learners.`,
      entityType: 'block',
      entityId: block.block_id,
      location: blockLocation(page, block),
    });
  }
  return findings;
}

// Rule 11: a table has more than one row of actual data and no caption.
// "More than one row" excludes the header row when has_header_row is
// set, matching the plain-English reading of "a table with more than one
// row of data" rather than counting the header as data.
export function ruleTableMissingCaption(course) {
  const findings = [];
  for (const { block, page } of collectAllBlocks(course)) {
    if (block.type !== 'table') continue;
    const rows = block.content?.rows || [];
    const dataRowCount = block.content?.has_header_row ? rows.length - 1 : rows.length;
    const hasCaption = !!block.content?.caption?.trim();
    if (!hasCaption && dataRowCount > 1) {
      findings.push({
        ruleId: 'a11y.table_caption_missing',
        severity: 'warning',
        message: `${labelFor(block, page)} has multiple rows of data but no caption for screen reader users.`,
        entityType: 'block',
        entityId: block.block_id,
        location: blockLocation(page, block),
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------
// 12-14. UNUSED / DEAD ENTITIES (via depIndex reverse lookup -- "does
// anything reference this?").
// ---------------------------------------------------------------------

// Rule 12: a variable defined but never referenced by any trigger or
// visibility_condition (or continue_gate, the third reader depIndex
// tracks).
export function ruleUnusedVariable(course, depIndex) {
  const usedTypes = new Set([
    'trigger_reads_variable',
    'trigger_writes_variable',
    'visibility_condition_reads_variable',
    'continue_gate_reads_variable',
  ]);
  const findings = [];
  for (const variable of course.variables || []) {
    const edges = depIndex[variable.name] || [];
    const used = edges.some((e) => usedTypes.has(e.referenceType));
    if (!used) {
      findings.push({
        ruleId: 'unused.variable',
        severity: 'warning',
        message: `Variable "${variable.name}" is defined but never used in any trigger or visibility condition.`,
        entityType: 'variable',
        entityId: variable.name,
        location: {},
      });
    }
  }
  return findings;
}

// Rule 13: an uploaded asset not referenced by any block.
export function ruleUnusedAsset(course, depIndex) {
  const findings = [];
  for (const asset of course.assets || []) {
    const edges = depIndex[asset.asset_id] || [];
    const used = edges.some((e) => e.referenceType === 'block_uses_asset');
    if (!used) {
      findings.push({
        ruleId: 'unused.asset',
        severity: 'warning',
        message: `This ${asset.kind} is uploaded but not used anywhere in the course.`,
        entityType: 'asset',
        entityId: asset.asset_id,
        location: {},
      });
    }
  }
  return findings;
}

// Rule 14: a block hidden until shown by a trigger, or gated by its own
// visibility_condition, that nothing in the course can ever actually
// reveal.
//
// Two different "reachable" tests, matched to how each mechanism is
// shown, using ONLY depIndex reverse lookups (no re-walking triggers or
// conditions, per this phase's own "don't duplicate reference-tracking
// logic" instruction):
//  - `visibility.initial: 'hidden'` (the trigger-only toggle) is shown by
//    a SHOW_BLOCK/ENABLE_BLOCK trigger action targeting this block_id.
//    dependency-index.js collapses SHOW/HIDE/ENABLE/DISABLE into one
//    referenceType, so this is deliberately a coarser check: "does ANY
//    trigger target this block at all" -- if not, it is certainly
//    unreachable; if something targets it, it MIGHT still only ever be
//    hidden further (a HIDE_BLOCK/DISABLE_BLOCK), which this simplified
//    v1 check will not catch. Documented as a known simplification in
//    DECISIONS.md rather than re-implementing action-type-aware walking.
//  - `visibility_condition` is shown when its variable(s) become true,
//    which happens only via a SET_VAR/ADJUST_VAR trigger action writing
//    that variable somewhere in the course -- reusing the exact same
//    "is this variable ever written" check as rule 15 below.
export function ruleUnreachableBlock(course, depIndex) {
  const findings = [];
  for (const { block, page } of collectAllBlocks(course)) {
    if (block.visibility_condition) {
      const varsRead = variablesReadVia(depIndex, 'visibility_condition_reads_variable', block.block_id);
      const anyWritten = varsRead.some((v) => isVariableEverWritten(v, depIndex));
      if (varsRead.length > 0 && !anyWritten) {
        findings.push({
          ruleId: 'unused.unreachable_block',
          severity: 'warning',
          message: `${labelFor(block, page)} is only shown when a condition is met, but no trigger in the course ever sets the variable it depends on -- this content may be unreachable.`,
          entityType: 'block',
          entityId: block.block_id,
          location: blockLocation(page, block),
        });
      }
    } else if (block.visibility?.initial === 'hidden') {
      const edges = depIndex[block.block_id] || [];
      const everTargeted = edges.some((e) => e.referenceType === 'trigger_targets_block');
      if (!everTargeted) {
        findings.push({
          ruleId: 'unused.unreachable_block',
          severity: 'warning',
          message: `${labelFor(block, page)} is hidden until shown by a trigger, but no trigger in the course ever targets it -- this content may be unreachable.`,
          entityType: 'block',
          entityId: block.block_id,
          location: blockLocation(page, block),
        });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------
// 15. COMPLETENESS
// ---------------------------------------------------------------------

// Rule 15: a page's continue_gate condition references a variable that
// no trigger anywhere in the course ever sets -- the gate can never be
// satisfied, permanently blocking the learner on that page. Same
// "is this variable ever written" heuristic as rule 14's
// visibility_condition check, applied to continue_gate instead. Marked
// WARNING, not ERROR, despite being a real authoring mistake: unlike the
// broken-reference rules above (a referenced id either exists or it
// doesn't, zero false-positive risk), this is a heuristic over "no
// plausible trigger sets it" -- see DECISIONS.md for the severity
// reasoning.
export function ruleUnsatisfiableContinueGate(course, depIndex) {
  const findings = [];
  for (const page of course.pages || []) {
    if (!page.continue_gate) continue;
    const varsRead = variablesReadVia(depIndex, 'continue_gate_reads_variable', page.page_id);
    const anyWritten = varsRead.some((v) => isVariableEverWritten(v, depIndex));
    if (varsRead.length > 0 && !anyWritten) {
      findings.push({
        ruleId: 'completeness.unsatisfiable_continue_gate',
        severity: 'warning',
        message: `"${page.title}"'s Continue gate depends on a variable that no trigger in the course ever sets -- learners may never be able to continue past this page.`,
        entityType: 'page',
        entityId: page.page_id,
        location: { page_id: page.page_id },
      });
    }
  }
  return findings;
}

export const RULES = [
  ruleSchemaValidity,
  ruleBrokenVariableReferences,
  ruleBrokenVisibilityVariableReferences,
  ruleBrokenBlockTargetReferences,
  ruleBrokenPageTargetReferences,
  ruleBrokenAssetReferences,
  rulePageGroupMissingPage,
  ruleImageMissingAlt,
  ruleCarouselImageMissingAlt,
  ruleVideoMissingCaptions,
  ruleVideoCaptionsUnreviewed,
  ruleAudioMissingTranscript,
  ruleTableMissingCaption,
  ruleUnusedVariable,
  ruleUnusedAsset,
  ruleUnreachableBlock,
  ruleUnsatisfiableContinueGate,
];

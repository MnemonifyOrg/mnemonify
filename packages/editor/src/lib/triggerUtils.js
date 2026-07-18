import { genTriggerId } from './idGen.js';
import { BLOCK_LABELS } from './blockDefaults.js';

// Which events make sense for which block type (Phase 4 Part 2 Step 3).
// Block types not listed here get no Triggers section at all in the
// settings panel (table, list, text, heading, two_column, reflection --
// "no meaningful interaction events of their own" -- and embed, for the
// same reason: an iframe's internal content is cross-origin and the player
// has no reliable way to observe a click inside it). onPageEnter/onPageExit
// are deliberately NOT included here even though the schema's trigger.event
// enum allows them on any block -- Part 2 treats them as page-level events
// authored in Page Settings (page.triggers), not per-block, since the
// schema already has a dedicated page.triggers array (added in Part 1 for
// the same reason) and a single "this page was entered/exited" concept is
// clearer than the same event duplicated on every block on the page. See
// DECISIONS.md. `button` doesn't exist in this codebase yet (Phase 5+), so
// its events are not represented here. video/audio (Phase 4 Part 3) get
// only `onComplete` ("this finishes playing") -- onPlay/onPause exist in
// ARCHITECTURE.md 4's event list but have no author-facing use case in
// Part 3's minimal media block scope (no interactive-video/timeline work),
// so they're deliberately left out here, same as onTimeReached.
export const EVENTS_BY_BLOCK_TYPE = {
  accordion: ['onOpen', 'onClose'],
  tabs: ['onOpen', 'onClose'],
  'knowledge-check': ['onCorrect', 'onIncorrect', 'onComplete'],
  image: ['onClick'],
  carousel: ['onClick'],
  video: ['onComplete'],
  audio: ['onComplete'],
};

export const PAGE_EVENTS = ['onPageEnter', 'onPageExit'];

export const EVENT_LABELS = {
  onOpen: 'this opens',
  onClose: 'this closes',
  onCorrect: 'answered correctly',
  onIncorrect: 'answered incorrectly',
  onClick: 'this is clicked',
  onPageEnter: 'the learner enters this page',
  onPageExit: 'the learner leaves this page',
};

// onComplete means something different depending on which block type owns
// it (knowledge-check: "an answer is submitted"; video/audio: "playback
// finishes") -- a flat EVENT_LABELS lookup can't express that, so this is
// the one event that needs the owning block's type to render correctly.
// Every other event's label is unambiguous regardless of block type.
export function eventLabelFor(event, blockType) {
  if (event === 'onComplete') {
    return blockType === 'video' || blockType === 'audio' ? 'this finishes playing' : 'an answer is submitted';
  }
  return EVENT_LABELS[event] || event;
}

// Action types with Part 2 authoring UI. OPEN_MODAL, ENABLE_BLOCK,
// DISABLE_BLOCK, SET_STATE, SCORM_COMPLETE, SCORM_SET_SCORE are valid per
// the schema (built ahead of their UI, same pattern as Phase 3.5's schema
// hooks) but have no author-facing use case yet in this codebase -- see
// DECISIONS.md.
export const ACTION_TYPES = ['SET_VAR', 'ADJUST_VAR', 'SHOW_BLOCK', 'HIDE_BLOCK', 'JUMP_TO_PAGE'];

export const ACTION_LABELS = {
  SET_VAR: 'Set a variable',
  ADJUST_VAR: 'Increase/decrease a variable',
  SHOW_BLOCK: 'Show a block',
  HIDE_BLOCK: 'Hide a block',
  JUMP_TO_PAGE: 'Jump to a page',
};

export const COMPARISON_LABELS = {
  '==': 'equals',
  '!=': 'does not equal',
  '>': 'greater than',
  '<': 'less than',
  '>=': 'greater than or equal to',
  '<=': 'less than or equal to',
};

// Which comparison operators are offered for a variable of a given type
// (Step 4). Boolean gets only "is" (== under the hood); Number gets the
// full numeric set (no !=, matching the task's literal list); Text gets
// equals/does not equal only.
export function comparisonsForType(type) {
  if (type === 'boolean') return ['=='];
  if (type === 'number') return ['==', '>', '<', '>=', '<='];
  return ['==', '!='];
}

export function defaultValueForType(type) {
  if (type === 'boolean') return false;
  if (type === 'number') return 0;
  return '';
}

// Auto-generated fallback label, e.g. "Image (3)" -- the block's 1-indexed
// position among blocks of the SAME type on the current page (P1-56,
// Phase 4 usability-fix session). Replaces the old content-snippet fallback
// ("Image: ..."), which had no snippet at all for image blocks -- the exact
// real-user complaint this fixes (several images on one page were all just
// "Image" in the SHOW_BLOCK dropdown, indistinguishable from each other).
// Position is computed live from pageBlocks rather than stored, so it's
// always consistent with the blocks actually on the page today -- it can
// shift if an earlier same-type block is deleted, same as it would for any
// author eyeballing "the 3rd image on this page." pageBlocks is optional
// (some callers, e.g. describeCondition, don't have it in scope) -- falls
// back to the bare type label when omitted.
export function autoBlockLabel(block, pageBlocks) {
  const typeLabel = BLOCK_LABELS[block.type] || block.type;
  if (!pageBlocks) return typeLabel;
  const sameType = pageBlocks.filter((b) => b.type === block.type);
  const position = sameType.findIndex((b) => b.block_id === block.block_id) + 1;
  return position > 0 ? `${typeLabel} (${position})` : typeLabel;
}

// Short, readable label for a block, for use in SHOW_BLOCK/HIDE_BLOCK
// pickers and trigger sentences where the author only ever sees a block_id
// in the raw JSON -- meaningless to a non-technical author (Step 5). Prefers
// the block's own author-set `label` (P1-56) once set; falls back to the
// auto-generated position label.
export function blockLabel(block, pageBlocks) {
  if (block.label && block.label.trim()) return block.label.trim();
  return autoBlockLabel(block, pageBlocks);
}

export function newTriggerId() {
  return genTriggerId();
}

// Normalizes a condition (schema shape: bare comparison | {all:[...]} |
// {any:[...]} | null/undefined) into an editable { operator, rows } shape.
// Part 2 constrains authoring to a single operator per condition (ALL-AND
// or ALL-OR, never mixed/nested) -- see DECISIONS.md for why.
export function conditionToRows(condition) {
  if (!condition) return { operator: 'all', rows: [] };
  if (condition.all) return { operator: 'all', rows: condition.all };
  if (condition.any) return { operator: 'any', rows: condition.any };
  return { operator: 'all', rows: [condition] };
}

// Inverse of conditionToRows -- collapses back to the schema shape,
// omitting the all/any wrapper entirely for a single-row condition (keeps
// the stored JSON as simple as the schema allows, and matches
// evaluateCondition's own handling of a bare comparison).
export function rowsToCondition(operator, rows) {
  const validRows = rows.filter((r) => r.var);
  if (validRows.length === 0) return null;
  if (validRows.length === 1) return validRows[0];
  return { [operator]: validRows };
}

function describeComparison(row, variables) {
  const variable = variables.find((v) => v.name === row.var);
  const varLabel = row.var || '(unknown variable)';
  if (variable?.type === 'boolean') {
    return `${varLabel} is ${row.value ? 'true' : 'false'}`;
  }
  const opLabel = COMPARISON_LABELS[row.op] || row.op;
  const valueLabel = typeof row.value === 'string' ? `"${row.value}"` : String(row.value);
  return `${varLabel} ${opLabel} ${valueLabel}`;
}

// Renders a condition back as a plain-English fragment, e.g.
// "readIntro is true" or "score greater than 5 AND attempts equals 1"
// (Step 5: "triggers display back as readable sentences").
export function describeCondition(condition, variables) {
  const { operator, rows } = conditionToRows(condition);
  if (rows.length === 0) return '';
  return rows.map((row) => describeComparison(row, variables)).join(operator === 'any' ? ' OR ' : ' AND ');
}

function describeAction(action, { pageBlocks, pages }) {
  switch (action.action) {
    case 'SET_VAR': {
      const valueLabel = typeof action.value === 'string' ? `"${action.value}"` : String(action.value);
      return `set ${action.var} to ${valueLabel}`;
    }
    case 'ADJUST_VAR': {
      const amount = Number(action.value) || 0;
      return amount < 0 ? `decrease ${action.var} by ${Math.abs(amount)}` : `increase ${action.var} by ${amount}`;
    }
    case 'SHOW_BLOCK': {
      const target = pageBlocks.find((b) => b.block_id === action.target);
      return `show ${target ? blockLabel(target, pageBlocks) : 'the selected block'}`;
    }
    case 'HIDE_BLOCK': {
      const target = pageBlocks.find((b) => b.block_id === action.target);
      return `hide ${target ? blockLabel(target, pageBlocks) : 'the selected block'}`;
    }
    case 'JUMP_TO_PAGE': {
      const target = pages.find((p) => p.page_id === action.target);
      return `jump to "${target ? target.title : 'the selected page'}"`;
    }
    default:
      return action.action;
  }
}

// Renders a full trigger as a plain sentence (Step 5), e.g.:
// "When this accordion opens, if readIntro is true, show Text: 'Great...'"
export function describeTrigger(trigger, { pageBlocks, pages, variables, blockType }) {
  const eventLabel = eventLabelFor(trigger.event, blockType);
  const conditionText = trigger.condition ? describeCondition(trigger.condition, variables) : '';
  const actionsText = (trigger.actions || [])
    .map((a) => describeAction(a, { pageBlocks, pages }))
    .join(', and ');
  let sentence = `When ${eventLabel}`;
  if (conditionText) sentence += `, if ${conditionText}`;
  sentence += `, ${actionsText}.`;
  return sentence;
}

// Every place a variable name can appear in a course document -- used by
// the Variable Manager's delete-warning (Step 1: "used in 3 places").
// Walks conditions (nested all/any) and action.var, across block triggers
// (including nested body_blocks/two-column slots) and page-level triggers
// and continue_gate.
function countInCondition(condition, varName) {
  if (!condition) return 0;
  if (condition.all || condition.any) {
    return (condition.all || condition.any).reduce((sum, c) => sum + countInCondition(c, varName), 0);
  }
  return condition.var === varName ? 1 : 0;
}

function countInTriggers(triggers, varName) {
  return (triggers || []).reduce((sum, trigger) => {
    let count = countInCondition(trigger.condition, varName);
    count += (trigger.actions || []).filter((a) => a.var === varName).length;
    return sum + count;
  }, 0);
}

function countInBlock(block, varName) {
  let count = countInTriggers(block.triggers, varName);
  if (block.left) count += countInBlock(block.left, varName);
  if (block.right) count += countInBlock(block.right, varName);
  if (block.content?.items) {
    block.content.items.forEach((item) => {
      if (item && typeof item === 'object' && item.body_blocks) {
        item.body_blocks.forEach((child) => {
          count += countInBlock(child, varName);
        });
      }
    });
  }
  return count;
}

export function countVariableUsages(courseJson, varName) {
  let count = 0;
  (courseJson.pages || []).forEach((page) => {
    count += countInTriggers(page.triggers, varName);
    count += countInCondition(page.continue_gate, varName);
    (page.blocks || []).forEach((block) => {
      count += countInBlock(block, varName);
    });
  });
  return count;
}

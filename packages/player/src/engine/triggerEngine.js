/*
  Trigger and variable engine core (ARCHITECTURE.md Section 4).
  Pure functions: given (state, event) -> (new state, effects), per the rule
  documented in ARCHITECTURE.md 4. Phase 1 fully implemented SET_VAR /
  ADJUST_VAR, which mutate `variables` directly. Phase 4 Part 2 adds
  SHOW_BLOCK / HIDE_BLOCK / JUMP_TO_PAGE / JUMP_TO_TIMESTAMP / OPEN_MODAL,
  which do NOT mutate `variables` --
  block visibility and page navigation are separate pieces of runtime state
  the player owns (App.jsx's blockVisibility map and currentPageId), so
  these are returned as `effects` for the caller to apply, rather than
  folded into the variables object the way SET_VAR/ADJUST_VAR are. This
  keeps the engine itself free of any React/DOM knowledge -- it only ever
  returns data. ENABLE_BLOCK/DISABLE_BLOCK/OPEN_LIGHTBOX/SET_STATE/
  SCORM_COMPLETE/SCORM_SET_SCORE are still deferred (no Part 2 authoring UI
  exists for them yet -- see DECISIONS.md).
*/

const VARIABLE_ACTIONS = new Set(['SET_VAR', 'ADJUST_VAR']);
const EFFECT_ACTIONS = new Set(['SHOW_BLOCK', 'HIDE_BLOCK', 'JUMP_TO_PAGE', 'JUMP_TO_TIMESTAMP', 'OPEN_MODAL']);
const IMPLEMENTED_ACTIONS = new Set([...VARIABLE_ACTIONS, ...EFFECT_ACTIONS]);

export function evaluateCondition(condition, variables) {
  if (!condition) return true;
  if (condition.all) return condition.all.every((c) => evaluateCondition(c, variables));
  if (condition.any) return condition.any.some((c) => evaluateCondition(c, variables));

  const { var: varName, op, value } = condition;
  const current = variables[varName];
  switch (op) {
    case '==':
      return current === value;
    case '!=':
      return current !== value;
    case '>':
      return current > value;
    case '<':
      return current < value;
    case '>=':
      return current >= value;
    case '<=':
      return current <= value;
    default:
      return false;
  }
}

export function applyAction(variables, action) {
  if (action.action === 'SET_VAR') {
    const next = { ...variables, [action.var]: action.value };
    console.log(`[trigger-engine] SET_VAR ${action.var}: ${variables[action.var]} -> ${action.value}`);
    return next;
  }
  if (action.action === 'ADJUST_VAR') {
    const prev = variables[action.var] ?? 0;
    const next = { ...variables, [action.var]: prev + action.value };
    console.log(`[trigger-engine] ADJUST_VAR ${action.var}: ${prev} -> ${next[action.var]}`);
    return next;
  }
  console.warn(`[trigger-engine] action "${action.action}" is not implemented yet (Phase 1 scope)`);
  return variables;
}

// Returns { variables, effects } -- see the header comment above for why
// SHOW_BLOCK/HIDE_BLOCK/JUMP_TO_PAGE come back as effects rather than being
// applied here. Every trigger whose condition (if any) evaluates true
// against the variables state *as of that trigger's turn* runs in order;
// each trigger's own actions can affect the variables the next trigger's
// condition sees (e.g. two onOpen triggers on the same block, the first
// setting a variable the second's condition reads).
export function runTriggers(variables, triggers, eventName) {
  let nextVariables = variables;
  const effects = [];
  (triggers || [])
    .filter((trigger) => trigger.event === eventName)
    .forEach((trigger) => {
      // Condition is checked here, per-trigger at execution time -- not in
      // an earlier .filter() pass over the whole list. A .filter() pass
      // would evaluate every trigger's condition against the *original*
      // variables before any trigger's actions had run, which breaks the
      // exact case Part 2's own integration test exercises: two triggers
      // on the same event, the first setting a variable the second's
      // condition reads (see DECISIONS.md).
      if (!evaluateCondition(trigger.condition, nextVariables)) return;
      trigger.actions.forEach((action) => {
        if (VARIABLE_ACTIONS.has(action.action)) {
          nextVariables = applyAction(nextVariables, action);
        } else if (EFFECT_ACTIONS.has(action.action)) {
          effects.push(action);
        } else {
          console.warn(`[trigger-engine] action "${action.action}" is not implemented yet (Phase 4 Part 2 scope)`);
        }
      });
    });
  return { variables: nextVariables, effects };
}

export function isActionImplemented(actionName) {
  return IMPLEMENTED_ACTIONS.has(actionName);
}

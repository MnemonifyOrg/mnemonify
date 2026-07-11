/*
  Trigger and variable engine core (ARCHITECTURE.md Section 4).
  Pure functions: given (variables, action) -> new variables.
  Phase 1 fully implements SET_VAR / ADJUST_VAR, since the sample course only
  exercises SET_VAR on onOpen. Other actions in the documented vocabulary are
  accepted but deferred to the phase that builds the UI/behavior consuming them.
*/

const IMPLEMENTED_ACTIONS = new Set(['SET_VAR', 'ADJUST_VAR']);

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

export function runTriggers(variables, triggers, eventName) {
  let nextVariables = variables;
  (triggers || [])
    .filter((trigger) => trigger.event === eventName)
    .filter((trigger) => evaluateCondition(trigger.condition, nextVariables))
    .forEach((trigger) => {
      trigger.actions.forEach((action) => {
        nextVariables = applyAction(nextVariables, action);
      });
    });
  return nextVariables;
}

export function isActionImplemented(actionName) {
  return IMPLEMENTED_ACTIONS.has(actionName);
}

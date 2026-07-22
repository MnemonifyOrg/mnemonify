// Built-in learner variables maintained by the player. They are exposed to
// conditions as read-only values, but never belong in course.variables.
export const SYSTEM_VARIABLE_DEFINITIONS = [
  { name: 'ScoreRaw', type: 'number', default: 0, system: true, readOnly: true },
  { name: 'ScoreMax', type: 'number', default: 0, system: true, readOnly: true },
  { name: 'ScorePercent', type: 'number', default: 0, system: true, readOnly: true },
  { name: 'ScorePassed', type: 'boolean', default: false, system: true, readOnly: true },
];

export const RESERVED_SYSTEM_VARIABLE_NAMES = new Set(
  SYSTEM_VARIABLE_DEFINITIONS.map(({ name }) => name.toLowerCase())
);

export function isReservedSystemVariableName(name) {
  return RESERVED_SYSTEM_VARIABLE_NAMES.has(String(name || '').trim().toLowerCase());
}

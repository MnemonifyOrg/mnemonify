import { comparisonsForType, COMPARISON_LABELS, conditionToRows, defaultValueForType, rowsToCondition } from '../lib/triggerUtils.js';

function emptyRow(variable) {
  return {
    var: variable?.name || '',
    op: comparisonsForType(variable?.type)[0] || '==',
    value: defaultValueForType(variable?.type),
  };
}

export function ValueInput({ variable, value, onChange }) {
  if (!variable) return null;
  if (variable.type === 'boolean') {
    return (
      <select className="input" value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')}>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }
  if (variable.type === 'number') {
    return (
      <input
        type="number"
        className="input"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  return <input type="text" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

// Shared condition-row builder (Phase 4 Part 2 Step 4): used both for a
// trigger's optional "if" condition and a page's Continue gate. Constrained
// to a single AND/OR operator across all rows in one condition, never mixed
// or nested -- a deliberate v1 simplification (full nested {all/any} logic
// is representable by the schema/engine already, just not authorable here
// yet). See DECISIONS.md.
export default function ConditionBuilder({ variables, value, onChange, onOpenVariableManager, toggleLabel = 'Only if…' }) {
  const { operator, rows } = conditionToRows(value);
  const enabled = rows.length > 0;

  function commit(nextOperator, nextRows) {
    onChange(rowsToCondition(nextOperator, nextRows));
  }

  function handleToggle(e) {
    commit(operator, e.target.checked ? [emptyRow(variables[0])] : []);
  }

  function updateRow(index, patch) {
    commit(operator, rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function changeRowVariable(index, varName) {
    const variable = variables.find((v) => v.name === varName);
    updateRow(index, emptyRow(variable));
  }

  return (
    <div className="condition-builder">
      <label className="settings-panel__checkbox-row">
        <input type="checkbox" checked={enabled} onChange={handleToggle} />
        {toggleLabel}
      </label>

      {enabled && variables.length === 0 && (
        <p className="condition-builder__empty">
          No variables yet — create one first.{' '}
          {onOpenVariableManager && (
            <button type="button" className="btn-text" onClick={onOpenVariableManager}>
              Open Variable Manager
            </button>
          )}
        </p>
      )}

      {enabled && variables.length > 0 && (
        <>
          {rows.map((row, index) => {
            const variable = variables.find((v) => v.name === row.var) || variables[0];
            return (
              <div className="condition-builder__row" key={index}>
                {index === 1 && rows.length > 1 && (
                  <div className="condition-builder__operator">
                    <button
                      type="button"
                      className={operator === 'all' ? 'btn btn-primary' : 'btn'}
                      onClick={() => commit('all', rows)}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      className={operator === 'any' ? 'btn btn-primary' : 'btn'}
                      onClick={() => commit('any', rows)}
                    >
                      OR
                    </button>
                  </div>
                )}
                <select className="input" value={row.var} onChange={(e) => changeRowVariable(index, e.target.value)}>
                  {variables.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.type}){v.readOnly ? ' — built-in' : ''}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={row.op}
                  onChange={(e) => updateRow(index, { op: e.target.value })}
                  disabled={variable?.type === 'boolean'}
                >
                  {comparisonsForType(variable?.type).map((op) => (
                    <option key={op} value={op}>
                      {variable?.type === 'boolean' ? 'is' : COMPARISON_LABELS[op]}
                    </option>
                  ))}
                </select>
                <ValueInput variable={variable} value={row.value} onChange={(v) => updateRow(index, { value: v })} />
                {rows.length > 1 && (
                  <button type="button" className="btn-text" title="Remove condition" onClick={() => commit(operator, rows.filter((_, i) => i !== index))}>
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          <button type="button" className="btn-text" onClick={() => commit(operator, [...rows, emptyRow(variables[0])])}>
            + Add another condition
          </button>
        </>
      )}
    </div>
  );
}

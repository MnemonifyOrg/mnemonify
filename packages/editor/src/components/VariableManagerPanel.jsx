import { useState } from 'react';
import { defaultValueForType } from '../lib/triggerUtils.js';
import { ValueInput } from './ConditionBuilder.jsx';
import { genVariableId } from '../lib/idGen.js';
import { getDependents } from '@mnemonify/schema/dependency-index.js';

const NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateName(name, variables, editingName) {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (!NAME_PATTERN.test(trimmed)) return 'Use letters, numbers, and underscores only -- no spaces, must not start with a number.';
  const isDuplicate = variables.some((v) => v.name === trimmed && v.name !== editingName);
  if (isDuplicate) return 'A variable with this name already exists.';
  return '';
}

function VariableForm({ initial, variables, editingName, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'boolean');
  const [defaultValue, setDefaultValue] = useState(initial?.default ?? defaultValueForType('boolean'));
  const [touched, setTouched] = useState(false);

  const error = validateName(name, variables, editingName);

  function changeType(nextType) {
    setType(nextType);
    setDefaultValue(defaultValueForType(nextType));
  }

  function handleSave() {
    setTouched(true);
    if (error) return;
    onSave({ name: name.trim(), type, default: defaultValue });
  }

  return (
    <div className="variable-manager__form">
      <label>Name</label>
      <input
        className="input"
        value={name}
        disabled={!!editingName}
        placeholder="e.g. readIntro"
        onChange={(e) => setName(e.target.value)}
      />
      {touched && error && <p className="variable-manager__error">{error}</p>}
      {editingName && <p className="variable-manager__hint">A variable's name can't be changed once created -- it's how triggers reference it.</p>}

      <label>Type</label>
      <select className="input" value={type} onChange={(e) => changeType(e.target.value)}>
        <option value="boolean">Boolean (true/false)</option>
        <option value="number">Number</option>
        <option value="text">Text</option>
      </select>

      <label>Default value</label>
      <ValueInput variable={{ type }} value={defaultValue} onChange={setDefaultValue} />

      <div className="variable-manager__form-actions">
        <button type="button" className="btn-text" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}

// Course-level Variable Manager (Phase 4 Part 2 Step 1). Writes directly to
// course.variables, matching the existing schema shape (name/type/default)
// -- no schema change needed, since this was already defined ahead of its
// UI. Every variable also carries a stable `variable_id` (Phase 4.5a,
// DECISIONS.md) minted once on creation and preserved across edits --
// triggers/conditions still reference variables by `name`, unchanged, since
// rewiring that resolution path is a runtime-engine change out of 4.5a's
// scope, not an identity one. Edit can change type/default but not name,
// to avoid silently orphaning every trigger/condition that already
// references it by name.
export default function VariableManagerPanel({ variables, courseJson, onChangeVariables }) {
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState(null);

  function handleAdd(variable) {
    onChangeVariables([...variables, { variable_id: genVariableId(), ...variable }], { forceSnapshot: true });
    setAdding(false);
  }

  function handleEdit(variable) {
    onChangeVariables(
      variables.map((v) => (v.name === editingName ? { ...variable, variable_id: v.variable_id || genVariableId() } : v)),
      { forceSnapshot: true }
    );
    setEditingName(null);
  }

  function handleDelete(name) {
    const usageCount = getDependents(name, courseJson).length;
    if (usageCount > 0) {
      const place = usageCount === 1 ? 'place' : 'places';
      if (!window.confirm(`This variable is used in ${usageCount} ${place}. Delete anyway?`)) return;
    }
    onChangeVariables(
      variables.filter((v) => v.name !== name),
      { forceSnapshot: true }
    );
  }

  return (
    <div className="settings-panel__section variable-manager">
      <h3>Variables</h3>
      <p className="settings-panel__hint">
        Named values your course can remember and react to -- attach a trigger to a block to set one, and use it in a
        trigger's condition or a page's Continue gate.
      </p>

      {variables.length === 0 && !adding && <p className="settings-panel__empty">No variables yet.</p>}

      <ul className="variable-manager__list">
        {variables.map((variable) =>
          editingName === variable.name ? (
            <li key={variable.name} className="variable-manager__item">
              <VariableForm
                initial={variable}
                variables={variables}
                editingName={variable.name}
                onSave={handleEdit}
                onCancel={() => setEditingName(null)}
              />
            </li>
          ) : (
            <li key={variable.name} className="variable-manager__item">
              <span className="variable-manager__name">{variable.name}</span>
              <span className="variable-manager__type">{variable.type}</span>
              <span className="variable-manager__default">default: {String(variable.default)}</span>
              <div className="variable-manager__item-actions">
                <button type="button" className="btn-text" onClick={() => setEditingName(variable.name)}>
                  Edit
                </button>
                <button type="button" className="btn-text" onClick={() => handleDelete(variable.name)}>
                  Delete
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {adding ? (
        <VariableForm variables={variables} onSave={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" className="btn" onClick={() => setAdding(true)}>
          + Add Variable
        </button>
      )}
    </div>
  );
}

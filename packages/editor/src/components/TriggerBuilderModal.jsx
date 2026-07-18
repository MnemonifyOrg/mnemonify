import { useState } from 'react';
import ConditionBuilder, { ValueInput } from './ConditionBuilder.jsx';
import { ACTION_LABELS, ACTION_TYPES, blockLabel, defaultValueForType, EVENT_LABELS, newTriggerId } from '../lib/triggerUtils.js';

function emptyAction(type, variables, pageBlocks, pages) {
  if (type === 'SET_VAR') {
    const v = variables[0];
    return { action: 'SET_VAR', var: v?.name || '', value: defaultValueForType(v?.type) };
  }
  if (type === 'ADJUST_VAR') {
    const numberVar = variables.find((v) => v.type === 'number');
    return { action: 'ADJUST_VAR', var: numberVar?.name || '', value: 1 };
  }
  if (type === 'SHOW_BLOCK' || type === 'HIDE_BLOCK') {
    return { action: type, target: pageBlocks[0]?.block_id || '' };
  }
  return { action: 'JUMP_TO_PAGE', target: pages[0]?.page_id || '' };
}

function ActionRow({ action, variables, pageBlocks, pages, onChange, onRemove, onOpenVariableManager }) {
  const numberVariables = variables.filter((v) => v.type === 'number');

  function changeType(type) {
    onChange(emptyAction(type, variables, pageBlocks, pages));
  }

  return (
    <div className="trigger-builder__action-row">
      <select className="input" value={action.action} onChange={(e) => changeType(e.target.value)}>
        {ACTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {ACTION_LABELS[t]}
          </option>
        ))}
      </select>

      {action.action === 'SET_VAR' &&
        (variables.length === 0 ? (
          <NoVariablesMessage onOpenVariableManager={onOpenVariableManager} />
        ) : (
          <>
            <select
              className="input"
              value={action.var}
              onChange={(e) => {
                const variable = variables.find((v) => v.name === e.target.value);
                onChange({ action: 'SET_VAR', var: e.target.value, value: defaultValueForType(variable?.type) });
              }}
            >
              {variables.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.type})
                </option>
              ))}
            </select>
            <span className="trigger-builder__inline-label">to</span>
            <ValueInput
              variable={variables.find((v) => v.name === action.var)}
              value={action.value}
              onChange={(value) => onChange({ ...action, value })}
            />
          </>
        ))}

      {action.action === 'ADJUST_VAR' &&
        (numberVariables.length === 0 ? (
          <NoVariablesMessage onOpenVariableManager={onOpenVariableManager} message="No number variables yet — create one first." />
        ) : (
          <>
            <select className="input" value={action.var} onChange={(e) => onChange({ ...action, var: e.target.value })}>
              {numberVariables.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={Number(action.value) < 0 ? 'decrease' : 'increase'}
              onChange={(e) => {
                const amount = Math.abs(Number(action.value) || 0) || 1;
                onChange({ ...action, value: e.target.value === 'decrease' ? -amount : amount });
              }}
            >
              <option value="increase">increase</option>
              <option value="decrease">decrease</option>
            </select>
            <span className="trigger-builder__inline-label">by</span>
            <input
              type="number"
              className="input"
              min={0}
              value={Math.abs(Number(action.value) || 0)}
              onChange={(e) => {
                const magnitude = Math.abs(Number(e.target.value) || 0);
                onChange({ ...action, value: Number(action.value) < 0 ? -magnitude : magnitude });
              }}
            />
          </>
        ))}

      {(action.action === 'SHOW_BLOCK' || action.action === 'HIDE_BLOCK') &&
        (pageBlocks.length === 0 ? (
          <p className="condition-builder__empty">No other blocks on this page yet.</p>
        ) : (
          <select className="input" value={action.target} onChange={(e) => onChange({ ...action, target: e.target.value })}>
            {pageBlocks.map((b) => (
              <option key={b.block_id} value={b.block_id}>
                {blockLabel(b)}
              </option>
            ))}
          </select>
        ))}

      {action.action === 'JUMP_TO_PAGE' &&
        (pages.length === 0 ? (
          <p className="condition-builder__empty">No other pages yet.</p>
        ) : (
          <select className="input" value={action.target} onChange={(e) => onChange({ ...action, target: e.target.value })}>
            {pages.map((p) => (
              <option key={p.page_id} value={p.page_id}>
                {p.title}
              </option>
            ))}
          </select>
        ))}

      <button type="button" className="btn-text" title="Remove action" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

function NoVariablesMessage({ onOpenVariableManager, message = 'No variables yet — create one first.' }) {
  return (
    <p className="condition-builder__empty">
      {message}{' '}
      {onOpenVariableManager && (
        <button type="button" className="btn-text" onClick={onOpenVariableManager}>
          Open Variable Manager
        </button>
      )}
    </p>
  );
}

function isActionValid(action) {
  if (action.action === 'SET_VAR') return !!action.var;
  if (action.action === 'ADJUST_VAR') return !!action.var;
  if (action.action === 'SHOW_BLOCK' || action.action === 'HIDE_BLOCK') return !!action.target;
  if (action.action === 'JUMP_TO_PAGE') return !!action.target;
  return false;
}

// Sentence-style trigger builder (Phase 4 Part 2 Step 2): "When [EVENT]
// happens" -> optional "if [CONDITION]" -> "then [ACTION(s)]". Every
// dropdown here is pre-filtered to only valid options for this block's
// type and the current course document, so an invalid trigger cannot be
// constructed (Step 3/4/5 requirements) -- there is no free-text/JSON path
// into a trigger at all.
export default function TriggerBuilderModal({
  title,
  validEvents,
  excludeBlockId,
  pageBlocks,
  pages,
  variables,
  existingTrigger,
  onSave,
  onClose,
  onOpenVariableManager,
}) {
  const otherPageBlocks = excludeBlockId ? pageBlocks.filter((b) => b.block_id !== excludeBlockId) : pageBlocks;

  const [event, setEvent] = useState(existingTrigger?.event || validEvents[0]);
  const [condition, setCondition] = useState(existingTrigger?.condition || null);
  const [actions, setActions] = useState(
    existingTrigger?.actions?.length ? existingTrigger.actions : [emptyAction('SET_VAR', variables, otherPageBlocks, pages)]
  );

  const canSave = !!event && actions.length > 0 && actions.every(isActionValid);

  function updateAction(index, next) {
    setActions((prev) => prev.map((a, i) => (i === index ? next : a)));
  }
  function removeAction(index) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }
  function addAction() {
    setActions((prev) => [...prev, emptyAction('SET_VAR', variables, otherPageBlocks, pages)]);
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      trigger_id: existingTrigger?.trigger_id || newTriggerId(),
      event,
      ...(condition ? { condition } : {}),
      actions,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card trigger-builder" onClick={(e) => e.stopPropagation()}>
        <h2>{existingTrigger ? 'Edit trigger' : (title || 'Add trigger')}</h2>

        <div className="trigger-builder__row">
          <span className="trigger-builder__inline-label">When</span>
          <select className="input" value={event} onChange={(e) => setEvent(e.target.value)}>
            {validEvents.map((ev) => (
              <option key={ev} value={ev}>
                {EVENT_LABELS[ev] || ev}
              </option>
            ))}
          </select>
          <span className="trigger-builder__inline-label">happens</span>
        </div>

        <ConditionBuilder
          variables={variables}
          value={condition}
          onChange={setCondition}
          onOpenVariableManager={onOpenVariableManager}
          toggleLabel="Only if…"
        />

        <div className="trigger-builder__actions">
          <h3>Then</h3>
          {actions.map((action, index) => (
            <ActionRow
              key={index}
              action={action}
              variables={variables}
              pageBlocks={otherPageBlocks}
              pages={pages}
              onChange={(next) => updateAction(index, next)}
              onRemove={() => removeAction(index)}
              onOpenVariableManager={onOpenVariableManager}
            />
          ))}
          <button type="button" className="btn-text" onClick={addAction}>
            + Add another action
          </button>
        </div>

        <div className="trigger-builder__footer">
          <button type="button" className="btn-text" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={handleSave}>
            Save trigger
          </button>
        </div>
      </div>
    </div>
  );
}

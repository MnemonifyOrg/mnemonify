import { useState } from 'react';
import ConditionBuilder from './ConditionBuilder.jsx';
import TriggerBuilderModal from './TriggerBuilderModal.jsx';
import { describeTrigger, PAGE_EVENTS } from '../lib/triggerUtils.js';

// Page-level settings (Phase 4 Part 2 Step 5): the Continue gate an author
// can attach to a page, and onPageEnter/onPageExit triggers. Both write
// directly into fields Part 1 already built the player-side mechanism for
// (page.continue_gate, page.triggers -- see DECISIONS.md for exact shape
// confirmation). onPageEnter/onPageExit are handled here rather than as a
// per-block Triggers option (Step 3's "any block" suggestion) -- they are
// really page-level events, and the schema already has a dedicated
// page.triggers array for them, so duplicating the same event choice on
// every block on the page would be more UI, not less.
export default function PageSettingsPanel({ page, pages, variables, onChangePage, onOpenVariableManager }) {
  const [builderState, setBuilderState] = useState(null); // { trigger } | null
  const triggers = page.triggers || [];
  const otherPages = pages.filter((p) => p.page_id !== page.page_id);

  function saveTrigger(trigger) {
    const exists = triggers.some((t) => t.trigger_id === trigger.trigger_id);
    const nextTriggers = exists
      ? triggers.map((t) => (t.trigger_id === trigger.trigger_id ? trigger : t))
      : [...triggers, trigger];
    onChangePage({ ...page, triggers: nextTriggers }, { forceSnapshot: true });
    setBuilderState(null);
  }

  function deleteTrigger(triggerId) {
    if (!window.confirm('Delete this trigger?')) return;
    onChangePage({ ...page, triggers: triggers.filter((t) => t.trigger_id !== triggerId) }, { forceSnapshot: true });
  }

  function changeContinueGate(condition) {
    if (condition) {
      onChangePage({ ...page, continue_gate: condition }, { forceSnapshot: true });
    } else {
      const { continue_gate, ...rest } = page;
      onChangePage(rest, { forceSnapshot: true });
    }
  }

  return (
    <div className="settings-panel__section">
      <h3>Page Settings</h3>
      <p className="settings-panel__hint">Applies to "{page.title}" only.</p>

      <h4>Continue gate</h4>
      <p className="settings-panel__hint">Don't let the learner continue past this page until a condition is met.</p>
      <ConditionBuilder
        variables={variables}
        value={page.continue_gate || null}
        onChange={changeContinueGate}
        onOpenVariableManager={onOpenVariableManager}
        toggleLabel="Require a condition before Continue is enabled"
      />

      <h4>Page triggers</h4>
      <p className="settings-panel__hint">Fire when the learner enters or leaves this page.</p>
      {triggers.length === 0 && <p className="settings-panel__empty">No page triggers yet.</p>}
      <ul className="settings-panel__trigger-list">
        {triggers.map((trigger) => (
          <li key={trigger.trigger_id} className="settings-panel__trigger-item">
            <span>{describeTrigger(trigger, { pageBlocks: page.blocks, pages, variables })}</span>
            <div className="settings-panel__trigger-actions">
              <button type="button" className="btn-text" onClick={() => setBuilderState({ trigger })}>
                Edit
              </button>
              <button type="button" className="btn-text" onClick={() => deleteTrigger(trigger.trigger_id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={() => setBuilderState({ trigger: null })}>
        + Add Page Trigger
      </button>

      {builderState && (
        <TriggerBuilderModal
          title="Add page trigger"
          validEvents={PAGE_EVENTS}
          pageBlocks={page.blocks}
          pages={otherPages}
          variables={variables}
          existingTrigger={builderState.trigger}
          onSave={saveTrigger}
          onClose={() => setBuilderState(null)}
          onOpenVariableManager={onOpenVariableManager}
        />
      )}
    </div>
  );
}

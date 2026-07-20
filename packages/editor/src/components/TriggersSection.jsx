import { useState } from 'react';
import TriggerBuilderModal from './TriggerBuilderModal.jsx';
import InfoTooltip from './InfoTooltip.jsx';
import { describeTrigger, EVENTS_BY_BLOCK_TYPE } from '../lib/triggerUtils.js';

// Block-level "Triggers" section (Phase 4 Part 2 Step 2), shown in a
// block's settings panel for block types that have at least one
// meaningful interaction event (EVENTS_BY_BLOCK_TYPE, Step 3) -- text,
// heading, list, table, two_column, reflection, and embed have none and
// get no section at all (an empty, non-functional panel is worse than no
// panel). Collapsed by default so it doesn't crowd every block's settings
// when unused.
export default function TriggersSection({ block, pageBlocks, pages, variables, onChangeBlock, onOpenVariableManager }) {
  const validEvents = EVENTS_BY_BLOCK_TYPE[block.type];
  const [expanded, setExpanded] = useState(false);
  const [builderState, setBuilderState] = useState(null); // { trigger } | null

  if (!validEvents || validEvents.length === 0) return null;

  const triggers = block.triggers || [];

  function saveTrigger(trigger) {
    const exists = triggers.some((t) => t.trigger_id === trigger.trigger_id);
    const nextTriggers = exists
      ? triggers.map((t) => (t.trigger_id === trigger.trigger_id ? trigger : t))
      : [...triggers, trigger];
    onChangeBlock({ ...block, triggers: nextTriggers }, { forceSnapshot: true });
    setBuilderState(null);
  }

  function deleteTrigger(triggerId) {
    if (!window.confirm('Delete this trigger?')) return;
    onChangeBlock({ ...block, triggers: triggers.filter((t) => t.trigger_id !== triggerId) }, { forceSnapshot: true });
  }

  return (
    <div className="settings-panel__triggers">
      <div className="settings-panel__triggers-header">
        <button type="button" className="btn-text settings-panel__triggers-toggle" onClick={() => setExpanded((e) => !e)}>
          ⚡ Triggers {triggers.length > 0 ? `(${triggers.length})` : ''} {expanded ? '▲' : '▼'}
        </button>
        <InfoTooltip text="An if-this-then-that rule for this block, like 'when the learner clicks Continue, set a variable' or 'when this video ends, show the next block.' Optional -- most blocks work fine with none." />
      </div>

      {expanded && (
        <div className="settings-panel__triggers-body">
          {triggers.length === 0 && <p className="settings-panel__empty">No triggers yet.</p>}
          <ul className="settings-panel__trigger-list">
            {triggers.map((trigger) => (
              <li key={trigger.trigger_id} className="settings-panel__trigger-item">
                <span>{describeTrigger(trigger, { pageBlocks, pages, variables, blockType: block.type })}</span>
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
            + Add Trigger
          </button>
        </div>
      )}

      {builderState && (
        <TriggerBuilderModal
          validEvents={validEvents}
          blockType={block.type}
          excludeBlockId={block.block_id}
          pageBlocks={pageBlocks}
          pages={pages}
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

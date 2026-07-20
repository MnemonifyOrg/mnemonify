import { useState } from 'react';
import TriggerBuilderModal from './TriggerBuilderModal.jsx';

function overlayBlockFor(marker) {
  return marker.actions?.find((action) => action.action === 'OPEN_MODAL')?.content?.block || null;
}

function replaceOverlayBlock(marker, nextOverlayBlock) {
  return {
    ...marker,
    actions: marker.actions.map((action) =>
      action.action === 'OPEN_MODAL'
        ? { ...action, content: { ...action.content, block: nextOverlayBlock } }
        : action
    ),
  };
}

export default function TimelineTriggersSection({ block, pageBlocks, pages, variables, onChangeBlock, onOpenVariableManager }) {
  const [seconds, setSeconds] = useState('5');
  const [builderState, setBuilderState] = useState(null);
  const [branchState, setBranchState] = useState(null);
  const markers = block.timeline_triggers || [];

  function saveMarkers(next) {
    onChangeBlock({ ...block, timeline_triggers: next }, { forceSnapshot: true });
  }

  function addMarker() {
    const atSeconds = Number(seconds);
    if (!Number.isFinite(atSeconds) || atSeconds < 0) return;
    setBuilderState({ atSeconds, trigger: null });
  }

  function saveMarker(trigger) {
    const { event: _event, ...storedTrigger } = trigger;
    const nextMarker = { ...storedTrigger, at_seconds: builderState.atSeconds };
    const exists = markers.some((marker) => marker.trigger_id === nextMarker.trigger_id);
    saveMarkers(exists ? markers.map((marker) => (marker.trigger_id === nextMarker.trigger_id ? nextMarker : marker)) : [...markers, nextMarker]);
    setBuilderState(null);
  }

  function deleteMarker(triggerId) {
    if (!window.confirm('Delete this pause point?')) return;
    saveMarkers(markers.filter((marker) => marker.trigger_id !== triggerId));
  }

  function updateMarkerTime(marker, value) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue < 0) return;
    saveMarkers(markers.map((item) => (item.trigger_id === marker.trigger_id ? { ...item, at_seconds: nextValue } : item)));
  }

  function openBranch(marker, event) {
    const overlayBlock = overlayBlockFor(marker);
    if (overlayBlock?.type !== 'knowledge-check') return;
    setBranchState({ marker, event, trigger: overlayBlock.triggers?.find((trigger) => trigger.event === event) || null });
  }

  function saveBranch(trigger) {
    const marker = markers.find((item) => item.trigger_id === branchState.marker.trigger_id);
    const overlayBlock = overlayBlockFor(marker);
    if (!marker || !overlayBlock) return;
    const oldTrigger = branchState.trigger;
    const nextTriggers = oldTrigger
      ? (overlayBlock.triggers || []).map((item) => (item.trigger_id === oldTrigger.trigger_id ? trigger : item))
      : [...(overlayBlock.triggers || []), trigger];
    const nextMarker = replaceOverlayBlock(marker, { ...overlayBlock, triggers: nextTriggers });
    saveMarkers(markers.map((item) => (item.trigger_id === marker.trigger_id ? nextMarker : item)));
    setBranchState(null);
  }

  function deleteBranch(marker, event) {
    const overlayBlock = overlayBlockFor(marker);
    if (!overlayBlock) return;
    const nextMarker = replaceOverlayBlock(marker, {
      ...overlayBlock,
      triggers: (overlayBlock.triggers || []).filter((trigger) => trigger.event !== event),
    });
    saveMarkers(markers.map((item) => (item.trigger_id === marker.trigger_id ? nextMarker : item)));
  }

  return (
    <div className="settings-panel__timeline">
      <h4>Interactive video pause points</h4>
      <p className="settings-panel__hint">Pause playback at a timestamp and show a text, question, or button overlay.</p>
      <div className="settings-panel__timeline-add">
        <label>
          Pause at
          <input
            className="input"
            type="number"
            min={0}
            step={0.1}
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
          />{' '}
          seconds
        </label>
        <button type="button" className="btn" onClick={addMarker}>
          + Add pause point
        </button>
      </div>

      {markers.length === 0 ? (
        <p className="settings-panel__empty">No pause points yet.</p>
      ) : (
        <ul className="settings-panel__trigger-list">
          {markers.map((marker) => {
            const overlay = overlayBlockFor(marker);
            const correctBranch = overlay?.triggers?.some((trigger) => trigger.event === 'onCorrect');
            const incorrectBranch = overlay?.triggers?.some((trigger) => trigger.event === 'onIncorrect');
            return (
              <li key={marker.trigger_id} className="settings-panel__trigger-item">
                <div>
                  <label>
                    At
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step={0.1}
                      value={marker.at_seconds}
                      onChange={(e) => updateMarkerTime(marker, e.target.value)}
                    />{' '}
                    seconds
                  </label>
                  <div className="settings-panel__hint">Overlay: {overlay?.type || 'none'}</div>
                  {overlay?.type === 'knowledge-check' && (
                    <div className="settings-panel__timeline-branches">
                      <button type="button" className="btn-text" onClick={() => openBranch(marker, 'onCorrect')}>
                        {correctBranch ? 'Edit correct branch' : '+ Correct branch'}
                      </button>
                      <button type="button" className="btn-text" onClick={() => openBranch(marker, 'onIncorrect')}>
                        {incorrectBranch ? 'Edit incorrect branch' : '+ Incorrect branch'}
                      </button>
                      {(correctBranch || incorrectBranch) && (
                        <button type="button" className="btn-text" onClick={() => deleteBranch(marker, correctBranch ? 'onCorrect' : 'onIncorrect')}>
                          Remove one branch
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="settings-panel__trigger-actions">
                  <button type="button" className="btn-text" onClick={() => setBuilderState({ atSeconds: marker.at_seconds, trigger: marker })}>
                    Edit trigger
                  </button>
                  <button type="button" className="btn-text" onClick={() => deleteMarker(marker.trigger_id)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {builderState && (
        <TriggerBuilderModal
          title="Add video pause point"
          validEvents={['onTimeReached']}
          blockType="video"
          excludeBlockId={block.block_id}
          pageBlocks={pageBlocks}
          pages={pages}
          variables={variables}
          existingTrigger={builderState.trigger}
          defaultActionType="OPEN_MODAL"
          onSave={saveMarker}
          onClose={() => setBuilderState(null)}
          onOpenVariableManager={onOpenVariableManager}
        />
      )}

      {branchState && (
        <TriggerBuilderModal
          title={`${branchState.event === 'onCorrect' ? 'Correct' : 'Incorrect'} answer branch`}
          validEvents={[branchState.event]}
          blockType="knowledge-check"
          pageBlocks={pageBlocks}
          pages={pages}
          variables={variables}
          existingTrigger={branchState.trigger}
          defaultActionType="JUMP_TO_TIMESTAMP"
          onSave={saveBranch}
          onClose={() => setBranchState(null)}
          onOpenVariableManager={onOpenVariableManager}
        />
      )}
    </div>
  );
}

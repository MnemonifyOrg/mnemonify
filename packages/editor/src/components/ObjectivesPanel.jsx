import { genObjectiveId } from '../lib/idGen.js';
import { objectiveLabel } from '@mnemonify/schema/objectives.js';

function newObjective() {
  return { objective_id: genObjectiveId(), label: '', description: '' };
}

export default function ObjectivesPanel({ objectives = [], onChange }) {
  function updateObjective(objectiveId, patch) {
    onChange(objectives.map((objective) => (
      objective.objective_id === objectiveId
        ? { ...objective, ...patch }
        : objective
    )));
  }

  function addObjective() {
    onChange([...objectives, newObjective()]);
  }

  function removeObjective(objectiveId) {
    const objective = objectives.find((candidate) => candidate.objective_id === objectiveId);
    if (!objective || !window.confirm('Delete objective "' + (objectiveLabel(objective) || 'this objective') + '"? Existing question mappings will become unresolved.')) return;
    onChange(objectives.filter((candidate) => candidate.objective_id !== objectiveId));
  }

  return (
    <div className="settings-panel__section objectives-panel">
      <h3>Objectives</h3>
      <p className="settings-panel__hint">
        Create course-level learning objectives, then assign them to modules and questions.
      </p>
      {objectives.length === 0 && (
        <p className="settings-panel__empty">No objectives yet.</p>
      )}
      <div className="objectives-panel__list">
        {objectives.map((objective) => (
          <div className="objectives-panel__item card" key={objective.objective_id}>
            <label htmlFor={'objective-label-' + objective.objective_id}>Objective label</label>
            <input
              id={'objective-label-' + objective.objective_id}
              className="input"
              value={objective.label ?? objective.text ?? ''}
              placeholder="e.g. Identify the key diagnostic finding"
              onChange={(event) => updateObjective(objective.objective_id, {
                label: event.target.value,
                text: undefined,
              })}
            />
            <label htmlFor={'objective-description-' + objective.objective_id}>Description <span className="settings-panel__optional">(optional)</span></label>
            <textarea
              id={'objective-description-' + objective.objective_id}
              className="input"
              rows={2}
              value={objective.description || ''}
              placeholder="Describe what the learner should be able to do."
              onChange={(event) => updateObjective(objective.objective_id, { description: event.target.value })}
            />
            <button type="button" className="btn-text settings-panel__danger-action" onClick={() => removeObjective(objective.objective_id)}>
              Delete objective
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={addObjective}>+ Add objective</button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { genObjectiveId } from '../lib/idGen.js';
import { objectiveLabel } from '@mnemonify/schema/objectives.js';
import StyledSelect from './StyledSelect.jsx';
import MultiSelectCheckbox from './MultiSelectCheckbox.jsx';

function newObjective() {
  return { objective_id: genObjectiveId(), label: '', description: '' };
}

export default function ObjectivesPanel({
  objectives = [],
  onChange,
  pageGroups = [],
  onChangePageGroups,
  initialContext = 'course',
  showCourseObjectives = true,
}) {
  const [context, setContext] = useState(initialContext);

  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

  const contextOptions = [
    { value: 'course', label: 'Course-level objectives' },
    ...pageGroups.map((group) => ({ value: `module:${group.group_id}`, label: group.title || group.group_id })),
  ];
  const selectedGroupId = context.startsWith('module:') ? context.slice('module:'.length) : null;
  const selectedGroup = pageGroups.find((group) => group.group_id === selectedGroupId);
  const objectiveOptions = objectives.map((objective) => ({
    value: objective.objective_id,
    label: objectiveLabel(objective) || objective.objective_id,
  }));

  function updateGroupObjectives(objectiveIds) {
    if (!selectedGroup || !onChangePageGroups) return;
    onChangePageGroups(pageGroups.map((group) => (
      group.group_id === selectedGroup.group_id
        ? { ...group, objective_ids: objectiveIds }
        : group
    )));
  }
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
    <div className="settings-panel__section objectives-panel" aria-label="Objectives">
      {showCourseObjectives && (
        <>
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
        </>
      )}

      {onChangePageGroups && pageGroups.length > 0 && (
        <div className="objectives-panel__assignments">
          <h3>Assign objectives</h3>
          <p className="settings-panel__hint">Choose a course or module to manage its objective mapping.</p>
          <StyledSelect
            value={context}
            onChange={setContext}
            options={contextOptions}
            ariaLabel="Objective assignment context"
          />
          {selectedGroup ? (
            <div className="objective-multi-select">
              <label>Objectives for {selectedGroup.title || selectedGroup.group_id}</label>
              <MultiSelectCheckbox
                options={objectiveOptions}
                value={selectedGroup.objective_ids || []}
                onChange={updateGroupObjectives}
                ariaLabel={`Objectives for ${selectedGroup.title || selectedGroup.group_id}`}
                placeholder="None selected"
                disabled={objectives.length === 0}
              />
            </div>
          ) : (
            <p className="settings-panel__hint">Select a module to assign objectives.</p>
          )}
        </div>
      )}
    </div>
  );
}

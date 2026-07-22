import { objectiveLabel } from '@mnemonify/schema/objectives.js';
import { readSelectedObjectiveIds } from '../lib/objectiveUi.js';

export default function ObjectiveMultiSelect({
  objectives = [],
  value = [],
  onChange,
  label = 'Objectives',
  ariaLabel,
  hint = 'Optional. Select all objectives this content supports.',
}) {
  const selected = new Set(value || []);
  return (
    <div className="objective-multi-select">
      <label>{label}</label>
      <select
        className="input objective-multi-select__input"
        multiple
        size={Math.min(Math.max(objectives.length, 2), 5)}
        value={value || []}
        aria-label={ariaLabel || label}
        onChange={(event) => onChange(readSelectedObjectiveIds(event))}
      >
        {objectives.map((objective) => (
          <option key={objective.objective_id} value={objective.objective_id}>
            {objectiveLabel(objective)}
          </option>
        ))}
      </select>
      {objectives.length === 0 ? (
        <p className="settings-panel__hint">Create a course objective first.</p>
      ) : (
        <p className="settings-panel__hint">{hint}</p>
      )}
      {objectives.length > 0 && selected.size === 0 && (
        <span className="objective-multi-select__status">None assigned</span>
      )}
    </div>
  );
}

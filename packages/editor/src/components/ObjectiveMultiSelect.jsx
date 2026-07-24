import { objectiveLabel } from '@mnemonify/schema/objectives.js';
import MultiSelectCheckbox from './MultiSelectCheckbox.jsx';

export default function ObjectiveMultiSelect({
  objectives = [],
  value = [],
  onChange,
  label = 'Objectives',
  ariaLabel,
  hint = 'Optional. Select all objectives this content supports.',
}) {
  const selected = new Set(value || []);
  const options = objectives.map((objective) => ({
    value: objective.objective_id,
    label: objectiveLabel(objective),
  }));
  return (
    <div className="objective-multi-select">
      <label>{label}</label>
      <MultiSelectCheckbox
        className="objective-multi-select__input"
        options={options}
        value={value || []}
        placeholder="None selected"
        ariaLabel={ariaLabel || label}
        disabled={objectives.length === 0}
        onChange={onChange}
      />
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

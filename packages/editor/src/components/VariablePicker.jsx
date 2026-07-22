import { SYSTEM_VARIABLE_DEFINITIONS } from '@mnemonify/schema/system-variables.js';

const SCORE_LABELS = { ScoreRaw: 'ScoreRaw (points earned)', ScoreMax: 'ScoreMax (possible points)', ScorePercent: 'ScorePercent (%)', ScorePassed: 'ScorePassed (pass/fail)' };

export default function VariablePicker({ variables = [], onInsert }) {
  return (
    <select className="input rich-text-variable-picker" aria-label="Insert variable" value="" onChange={(event) => { if (event.target.value) onInsert(event.target.value); }}>
      <option value="">Insert Variable…</option>
      <optgroup label="Course Score">
        {SYSTEM_VARIABLE_DEFINITIONS.map((variable) => <option key={variable.name} value={variable.name}>{SCORE_LABELS[variable.name] || variable.name}</option>)}
      </optgroup>
      <optgroup label="My Variables">
        {variables.map((variable) => <option key={variable.name} value={variable.name}>{variable.name}</option>)}
      </optgroup>
    </select>
  );
}

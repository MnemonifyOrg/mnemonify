import { useRef } from 'react';
import EditableRichField from './EditableRichField.jsx';
import TextColorPicker from './TextColorPicker.jsx';
import VariablePicker from '../VariablePicker.jsx';
import { insertVariableAtSelection } from '../../lib/richText.js';

// Item 8 asked for a color control "in the toolbar, alongside
// Bold/Italic/Underline/Sup/Sub" -- headings had no formatting toolbar at
// all before this (just a bare EditableRichField), so this adds the same
// toolbar TextBlock.jsx already has (matching every other text-editable
// field in the app, per item 5's consistency goal) plus the color picker,
// rather than a color-only control bolted onto an otherwise-bare field.
export default function HeadingBlockEditor({ block, onChange, variables = [] }) {
  const ref = useRef(null);
  const selectionRef = useRef(null);

  function format(command) {
    document.execCommand(command);
    ref.current?.focus();
  }

  return (
    <div className="heading-block-editor-wrapper">
      <div className="rich-text-toolbar">
        <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('italic')}>
          <em>I</em>
        </button>
        <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('underline')}>
          <u>U</u>
        </button>
        <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('superscript')}>
          X<sup>2</sup>
        </button>
        <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('subscript')}>
          X<sub>2</sub>
        </button>
        <TextColorPicker />
        <VariablePicker variables={variables} onInsert={(name) => insertVariableAtSelection(ref, selectionRef, name)} />
      </div>
      <EditableRichField
        fieldRef={ref}
        selectionRef={selectionRef}
        className="editable-field heading-block-editor"
        data-level={block.content.level || 2}
        placeholder="Click to add heading..."
        value={block.content.text || ''}
        onCommit={(value) => onChange({ ...block, content: { ...block.content, text: value } })}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      />
    </div>
  );
}

export function HeadingBlockSettings({ block, onChange }) {
  return (
    <>
      <label>Heading level</label>
      <select
        className="input"
        value={block.content.level || 2}
        onChange={(e) => onChange({ ...block, content: { ...block.content, level: Number(e.target.value) } })}
      >
        <option value={1}>Heading 1</option>
        <option value={2}>Heading 2</option>
        <option value={3}>Heading 3</option>
      </select>
    </>
  );
}

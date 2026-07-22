import { useRef } from 'react';
import EditableRichField from './EditableRichField.jsx';
import TextColorPicker from './TextColorPicker.jsx';
import VariablePicker from '../VariablePicker.jsx';

export default function TextBlockEditor({ block, onChange, variables = [] }) {
  const ref = useRef(null);

  function format(command) {
    document.execCommand(command);
    ref.current?.focus();
  }

  return (
    <div className="text-block-editor">
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
        <VariablePicker variables={variables} onInsert={(name) => { ref.current?.focus(); document.execCommand('insertHTML', false, `<span class="rich-variable-chip" data-mnemonify-variable="${name}">${name}</span>`); }} />
      </div>
      <EditableRichField
        fieldRef={ref}
        className="editable-field text-block-editor__body"
        placeholder="Click to add text..."
        value={block.content.rich_text || ''}
        onCommit={(value) => onChange({ ...block, content: { ...block.content, rich_text: Array.isArray(value) ? value : [{ t: 'html', v: value }] } })}
      />
    </div>
  );
}

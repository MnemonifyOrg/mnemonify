import { useRef } from 'react';
import EditableRichField from './EditableRichField.jsx';
import RichTextToolbar from '../RichTextToolbar.jsx';
import { insertVariableAtSelection } from '../../lib/richText.js';

export default function TextBlockEditor({ block, onChange, variables = [] }) {
  const ref = useRef(null);
  const selectionRef = useRef(null);

  return (
    <div className="text-block-editor">
      <RichTextToolbar
        fieldRef={ref}
        selectionRef={selectionRef}
        variables={variables}
        onInsert={(name) => insertVariableAtSelection(ref, selectionRef, name)}
      />
      <EditableRichField
        fieldRef={ref}
        selectionRef={selectionRef}
        className="editable-field text-block-editor__body"
        placeholder="Click to add text..."
        value={block.content.rich_text || ''}
        onCommit={(value) => onChange({ ...block, content: { ...block.content, rich_text: Array.isArray(value) ? value : [{ t: 'html', v: value }] } })}
      />
    </div>
  );
}

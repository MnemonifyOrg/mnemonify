import EditableRichField from './EditableRichField.jsx';
import StyledSelect from '../StyledSelect.jsx';

export default function ButtonBlockEditor({ block, onChange }) {
  const text = block.content?.text || '';
  function plainButtonText(value) {
    if (!Array.isArray(value)) return value;
    return value.map((segment) => segment.v || '').join('').replace(/<[^>]+>/g, '');
  }

  return (
    <div className="button-block-editor">
      <EditableRichField
        className="editable-field button-block-editor__text"
        value={text}
        placeholder="Click to add button text..."
        Tag="span"
        onCommit={(value) => onChange({ ...block, content: { ...block.content, text: plainButtonText(value) } })}
      />
      <p className="settings-panel__hint">Choose the destination in Block Settings.</p>
    </div>
  );
}

export function ButtonBlockSettings({ block, pages = [], page, onChange }) {
  const otherPages = pages.filter((candidate) => candidate.page_id !== page?.page_id);
  const options = otherPages.map((candidate) => ({ value: candidate.page_id, label: candidate.title }));

  return (
    <>
      <label>Button text</label>
      <input
        className="input"
        value={block.content?.text || ''}
        onChange={(event) => onChange({ ...block, content: { ...block.content, text: event.target.value } })}
        placeholder="e.g. Go to Case 1"
      />
      <label>Navigate to page</label>
      <StyledSelect
        value={block.content?.target_page_id || ''}
        onChange={(target_page_id) => onChange({ ...block, content: { ...block.content, target_page_id } })}
        options={options}
        placeholder="Select a page…"
        ariaLabel="Button target page"
      />
      {options.length === 0 && <p className="settings-panel__hint">Add another page to choose a destination.</p>}
    </>
  );
}

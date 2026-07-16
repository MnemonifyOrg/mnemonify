import { useState } from 'react';
import { BLOCK_SETTINGS } from './blocks/settingsIndex.js';
import { BLOCK_LABELS } from '../lib/blockDefaults.js';

// Objectives and concepts are schema-only in this phase (REQUIREMENTS.md
// P1-37/P1-38) -- deliberately no management UI here yet.
function richTextFieldValue(field) {
  return field?.rich_text?.[0]?.v || '';
}

function setRichTextField(meta, key, text, onChangeMeta) {
  const trimmed = text.trim();
  if (!trimmed) {
    const next = { ...meta };
    delete next[key];
    onChangeMeta(next);
    return;
  }
  onChangeMeta({ ...meta, [key]: { rich_text: [{ t: 'text', v: text }] } });
}

function CourseSettings({ meta, onChangeMeta }) {
  return (
    <div className="settings-panel__section">
      <h3>Course Settings</h3>

      <label>Title</label>
      <input className="input" value={meta.title || ''} onChange={(e) => onChangeMeta({ ...meta, title: e.target.value })} />

      <label>Accent color</label>
      <input
        type="color"
        className="color-input"
        value={meta.theme?.accent || '#0891B2'}
        onChange={(e) => onChangeMeta({ ...meta, theme: { ...meta.theme, accent: e.target.value } })}
      />

      <label>Navigation mode</label>
      <select
        className="input"
        value={meta.nav_mode || 'linear'}
        onChange={(e) => onChangeMeta({ ...meta, nav_mode: e.target.value })}
      >
        <option value="linear">Linear</option>
        <option value="free">Free navigation</option>
      </select>

      <label>Completion rule</label>
      <select
        className="input"
        value={meta.completion_rule || 'viewed_all_pages'}
        onChange={(e) => onChangeMeta({ ...meta, completion_rule: e.target.value })}
      >
        <option value="viewed_all_pages">Viewed all pages</option>
        <option value="passed_final_quiz">Passed final knowledge check</option>
      </select>

      <label>Header</label>
      <textarea
        className="input"
        rows={2}
        placeholder="Rendered above the content on every page. Leave blank for none."
        value={richTextFieldValue(meta.header)}
        onChange={(e) => setRichTextField(meta, 'header', e.target.value, onChangeMeta)}
      />

      <label>Footer</label>
      <textarea
        className="input"
        rows={2}
        placeholder="Rendered at the bottom of every page, e.g. a copyright line. Leave blank for none."
        value={richTextFieldValue(meta.footer)}
        onChange={(e) => setRichTextField(meta, 'footer', e.target.value, onChangeMeta)}
      />

      <label className="settings-panel__checkbox-row">
        <input
          type="checkbox"
          checked={!!meta.page_numbering}
          onChange={(e) => onChangeMeta({ ...meta, page_numbering: e.target.checked })}
        />
        Show page numbers
      </label>
    </div>
  );
}

function FacultyNotesField({ block, onChange }) {
  const existingText = richTextFieldValue(block.faculty_notes);
  const [expanded, setExpanded] = useState(!!existingText);

  function handleChange(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      const { faculty_notes, ...rest } = block;
      onChange(rest);
      return;
    }
    onChange({ ...block, faculty_notes: { rich_text: [{ t: 'text', v: text }] } });
  }

  return (
    <div className="settings-panel__faculty-notes">
      <button
        type="button"
        className="btn-text settings-panel__faculty-notes-toggle"
        onClick={() => setExpanded((e) => !e)}
      >
        📝 Faculty notes (not shown to learners) {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <textarea
          className="input settings-panel__faculty-notes-field"
          rows={3}
          placeholder="Instructor-only. Never rendered to learners in any player context."
          value={existingText}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function SettingsPanel({ selectedBlock, meta, onChangeMeta, onChangeBlock, assets, onUpdateCourseAsset }) {
  if (!selectedBlock) {
    return (
      <aside className="settings-panel">
        <CourseSettings meta={meta} onChangeMeta={onChangeMeta} />
      </aside>
    );
  }

  const SettingsFields = BLOCK_SETTINGS[selectedBlock.type];

  return (
    <aside className="settings-panel">
      <div className="settings-panel__section">
        <h3>{BLOCK_LABELS[selectedBlock.type] || selectedBlock.type} Settings</h3>
        {SettingsFields ? (
          <SettingsFields block={selectedBlock} assets={assets} onChange={onChangeBlock} onUpdateCourseAsset={onUpdateCourseAsset} />
        ) : (
          <p className="settings-panel__empty">No additional settings for this block type.</p>
        )}
      </div>
      <FacultyNotesField block={selectedBlock} onChange={onChangeBlock} />
    </aside>
  );
}

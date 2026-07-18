import { useState } from 'react';
import { BLOCK_SETTINGS } from './blocks/settingsIndex.js';
import { BLOCK_LABELS } from '../lib/blockDefaults.js';
import VariableManagerPanel from './VariableManagerPanel.jsx';
import PageSettingsPanel from './PageSettingsPanel.jsx';
import TriggersSection from './TriggersSection.jsx';

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

// Any block can be the target of another block's or page's SHOW_BLOCK/
// HIDE_BLOCK/trigger, regardless of whether it can fire triggers of its
// own (Step 8's own test case hides a plain text block, which has no
// Triggers section of its own -- see TriggersSection.jsx) -- so this is
// rendered unconditionally, not folded into TriggersSection. Writes
// block.visibility.initial (course.schema.json, already defined ahead of
// this UI, same pattern as continue_gate in Part 1).
function BlockVisibilityToggle({ block, onChange }) {
  const isHidden = block.visibility?.initial === 'hidden';

  function toggle(checked) {
    if (checked) {
      onChange({ ...block, visibility: { ...block.visibility, initial: 'hidden' } });
    } else {
      const { visibility, ...rest } = block;
      onChange(rest);
    }
  }

  return (
    <label className="settings-panel__checkbox-row settings-panel__visibility-toggle">
      <input type="checkbox" checked={isHidden} onChange={(e) => toggle(e.target.checked)} />
      Hidden until shown by a trigger
    </label>
  );
}

const COURSE_LEVEL_TABS = ['Course', 'Page', 'Variables'];

// Course-level settings area (Step 1: "accessible from the course-level
// settings area (alongside where Course Settings, header/footer, etc.
// already live -- add a new tab or section)") -- turned the previously
// single-purpose panel into three tabs rather than stacking Variables
// below Course Settings, since Page Settings (Step 5's Continue gate) also
// needed a home and three unrelated always-visible sections would crowd
// the panel more than a tab switcher does.
export default function SettingsPanel({
  selectedBlock,
  meta,
  page,
  pages,
  variables,
  onChangeMeta,
  onChangePage,
  onChangeVariables,
  onChangeBlock,
  assets,
  onUpdateCourseAsset,
  activeTab,
  onChangeTab,
  onOpenVariableManager,
}) {
  if (!selectedBlock) {
    return (
      <aside className="settings-panel">
        <div className="settings-panel__tabs">
          {COURSE_LEVEL_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'settings-panel__tab settings-panel__tab--active' : 'settings-panel__tab'}
              onClick={() => onChangeTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 'Page' && page ? (
          <PageSettingsPanel
            page={page}
            pages={pages}
            variables={variables}
            onChangePage={onChangePage}
            onOpenVariableManager={onOpenVariableManager}
          />
        ) : activeTab === 'Variables' ? (
          <VariableManagerPanel variables={variables} courseJson={{ pages }} onChangeVariables={onChangeVariables} />
        ) : (
          <CourseSettings meta={meta} onChangeMeta={onChangeMeta} />
        )}
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
      <BlockVisibilityToggle block={selectedBlock} onChange={onChangeBlock} />
      <TriggersSection
        block={selectedBlock}
        pageBlocks={page?.blocks || []}
        pages={pages}
        variables={variables}
        onChangeBlock={onChangeBlock}
        onOpenVariableManager={onOpenVariableManager}
      />
      <FacultyNotesField block={selectedBlock} onChange={onChangeBlock} />
    </aside>
  );
}

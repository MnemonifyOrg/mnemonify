import { useState } from 'react';
import { getBlockDefinition } from '@mnemonify/schema/block-registry.js';
import { BLOCK_SETTINGS } from './blocks/settingsIndex.js';
import { BLOCK_LABELS } from '../lib/blockDefaults.js';
import { autoBlockLabel } from '../lib/triggerUtils.js';
import VariableManagerPanel from './VariableManagerPanel.jsx';
import PageSettingsPanel from './PageSettingsPanel.jsx';
import PlayerSettingsPanel from './PlayerSettingsPanel.jsx';
import CourseHealthPanel from './CourseHealthPanel.jsx';
import TriggersSection from './TriggersSection.jsx';
import ConditionBuilder from './ConditionBuilder.jsx';
import InfoTooltip from './InfoTooltip.jsx';

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

      <label>
        Navigation mode
        <InfoTooltip text="Linear means learners must go through pages in order, one at a time. Free navigation lets them jump to any page from the menu whenever they want." />
      </label>
      <select
        className="input"
        value={meta.nav_mode || 'linear'}
        onChange={(e) => onChangeMeta({ ...meta, nav_mode: e.target.value })}
      >
        <option value="linear">Linear</option>
        <option value="free">Free navigation</option>
      </select>

      <label>Page display</label>
      <select
        className="input"
        value={meta.page_display || 'flat'}
        onChange={(e) => onChangeMeta({ ...meta, page_display: e.target.value })}
      >
        <option value="flat">Flat list</option>
        <option value="grouped">Grouped into modules</option>
      </select>

      <label>
        Completion rule
        <InfoTooltip text="Decides when this course reports as complete to the LMS (via SCORM). 'Viewed all pages' finishes once every page has been opened; 'Passed final knowledge check' waits for a passing score on the last quiz." />
      </label>
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

// Custom block labels (P1-56, Phase 4 usability-fix session). Every UI that
// lists blocks by name (SHOW_BLOCK/HIDE_BLOCK target pickers, trigger
// sentences, a block's own canvas toolbar label -- see triggerUtils.js's
// blockLabel) prefers this once set. Placeholder shows what the
// auto-generated fallback label would be (e.g. "Image (3)") so an author can
// see at a glance what they're overriding. Placed at the very top of the
// block settings panel, above the type-specific fields, per this task's
// "clearly visible... above Faculty notes" instruction -- found missing
// during hands-on testing: with several images on one page, the generic
// "Image" label in trigger dropdowns gave no way to tell them apart.
function BlockNameField({ block, pageBlocks, onChange }) {
  function handleChange(value) {
    if (!value) {
      const { label, ...rest } = block;
      onChange(rest);
      return;
    }
    onChange({ ...block, label: value });
  }

  return (
    <div className="settings-panel__block-name">
      <label>Block name</label>
      <input
        className="input"
        type="text"
        placeholder={autoBlockLabel(block, pageBlocks)}
        value={block.label || ''}
        onChange={(e) => handleChange(e.target.value)}
      />
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
      <div className="settings-panel__faculty-notes-header">
        <button
          type="button"
          className="btn-text settings-panel__faculty-notes-toggle"
          onClick={() => setExpanded((e) => !e)}
        >
          📝 Faculty notes (not shown to learners) {expanded ? '▲' : '▼'}
        </button>
        <InfoTooltip text="A private note only you and co-authors can see, like a reminder about how to teach this part or a source for a claim. Learners never see this, in the player, in print, or anywhere else." />
      </div>
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

// Self-owned block visibility (P1-55, Phase 4 usability-fix session). The
// more powerful, discoverable mechanism going forward -- an author sets
// this directly on the block that should be shown/hidden, rather than
// having to go find and edit some OTHER block's trigger (the real-user
// finding this fixes: showing an image once a variable is true previously
// required adding a SHOW_BLOCK action to the accordion's own trigger,
// which is unintuitive when the "should I be visible?" logic conceptually
// belongs to the image, not the accordion). Placed above the older
// "Hidden until shown by a trigger" toggle, and given its own heading, per
// this task's explicit "clearly visible, not buried" instruction.
// Precedence when both are set (see DECISIONS.md): visibility_condition
// wins -- once a block has one, any SHOW_BLOCK/HIDE_BLOCK trigger
// targeting it (from elsewhere) has no further effect.
function VisibilityConditionSection({ block, variables, onChangeBlock, onOpenVariableManager }) {
  function handleChange(condition) {
    if (condition) {
      onChangeBlock({ ...block, visibility_condition: condition }, { forceSnapshot: true });
    } else {
      const { visibility_condition, ...rest } = block;
      onChangeBlock(rest, { forceSnapshot: true });
    }
  }

  return (
    <div className="settings-panel__visibility-condition">
      <h4>
        Visibility
        <InfoTooltip text="Show or hide this block for a learner based on a condition, like only showing it if they answered a previous question a certain way. If you don't set a condition, the block always shows." />
      </h4>
      <ConditionBuilder
        variables={variables}
        value={block.visibility_condition || null}
        onChange={handleChange}
        onOpenVariableManager={onOpenVariableManager}
        toggleLabel="Show this block only if…"
      />
      {block.visibility_condition && (
        <p className="settings-panel__hint">
          This condition is now authoritative for this block's visibility -- it overrides any Show/Hide action another
          block's trigger points at this one.
        </p>
      )}
    </div>
  );
}

// Phase 4.6 Step 1: session-level (module-scope, resets on page reload,
// per this step's own "doesn't need to persist across reloads" allowance)
// memory of which blocks' Advanced disclosure the author has expanded.
// Deliberately a plain module-scoped Set rather than component state
// lifted to CourseEditor or a new localStorage key -- this only needs to
// survive across switching between blocks within the current session, and
// a Set living for the lifetime of the JS module does exactly that without
// a new prop-drilled state slot for something this minor. Mutated directly
// by AdvancedSection below; the component's own useState exists only to
// force a re-render on toggle (mutating a module-level Set doesn't).
const expandedAdvancedBlocks = new Set();

// blockId is passed as this component's `key` at the call site, not just
// a prop -- selecting a different block must fully remount this component
// so its useState initializer re-reads that block's own remembered
// expanded/collapsed state, rather than carrying over whatever the
// previously-selected block's Advanced section was showing.
function AdvancedSection({ blockId, children }) {
  const [expanded, setExpanded] = useState(expandedAdvancedBlocks.has(blockId));

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) expandedAdvancedBlocks.add(blockId);
    else expandedAdvancedBlocks.delete(blockId);
  }

  return (
    <div className="settings-panel__advanced">
      <button
        type="button"
        className="btn-text settings-panel__advanced-toggle"
        onClick={toggle}
        aria-expanded={expanded}
      >
        {expanded ? '▲' : '▼'} Advanced
      </button>
      {expanded && <div className="settings-panel__advanced-body">{children}</div>}
    </div>
  );
}

const COURSE_LEVEL_TABS = ['Course', 'Page', 'Player', 'Variables', 'Course Health'];

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
  onAddCourseResource,
  onRemoveCourseResource,
  onUpdateCourseResource,
  activeTab,
  onChangeTab,
  onOpenVariableManager,
  findings,
  onNavigateToFinding,
  onOpenAltTextReview,
}) {
  const errorCount = (findings || []).filter((f) => f.severity === 'error').length;

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
              {tab === 'Course Health' && findings?.length > 0 && (
                <span className={errorCount > 0 ? 'settings-panel__tab-badge settings-panel__tab-badge--error' : 'settings-panel__tab-badge'}>
                  {findings.length}
                </span>
              )}
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
        ) : activeTab === 'Player' ? (
          <PlayerSettingsPanel
            meta={meta}
            pages={pages}
            onChangeMeta={onChangeMeta}
            onAddCourseResource={onAddCourseResource}
            onRemoveCourseResource={onRemoveCourseResource}
            onUpdateCourseResource={onUpdateCourseResource}
          />
        ) : activeTab === 'Variables' ? (
          <VariableManagerPanel variables={variables} courseJson={{ pages }} onChangeVariables={onChangeVariables} />
        ) : activeTab === 'Course Health' ? (
          <CourseHealthPanel findings={findings || []} onNavigateToFinding={onNavigateToFinding} onOpenAltTextReview={onOpenAltTextReview} />
        ) : (
          <CourseSettings meta={meta} onChangeMeta={onChangeMeta} />
        )}
      </aside>
    );
  }

  const SettingsFields = BLOCK_SETTINGS[selectedBlock.type];
  const definition = getBlockDefinition(selectedBlock.type);
  // Falls back to "everything is Advanced, nothing is Basic content" for a
  // block type the registry somehow doesn't know about -- should never
  // happen in practice (every shipped type has a registry entry), but a
  // missing definition degrading gracefully beats a crash.
  const groups = definition?.settingsGroups || { basic: [], advanced: ['blockName', 'visibility', 'triggers', 'facultyNotes'] };

  return (
    <aside className="settings-panel">
      <div className="settings-panel__section">
        <h3>{BLOCK_LABELS[selectedBlock.type] || selectedBlock.type} Settings</h3>
        {groups.basic.includes('content') && SettingsFields ? (
          <SettingsFields
            block={selectedBlock}
            assets={assets}
            pageBlocks={page?.blocks || []}
            pages={pages}
            variables={variables}
            onChange={onChangeBlock}
            onUpdateCourseAsset={onUpdateCourseAsset}
            onOpenVariableManager={onOpenVariableManager}
          />
        ) : (
          <p className="settings-panel__empty">No additional settings for this block type.</p>
        )}
      </div>

      <AdvancedSection key={selectedBlock.block_id} blockId={selectedBlock.block_id}>
        {groups.advanced.includes('blockName') && (
          <BlockNameField block={selectedBlock} pageBlocks={page?.blocks || []} onChange={onChangeBlock} />
        )}
        {groups.advanced.includes('visibility') && (
          <>
            <VisibilityConditionSection
              block={selectedBlock}
              variables={variables}
              onChangeBlock={onChangeBlock}
              onOpenVariableManager={onOpenVariableManager}
            />
            {!selectedBlock.visibility_condition && <BlockVisibilityToggle block={selectedBlock} onChange={onChangeBlock} />}
          </>
        )}
        {groups.advanced.includes('triggers') && (
          <TriggersSection
            block={selectedBlock}
            pageBlocks={page?.blocks || []}
            pages={pages}
            variables={variables}
            onChangeBlock={onChangeBlock}
            onOpenVariableManager={onOpenVariableManager}
          />
        )}
        {groups.advanced.includes('facultyNotes') && <FacultyNotesField block={selectedBlock} onChange={onChangeBlock} />}
      </AdvancedSection>
    </aside>
  );
}

import { useRef, useState } from 'react';
import { genUtilityItemId } from '../lib/idGen.js';

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function ContactSection({ contact, onChange }) {
  const enabled = !!contact?.enabled;

  function update(patch) {
    onChange({ ...contact, ...patch });
  }

  return (
    <div className="settings-panel__section">
      <h4>Contact</h4>
      <label className="settings-panel__checkbox-row">
        <input type="checkbox" checked={enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        Show a Contact button in the player
      </label>
      {enabled && (
        <>
          <label>Email address</label>
          <input
            className="input"
            type="email"
            placeholder="education@example.org"
            value={contact?.email || ''}
            onChange={(e) => update({ email: e.target.value })}
          />
          <label>Subject prefix</label>
          <input
            className="input"
            placeholder="[Course Help]"
            value={contact?.subject_prefix || ''}
            onChange={(e) => update({ subject_prefix: e.target.value })}
          />
        </>
      )}
    </div>
  );
}

function ResourceRow({ resource, onUpdateLabel, onRemove }) {
  return (
    <li className="player-settings__resource-row">
      <div className="player-settings__resource-info">
        <span className="player-settings__resource-filename">{resource.filename}</span>
        <span className="player-settings__resource-size">{formatFileSize(resource.size_bytes)}</span>
      </div>
      <input
        className="input player-settings__resource-label"
        placeholder="Label shown to learners (defaults to filename)"
        defaultValue={resource.label || ''}
        onBlur={(e) => {
          const value = e.target.value.trim();
          if (value !== (resource.label || '')) onUpdateLabel(value || resource.filename);
        }}
      />
      <button type="button" className="btn-text" onClick={onRemove}>
        Remove
      </button>
    </li>
  );
}

const RESOURCE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt';

// Manually-attached course resources (Step 2, Phase 4 usability-fix
// session), distinct from the Phase 5 auto-generated PDF pipeline
// (P1-18/19) -- see DECISIONS.md. Upload/manage is available regardless
// of whether the Resources toggle is on: the toggle purely controls
// whether the button appears to learners in the player, so an author can
// prepare a course's resources before deciding to expose them, without
// losing anything already attached if the toggle happens to be off.
function ResourcesSection({ resourcesEnabled, resources, onToggleEnabled, onUpload, onUpdateLabel, onRemove }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await onUpload(file);
    } catch (err) {
      setError(err?.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="settings-panel__section">
      <h4>Resources</h4>
      <label className="settings-panel__checkbox-row">
        <input type="checkbox" checked={!!resourcesEnabled} onChange={(e) => onToggleEnabled(e.target.checked)} />
        Show a Resources button in the player
      </label>
      <p className="settings-panel__hint">
        Files attached below are what the Resources button lists once it's on -- you can upload and manage them
        either way.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={RESOURCE_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button type="button" className="btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Uploading…' : '+ Upload Resource'}
      </button>
      {error && <p className="settings-panel__error">{error}</p>}

      {resources.length === 0 ? (
        <p className="settings-panel__empty">No resources attached yet.</p>
      ) : (
        <ul className="player-settings__resource-list">
          {resources.map((resource) => (
            <ResourceRow
              key={resource.resource_id}
              resource={resource}
              onUpdateLabel={(label) => onUpdateLabel(resource.resource_id, label)}
              onRemove={() => onRemove(resource.resource_id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomItemRow({ item, pages, onChange, onRemove }) {
  function update(patch) {
    onChange({ ...item, ...patch });
  }

  function changeAction(action) {
    // A page_id means nothing as modal text and vice versa -- reset target
    // to a sensible default for the new action rather than carrying over a
    // value that would silently misbehave in the player.
    onChange({ ...item, action, target: action === 'jump_page' ? pages[0]?.page_id || '' : '' });
  }

  return (
    <li className="player-settings__custom-item">
      <input
        className="input"
        placeholder="Button label"
        value={item.label}
        onChange={(e) => update({ label: e.target.value })}
      />
      <select className="input" value={item.action} onChange={(e) => changeAction(e.target.value)}>
        <option value="modal">Show a message</option>
        <option value="jump_page">Jump to a page</option>
      </select>
      {item.action === 'jump_page' ? (
        pages.length === 0 ? (
          <p className="settings-panel__empty">No pages yet.</p>
        ) : (
          <select className="input" value={item.target} onChange={(e) => update({ target: e.target.value })}>
            {pages.map((p) => (
              <option key={p.page_id} value={p.page_id}>
                {p.title}
              </option>
            ))}
          </select>
        )
      ) : (
        <input
          className="input"
          placeholder="Message shown in the modal"
          value={item.target}
          onChange={(e) => update({ target: e.target.value })}
        />
      )}
      <button type="button" className="btn-text" onClick={onRemove}>
        Remove
      </button>
    </li>
  );
}

// Custom utility items (schema: utility_bar_custom_item, action enum
// "modal" | "jump_page") had schema and player-side rendering from Part 1
// but no editor UI at all -- grep of packages/editor/src confirmed zero
// references to utility_bar anywhere before this session. Built fresh here.
function CustomItemsSection({ custom, pages, onChange }) {
  function addItem() {
    onChange([...custom, { id: genUtilityItemId(), label: '', action: 'modal', target: '' }]);
  }

  function updateItem(index, updated) {
    onChange(custom.map((it, i) => (i === index ? updated : it)));
  }

  function removeItem(index) {
    onChange(custom.filter((_, i) => i !== index));
  }

  return (
    <div className="settings-panel__section">
      <h4>Custom items</h4>
      {custom.length === 0 ? (
        <p className="settings-panel__empty">No custom utility items yet.</p>
      ) : (
        <ul className="player-settings__custom-list">
          {custom.map((item, index) => (
            <CustomItemRow
              key={item.id}
              item={item}
              pages={pages}
              onChange={(updated) => updateItem(index, updated)}
              onRemove={() => removeItem(index)}
            />
          ))}
        </ul>
      )}
      <button type="button" className="btn" onClick={addItem}>
        + Add custom item
      </button>
    </div>
  );
}

// Player tab (Step 1, Phase 4 usability-fix session): consolidates the
// utility_bar configuration (Contact/Resources/custom items, ARCHITECTURE.md
// 3.3/5.1, P1-19) into one home. This is a relocation, not new functionality,
// for Contact -- except the utility bar previously had NO editor UI at all
// (see CustomItemsSection's comment), so "relocation" here really means
// "first-built, in its intended final home" rather than moving existing
// working UI. Resources (Step 2) lives in this same tab since the toggle
// built here is what the new resource-list feature is gated behind.
export default function PlayerSettingsPanel({
  meta,
  pages,
  onChangeMeta,
  onAddCourseResource,
  onRemoveCourseResource,
  onUpdateCourseResource,
}) {
  const utilityBar = meta.utility_bar || {};

  function updateUtilityBar(patch) {
    onChangeMeta({ ...meta, utility_bar: { ...utilityBar, ...patch } });
  }

  return (
    <div>
      <h3 className="settings-panel__player-heading">Player</h3>
      <ContactSection contact={utilityBar.contact} onChange={(contact) => updateUtilityBar({ contact })} />
      <ResourcesSection
        resourcesEnabled={utilityBar.resources?.enabled}
        resources={meta.resources || []}
        onToggleEnabled={(enabled) => updateUtilityBar({ resources: { ...utilityBar.resources, enabled } })}
        onUpload={onAddCourseResource}
        onUpdateLabel={onUpdateCourseResource}
        onRemove={onRemoveCourseResource}
      />
      <CustomItemsSection
        custom={utilityBar.custom || []}
        pages={pages}
        onChange={(custom) => updateUtilityBar({ custom })}
      />
    </div>
  );
}

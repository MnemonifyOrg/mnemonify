import { BLOCK_SETTINGS } from './blocks/settingsIndex.js';
import { BLOCK_LABELS } from '../lib/blockDefaults.js';

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
    </aside>
  );
}

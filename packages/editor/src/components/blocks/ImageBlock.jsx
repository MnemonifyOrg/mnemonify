import { useRef, useState } from 'react';
import api from '../../lib/api.js';

// Percentage of the block's available container width -- kept in sync
// with packages/player/src/blocks/ImageBlock.jsx's own copy so the
// editor canvas preview matches what the player actually renders.
const WIDTH_PRESET_PCT = { small: 25, medium: 50, large: 75, full: 100 };
const ALIGN_ITEMS = { left: 'flex-start', center: 'center', right: 'flex-end' };

export default function ImageBlockEditor({ block, assets, onChange, courseId, onAddCourseAsset }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const asset = (assets || []).find((a) => a.asset_id === block.content.asset_id);
  const widthPreset = block.content.width_preset || 'medium';
  const isFull = widthPreset === 'full';
  const alignment = isFull ? 'center' : block.content.alignment || 'center';
  const pct = WIDTH_PRESET_PCT[widthPreset] ?? WIDTH_PRESET_PCT.medium;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', courseId);
      const uploaded = await api.uploadAsset(formData);

      // The block/course JSON is only touched here, after the upload has
      // actually succeeded -- a failed or in-flight upload never reaches
      // this point, so it can't leave a dangling asset_id behind.
      const assetEntry = {
        asset_id: uploaded.asset_id,
        kind: 'image',
        src: `uploads/${uploaded.file_path}`,
        alt: '',
        caption: '',
      };
      onAddCourseAsset(assetEntry);
      onChange({ ...block, content: { ...block.content, asset_id: assetEntry.asset_id } });
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!asset) {
    return (
      <div className="image-block-editor image-block-editor__upload-zone" onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <p>{uploading ? 'Uploading...' : 'Click to upload an image'}</p>
        {error && <p className="image-block-editor__error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="image-block-editor">
      <div className="image-block-editor__preview" style={{ alignItems: ALIGN_ITEMS[alignment] }}>
        <img src={`/${asset.src}`} alt={asset.alt} style={{ width: `${pct}%`, maxWidth: '100%' }} />
      </div>
      <button className="btn-text" onClick={() => fileInputRef.current?.click()}>
        Replace image
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      {error && <p className="image-block-editor__error">{error}</p>}
    </div>
  );
}

const SIZE_PRESETS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'full', label: 'Full' },
];
const ALIGNMENTS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

// Shared between the top-level Settings panel (ImageBlockSettings below)
// and the two-column editor's inline slot controls -- an image block
// inside a two-column slot has no separate Settings-panel entry of its
// own (slot blocks are only reachable through the two-column container),
// so this needs to be usable standalone, not just as part of the bigger
// settings form.
export function ImageSizeAlignmentFields({ block, onChange }) {
  const widthPreset = block.content.width_preset || 'medium';
  const alignment = block.content.alignment || 'center';
  const isFull = widthPreset === 'full';

  // Discrete settings changes, not continuous typing -- each click is its
  // own forced undo/redo snapshot rather than the debounced-burst path
  // typing fields use (see CourseEditor.jsx's updateCourseJson).
  function setWidthPreset(preset) {
    onChange({ ...block, content: { ...block.content, width_preset: preset } }, { forceSnapshot: true });
  }
  function setAlignment(align) {
    onChange({ ...block, content: { ...block.content, alignment: align } }, { forceSnapshot: true });
  }

  return (
    <>
      <label>Size</label>
      <div className="image-block-settings__segmented">
        {SIZE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={widthPreset === preset.value ? 'btn btn-primary' : 'btn'}
            onClick={() => setWidthPreset(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <label>Alignment</label>
      <div className="image-block-settings__segmented">
        {ALIGNMENTS.map((align) => (
          <button
            key={align.value}
            type="button"
            className={alignment === align.value ? 'btn btn-primary' : 'btn'}
            disabled={isFull}
            onClick={() => setAlignment(align.value)}
          >
            {align.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function ImageBlockSettings({ block, assets, onChange, onUpdateCourseAsset }) {
  const asset = (assets || []).find((a) => a.asset_id === block.content.asset_id);
  if (!asset) return <p className="settings-panel__empty">Upload an image first.</p>;

  return (
    <>
      <label>Alt text</label>
      <input
        className="input"
        value={asset.alt || ''}
        onChange={(e) => onUpdateCourseAsset(asset.asset_id, { alt: e.target.value })}
      />
      <label>Caption</label>
      <input
        className="input"
        value={asset.caption || ''}
        onChange={(e) => onUpdateCourseAsset(asset.asset_id, { caption: e.target.value })}
      />

      <ImageSizeAlignmentFields block={block} onChange={onChange} />
    </>
  );
}

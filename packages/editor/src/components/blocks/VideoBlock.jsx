import { useMediaUpload } from './useMediaUpload.js';

export default function VideoBlockEditor({ block, assets, onChange, courseId, onAddCourseAsset }) {
  const asset = (assets || []).find((a) => a.asset_id === block.content.asset_id);
  const { fileInputRef, uploading, error, handleFileChange } = useMediaUpload({
    block,
    onChange,
    courseId,
    onAddCourseAsset,
    kind: 'video',
  });

  if (!asset) {
    return (
      <div className="media-block-editor__upload-zone" onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" hidden onChange={handleFileChange} />
        <p>{uploading ? 'Uploading...' : 'Click to upload a video file'}</p>
        {error && <p className="image-block-editor__error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="video-block-editor">
      <video className="media-block-editor__preview" src={`/${asset.src}`} controls />
      <button className="btn-text" onClick={() => fileInputRef.current?.click()}>
        Replace video
      </button>
      <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" hidden onChange={handleFileChange} />
      {error && <p className="image-block-editor__error">{error}</p>}
    </div>
  );
}

export function VideoBlockSettings({ block, onChange }) {
  // Autoplay/loop are discrete toggles, not continuous typing -- each
  // click is its own forced undo/redo snapshot (same pattern as
  // ImageBlockSettings' size/alignment buttons).
  function toggle(field) {
    onChange({ ...block, content: { ...block.content, [field]: !block.content[field] } }, { forceSnapshot: true });
  }

  return (
    <>
      <label className="settings-panel__checkbox-row">
        <input type="checkbox" checked={!!block.content.autoplay} onChange={() => toggle('autoplay')} />
        Autoplay
      </label>
      <label className="settings-panel__checkbox-row">
        <input type="checkbox" checked={!!block.content.loop} onChange={() => toggle('loop')} />
        Loop
      </label>
    </>
  );
}

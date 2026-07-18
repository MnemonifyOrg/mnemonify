import { useMediaUpload } from './useMediaUpload.js';

export default function AudioBlockEditor({ block, assets, onChange, courseId, onAddCourseAsset }) {
  const asset = (assets || []).find((a) => a.asset_id === block.content.asset_id);
  const { fileInputRef, uploading, error, handleFileChange } = useMediaUpload({
    block,
    onChange,
    courseId,
    onAddCourseAsset,
    kind: 'audio',
  });

  if (!asset) {
    return (
      <div className="media-block-editor__upload-zone" onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/wav,audio/mp4" hidden onChange={handleFileChange} />
        <p>{uploading ? 'Uploading...' : 'Click to upload an audio file'}</p>
        {error && <p className="image-block-editor__error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="audio-block-editor">
      <audio className="media-block-editor__preview media-block-editor__preview--audio" src={`/${asset.src}`} controls />
      <button className="btn-text" onClick={() => fileInputRef.current?.click()}>
        Replace audio
      </button>
      <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/wav,audio/mp4" hidden onChange={handleFileChange} />
      {error && <p className="image-block-editor__error">{error}</p>}
    </div>
  );
}

export function AudioBlockSettings({ block, onChange }) {
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

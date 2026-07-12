import { useRef, useState } from 'react';
import api from '../../lib/api.js';

export default function ImageBlockEditor({ block, assets, onChange, courseId, onAddCourseAsset }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const asset = (assets || []).find((a) => a.asset_id === block.content.asset_id);

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
      <img src={`/${asset.src}`} alt={asset.alt} />
      <button className="btn-text" onClick={() => fileInputRef.current?.click()}>
        Replace image
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      {error && <p className="image-block-editor__error">{error}</p>}
    </div>
  );
}

export function ImageBlockSettings({ block, assets, onUpdateCourseAsset }) {
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
    </>
  );
}

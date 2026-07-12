import { useEffect, useRef, useState } from 'react';
import api from '../lib/api.js';
import { genAssetId } from '../lib/idGen.js';

// Reconciles two asset layers: the DB `assets` table (upload tracking,
// queried here) and course_json.assets (what the player actually reads).
// Every DB asset created here gets a matching course_json.assets entry via
// onAddCourseAssets so newly uploaded images are immediately usable by
// blocks; alt/caption edits go to both via onUpdateCourseAsset + the DB
// PATCH so they never drift apart.
export default function MediaLibraryPanel({
  courseId,
  courseAssets,
  onAddCourseAssets,
  onUpdateCourseAsset,
  onClose,
  selectionMode,
  onAddSelected,
}) {
  const [dbAssets, setDbAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const filesInputRef = useRef(null);
  const zipInputRef = useRef(null);

  async function refresh() {
    setDbAssets(await api.listAssets(courseId));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [courseId]);

  function courseAssetFor(dbAsset) {
    return (courseAssets || []).find((a) => a.asset_id === dbAsset.asset_id);
  }

  async function handleBulkUpload(fileList, isZip) {
    const formData = new FormData();
    formData.append('course_id', courseId);
    if (isZip) {
      formData.append('zip', fileList[0]);
    } else {
      Array.from(fileList).forEach((f) => formData.append('files', f));
    }
    const result = await api.bulkUploadAssets(formData);

    const newCourseAssets = result.created.map((dbAsset) => ({
      asset_id: genAssetId(),
      kind: 'image',
      src: `uploads/${dbAsset.file_path}`,
      alt: '',
      caption: '',
      __dbAssetId: dbAsset.asset_id, // local-only correlation, stripped implicitly since player ignores unknown keys
    }));
    // course_json entries need to reference the SAME asset_id the DB row
    // was given so PATCH /api/assets/:id and the course JSON stay linked.
    result.created.forEach((dbAsset, i) => {
      newCourseAssets[i].asset_id = dbAsset.asset_id;
      delete newCourseAssets[i].__dbAssetId;
    });

    onAddCourseAssets(newCourseAssets);
    await refresh();
  }

  async function handleUpdateField(dbAsset, field, value) {
    await api.updateAsset(dbAsset.id, { [field]: value });
    onUpdateCourseAsset(dbAsset.asset_id, { [field]: value });
    setDbAssets((prev) => prev.map((a) => (a.id === dbAsset.id ? { ...a, [field]: value } : a)));
  }

  async function handleDelete(dbAsset) {
    await api.deleteAsset(dbAsset.id);
    await refresh();
  }

  function toggleSelected(assetId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  return (
    <div className="media-library-overlay" onClick={onClose}>
      <div className="media-library-panel" onClick={(e) => e.stopPropagation()}>
        <div className="media-library-panel__header">
          <h2>Media Library</h2>
          <button className="btn-text" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="media-library-panel__toolbar">
          <button className="btn" onClick={() => filesInputRef.current?.click()}>
            Upload Images
          </button>
          <input
            ref={filesInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files.length && handleBulkUpload(e.target.files, false)}
          />
          <button className="btn" onClick={() => zipInputRef.current?.click()}>
            Upload ZIP
          </button>
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            hidden
            onChange={(e) => e.target.files.length && handleBulkUpload(e.target.files, true)}
          />
          {selectionMode && (
            <button className="btn btn-primary media-library-panel__add-selected" disabled={selected.size === 0} onClick={() => onAddSelected([...selected])}>
              Add Selected ({selected.size})
            </button>
          )}
        </div>

        {loading ? null : dbAssets.length === 0 ? (
          <p className="settings-panel__empty">No images yet. Upload some to get started.</p>
        ) : (
          <div className="media-library-panel__grid">
            {dbAssets.map((dbAsset) => {
              const ca = courseAssetFor(dbAsset);
              const needsAlt = !ca?.alt;
              return (
                <div className="media-library-item" key={dbAsset.id}>
                  {selectionMode && (
                    <input
                      type="checkbox"
                      className="media-library-item__checkbox"
                      checked={selected.has(dbAsset.asset_id)}
                      onChange={() => toggleSelected(dbAsset.asset_id)}
                    />
                  )}
                  <img src={`/uploads/${dbAsset.file_path}`} alt={ca?.alt || ''} />
                  <p className="media-library-item__filename">{dbAsset.filename}</p>
                  <input
                    className={needsAlt ? 'input media-library-item__field media-library-item__field--needs-alt' : 'input media-library-item__field'}
                    placeholder="Alt text"
                    defaultValue={ca?.alt || ''}
                    onBlur={(e) => handleUpdateField(dbAsset, 'alt', e.target.value)}
                  />
                  <input
                    className="input media-library-item__field"
                    placeholder="Caption"
                    defaultValue={ca?.caption || ''}
                    onBlur={(e) => handleUpdateField(dbAsset, 'caption', e.target.value)}
                  />
                  {!selectionMode && (
                    <button className="btn-text" onClick={() => handleDelete(dbAsset)}>
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

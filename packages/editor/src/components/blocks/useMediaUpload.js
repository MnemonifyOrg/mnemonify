import { useRef, useState } from 'react';
import api from '../../lib/api.js';

// Shared upload logic for VideoBlock.jsx / AudioBlock.jsx editors -- same
// single-file-upload pattern as ImageBlockEditor's handleFileChange, kept
// generic over `kind` since only the MIME-type accept string and the
// resulting asset's `kind` field differ between the two.
export function useMediaUpload({ block, onChange, courseId, onAddCourseAsset, kind }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

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

      const assetEntry = {
        asset_id: uploaded.asset_id,
        kind,
        src: `uploads/${uploaded.file_path}`,
        alt: file.name,
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

  return { fileInputRef, uploading, error, handleFileChange };
}

import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import SettingsSection from './SettingsSection.jsx';

function errorMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

export default function ScormExportPanel({ courseId, canExport, published }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (job?.status !== 'generating') return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const next = await api.getScormExport(courseId, job.job_id);
        if (!cancelled) setJob(next);
      } catch (pollError) {
        if (!cancelled) setError(errorMessage(pollError, 'The SCORM export status could not be checked.'));
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [courseId, job]);

  async function startExport() {
    setStarting(true);
    setError(null);
    try {
      setJob(await api.startScormExport(courseId));
    } catch (startError) {
      setError(errorMessage(startError, 'The SCORM package could not be started.'));
    } finally {
      setStarting(false);
    }
  }

  if (!canExport) {
    return (
      <SettingsSection title="SCORM package export">
        <p className="settings-panel__hint">Only course owners and editors can export SCORM packages.</p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="SCORM package export">
      <p className="settings-panel__hint">Download the latest published version as a self-contained SCORM 2004 3rd Edition package.</p>
      {!published && <p className="share-links-panel__notice">Publish this course before downloading a SCORM package.</p>}
      {error && <p className="share-links-panel__error" role="alert">{error}</p>}
      {job?.warnings?.map((warning) => <p className="share-links-panel__notice" role="status" key={warning}>{warning}</p>)}
      {job?.status === 'ready' ? (
        <a className="btn btn-primary" href={api.scormExportDownloadUrl(courseId, job.job_id)}>Download SCORM package</a>
      ) : (
        <button type="button" className="btn btn-primary" onClick={startExport} disabled={!published || starting || job?.status === 'generating'}>
          {starting || job?.status === 'generating' ? 'Generating package…' : 'Download SCORM package'}
        </button>
      )}
      {job?.status === 'failed' && <p className="share-links-panel__error" role="alert">{job.error || 'The SCORM package could not be generated.'}</p>}
    </SettingsSection>
  );
}

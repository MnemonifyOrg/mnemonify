import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api.js';

function parseVtt(content) {
  return content
    .replace(/^WEBVTT[^\n]*\n?/i, '')
    .split(/\n\s*\n/)
    .map((cue) => cue.trim())
    .map((cue) => {
      const lines = cue.split('\n');
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex < 0) return null;
      const [start, end] = lines[timingIndex].split('-->').map((part) => part.trim());
      return { start, end, text: lines.slice(timingIndex + 1).join('\n') };
    })
    .filter(Boolean);
}

function cuesToVtt(cues) {
  return `WEBVTT\n\n${cues.map((cue, index) => `${index + 1}\n${cue.start} --> ${cue.end}\n${cue.text}`).join('\n\n')}\n`;
}

function statusLabel(row, missingLabel) {
  if (!row) return missingLabel;
  if (row.status === 'generating') return 'Generating…';
  if (row.status === 'failed') return 'Generation failed';
  return row.review_status === 'reviewed' ? 'Reviewed' : 'Draft ready';
}

export default function CaptionEditor({ asset, onUpdateCourseAsset, audioOnly = false }) {
  const [rows, setRows] = useState([]);
  const [cues, setCues] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const caption = useMemo(() => rows.find((row) => row.kind === 'caption'), [rows]);
  const transcriptRow = useMemo(() => rows.find((row) => row.kind === 'transcript'), [rows]);

  async function refresh() {
    try {
      const nextRows = await api.listCaptions(asset.asset_id);
      setRows(nextRows);
      const nextCaption = nextRows.find((row) => row.kind === 'caption');
      const nextTranscript = nextRows.find((row) => row.kind === 'transcript');
      setCues(nextCaption?.content ? parseVtt(nextCaption.content) : []);
      setTranscript(nextTranscript?.content || '');
      onUpdateCourseAsset(asset.asset_id, {
        ...(nextCaption?.status ? { caption_status: nextCaption.status } : {}),
        ...(nextCaption?.review_status ? { caption_review_status: nextCaption.review_status } : {}),
        ...(nextTranscript?.status ? { transcript_status: nextTranscript.status } : {}),
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load captions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.listCaptions(asset.asset_id).then((nextRows) => {
      if (!active) return;
      setRows(nextRows);
      const nextCaption = nextRows.find((row) => row.kind === 'caption');
      const nextTranscript = nextRows.find((row) => row.kind === 'transcript');
      setCues(nextCaption?.content ? parseVtt(nextCaption.content) : []);
      setTranscript(nextTranscript?.content || '');
      onUpdateCourseAsset(asset.asset_id, {
        ...(nextCaption?.status ? { caption_status: nextCaption.status } : {}),
        ...(nextCaption?.review_status ? { caption_review_status: nextCaption.review_status } : {}),
        ...(nextTranscript?.status ? { transcript_status: nextTranscript.status } : {}),
      });
      setLoading(false);
    }).catch((err) => {
      if (active) {
        setError(err.response?.data?.error || 'Could not load captions.');
        setLoading(false);
      }
    });
    return () => { active = false; };
    // Caption metadata is keyed by asset_id; the parent callback is stable
    // for this editor session but intentionally omitted from this fetch key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.asset_id]);

  useEffect(() => {
    if (!caption || caption.status !== 'generating') return undefined;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption?.status, asset.asset_id]);

  function updateCue(index, field, value) {
    setCues((current) => current.map((cue, cueIndex) => (cueIndex === index ? { ...cue, [field]: value } : cue)));
  }

  async function saveCaption(reviewStatus = caption?.review_status || 'draft') {
    setSaving(true);
    setError(null);
    try {
      await api.updateCaption(asset.asset_id, 'caption', { content: cuesToVtt(cues), review_status: reviewStatus });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save captions.');
    } finally {
      setSaving(false);
    }
  }

  async function saveTranscript() {
    setSaving(true);
    setError(null);
    try {
      await api.updateCaption(asset.asset_id, 'transcript', { content: transcript, review_status: transcriptRow?.review_status || 'draft' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save transcript.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadManual(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.uploadCaption(asset.asset_id, formData);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload caption file.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  }

  if (loading) return <p className="settings-panel__hint">Loading caption status…</p>;

  return (
    <div className="caption-editor">
      <div className="caption-editor__status-row">
        {!audioOnly && <strong>Captions: {statusLabel(caption, 'Not generated')}</strong>}
        <span>Transcript: {transcriptRow?.status === 'ready' ? 'Ready' : statusLabel(transcriptRow, 'Not generated')}</span>
      </div>
      {!audioOnly && caption?.error_message && <p className="image-block-editor__error">{caption.error_message}</p>}
      {error && <p className="image-block-editor__error">{error}</p>}
      {!audioOnly && caption?.status === 'ready' && (
        <>
          <div className="caption-editor__cues">
            {cues.map((cue, index) => (
              <div className="caption-editor__cue" key={`${index}-${cue.start}`}>
                <input className="input" aria-label={`Cue ${index + 1} start`} value={cue.start} onChange={(e) => updateCue(index, 'start', e.target.value)} />
                <input className="input" aria-label={`Cue ${index + 1} end`} value={cue.end} onChange={(e) => updateCue(index, 'end', e.target.value)} />
                <textarea className="input" aria-label={`Cue ${index + 1} text`} rows={2} value={cue.text} onChange={(e) => updateCue(index, 'text', e.target.value)} />
              </div>
            ))}
          </div>
          <div className="caption-editor__actions">
            <button type="button" className="btn" disabled={saving} onClick={() => saveCaption('draft')}>Save captions</button>
            <button type="button" className="btn-text" disabled={saving} onClick={() => saveCaption('reviewed')}>Mark captions reviewed</button>
          </div>
        </>
      )}
      {!audioOnly && (
        <label className="btn-text caption-editor__upload">
          Upload your own .vtt or .srt
          <input ref={fileInputRef} type="file" accept=".vtt,.srt,text/vtt,application/x-subrip" hidden onChange={uploadManual} />
        </label>
      )}
      {transcriptRow?.status === 'ready' && (
        <>
          <label className="caption-editor__transcript-label" htmlFor={`transcript-${asset.asset_id}`}>Transcript</label>
          <textarea id={`transcript-${asset.asset_id}`} className="input" rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          <button type="button" className="btn" disabled={saving} onClick={saveTranscript}>Save transcript</button>
        </>
      )}
    </div>
  );
}

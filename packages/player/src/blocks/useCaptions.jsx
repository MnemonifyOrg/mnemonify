import { useEffect, useState } from 'react';

export function useCaptions(assetId) {
  const [captionData, setCaptionData] = useState({ caption: null, transcript: null });

  useEffect(() => {
    let active = true;
    setCaptionData({ caption: null, transcript: null });
    if (!assetId) return () => { active = false; };
    window.__MNEMONIFY_CAPTIONS_PENDING__ = (window.__MNEMONIFY_CAPTIONS_PENDING__ || 0) + 1;
    const finish = () => { window.__MNEMONIFY_CAPTIONS_PENDING__ = Math.max(0, (window.__MNEMONIFY_CAPTIONS_PENDING__ || 1) - 1); };
    fetch(`/api/assets/${assetId}/captions`)
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => {
        if (!active) return;
        setCaptionData({
          caption: rows.find((row) => row.kind === 'caption' && row.status === 'ready') || null,
          transcript: rows.find((row) => row.kind === 'transcript' && row.status === 'ready') || null,
        });
      })
      .catch(() => {})
      .finally(finish);
    return () => { active = false; };
  }, [assetId]);

  return captionData;
}

export function TranscriptPanel({ transcript }) {
  const [open, setOpen] = useState(false);
  if (!transcript?.content?.trim()) return null;
  return (
    <details className="media-transcript" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{open ? 'Hide transcript' : 'Show transcript'}</summary>
      <div className="media-transcript__content">{transcript.content}</div>
    </details>
  );
}

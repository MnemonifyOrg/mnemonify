import { useState } from 'react';

function plainText(label) { return (label?.rich_text?.[0]?.v || label?.text || '').replace(/<[^>]+>/g, '').trim() || 'Hotspot information'; }
function assetSrc(asset) { return asset?.src?.startsWith('/') || asset?.src?.startsWith('http') ? asset.src : asset?.src ? `/${asset.src}` : ''; }

export default function HotspotBlock({ block, assets, onOpenModal, onTrigger }) {
  const image = assets?.find((asset) => asset.asset_id === block.content.image_asset_id);
  const regions = block.content.regions || [];
  const [found, setFound] = useState(() => new Set());
  if (!image) return <div className="block hotspot hotspot--missing"><p>Hotspot image unavailable.</p></div>;
  function activate(region) {
    onOpenModal?.({ type: 'message', message: plainText(region.label), ariaLabel: 'Hotspot information' });
    if (block.content.mode !== 'quiz') return;
    if (found.has(region.region_id)) return;
    const next = new Set(found); next.add(region.region_id); setFound(next);
    if (region.correct !== true) onTrigger(block, 'onIncorrect', { region_id: region.region_id, correct: false });
    const correctRegions = regions.filter((item) => item.correct === true);
    const allFound = correctRegions.length > 0 && correctRegions.every((item) => next.has(item.region_id));
    if (allFound) { onTrigger(block, 'onCorrect', { found_correct: correctRegions.length, total_correct: correctRegions.length }); onTrigger(block, 'onComplete', { found_correct: correctRegions.length, total_correct: correctRegions.length }); }
  }
  const exploratory = block.content.mode !== 'quiz';
  return <div className={`block hotspot ${exploratory ? 'hotspot--exploratory' : 'hotspot--quiz'}`}><div className="hotspot__image-wrap"><img className="hotspot__image" src={assetSrc(image)} alt={image.alt || ''} />{regions.map((region) => <button type="button" className={`hotspot__region ${found.has(region.region_id) ? 'hotspot__region--found' : ''}`} key={region.region_id} aria-label={`Hotspot ${region.region_id}`} style={{ left: `${region.x_pct}%`, top: `${region.y_pct}%`, width: `${region.width_pct}%`, height: `${region.height_pct}%` }} onClick={() => activate(region)}>{exploratory && <span className="hotspot__marker" aria-hidden="true" />}</button>)}</div>{block.content.mode === 'quiz' && <p className="hotspot__status" role="status">Found {found.size} of {regions.filter((region) => region.correct === true).length} correct regions</p>}</div>;
}

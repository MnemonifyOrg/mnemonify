import { useRef, useState } from 'react';
import EditableRichField from './EditableRichField.jsx';
import MediaLibraryPanel from '../MediaLibraryPanel.jsx';
import { genHotspotRegionId } from '../../lib/idGen.js';

function assetSrc(asset) { return asset?.src?.startsWith('/') || asset?.src?.startsWith('http') ? asset.src : asset?.src ? `/${asset.src}` : ''; }

export default function HotspotBlockEditor({ block, onChange, assets, courseId, onAddCourseAssets }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const image = assets?.find((asset) => asset.asset_id === block.content.image_asset_id);
  const previewRef = useRef(null);
  const dragRef = useRef(null);
  const [draftRect, setDraftRect] = useState(null);
  const regions = block.content.regions || [];
  function setContent(patch) { onChange({ ...block, content: { ...block.content, ...patch } }); }
  function start(event) { if (!image) return; const rect = previewRef.current.getBoundingClientRect(); dragRef.current = { rect, x: event.clientX, y: event.clientY }; setDraftRect({ x_pct: 0, y_pct: 0, width_pct: 0, height_pct: 0 }); }
  function update(event) { const startPoint = dragRef.current; if (!startPoint) return; const { rect, x, y } = startPoint; const endX = Math.max(rect.left, Math.min(rect.right, event.clientX)); const endY = Math.max(rect.top, Math.min(rect.bottom, event.clientY)); const left = Math.min(x, endX); const top = Math.min(y, endY); setDraftRect({ x_pct: ((left - rect.left) / rect.width) * 100, y_pct: ((top - rect.top) / rect.height) * 100, width_pct: (Math.abs(endX - x) / rect.width) * 100, height_pct: (Math.abs(endY - y) / rect.height) * 100 }); }
  function finish() { if (!draftRect || draftRect.width_pct < 1 || draftRect.height_pct < 1) { dragRef.current = null; setDraftRect(null); return; } setContent({ regions: [...regions, { region_id: genHotspotRegionId(), shape: 'rect', ...draftRect, label: { rich_text: [{ t: 'text', v: '' }] }, correct: block.content.mode === 'quiz' ? false : null }] }); dragRef.current = null; setDraftRect(null); }
  function updateRegion(id, patch) { setContent({ regions: regions.map((region) => region.region_id === id ? { ...region, ...patch } : region) }); }
  return <div className="hotspot-editor">
    <p className="settings-panel__hint">Draw regions on the image. This drag is author-only shape drawing; learners use keyboard-reachable buttons, never drag-and-drop.</p>
    {!image ? <button type="button" className="btn" onClick={() => setPickerOpen(true)}>Choose image</button> : <>
      <div className="hotspot-editor__canvas" ref={previewRef} onMouseDown={start} onMouseMove={update} onMouseUp={finish} onMouseLeave={update}><img src={assetSrc(image)} alt={image.alt || ''} />{regions.map((region) => <div className="hotspot-editor__region" key={region.region_id} style={{ left: `${region.x_pct}%`, top: `${region.y_pct}%`, width: `${region.width_pct}%`, height: `${region.height_pct}%` }}>{region.region_id}</div>)}{draftRect && <div className="hotspot-editor__region hotspot-editor__region--draft" style={{ left: `${draftRect.x_pct}%`, top: `${draftRect.y_pct}%`, width: `${draftRect.width_pct}%`, height: `${draftRect.height_pct}%` }} />}</div>
      <button type="button" className="btn-text" onClick={() => setPickerOpen(true)}>Change image</button>
      {regions.map((region, index) => <div className="hotspot-editor__row" key={region.region_id}><strong>Region {index + 1}</strong><EditableRichField className="editable-field" placeholder="Label shown when this region is activated..." value={region.label?.rich_text?.[0]?.v || region.label?.text || ''} onCommit={(html) => updateRegion(region.region_id, { label: { rich_text: [{ t: 'html', v: html }] } })} />{block.content.mode === 'quiz' && <label className="settings-panel__checkbox-row"><input type="checkbox" checked={region.correct === true} onChange={(event) => updateRegion(region.region_id, { correct: event.target.checked })} /> Correct region</label>}<button type="button" className="btn-text" onClick={() => setContent({ regions: regions.filter((item) => item.region_id !== region.region_id) })}>Delete region</button></div>)}
    </>}
    {pickerOpen && <MediaLibraryPanel courseId={courseId} courseAssets={assets} onAddCourseAssets={onAddCourseAssets} onUpdateCourseAsset={() => {}} onClose={() => setPickerOpen(false)} selectionMode onAddSelected={(ids) => { setContent({ image_asset_id: ids[0] }); setPickerOpen(false); }} getAssetDependents={() => []} />}
  </div>;
}

export function HotspotBlockSettings({ block, onChange }) {
  return <><label>Mode</label><select className="input" value={block.content.mode || 'exploratory'} onChange={(event) => onChange({ ...block, content: { ...block.content, mode: event.target.value, regions: (block.content.regions || []).map((region) => ({ ...region, correct: event.target.value === 'quiz' ? region.correct === true : null })) } })}><option value="exploratory">Exploratory</option><option value="quiz">Quiz</option></select><p className="settings-panel__hint">Quiz mode reports onCorrect when every correct region has been found and onIncorrect when an incorrect region is activated.</p></>;
}

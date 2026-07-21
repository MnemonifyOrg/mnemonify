import { useState } from 'react';
import EditableRichField from './EditableRichField.jsx';
import MediaLibraryPanel from '../MediaLibraryPanel.jsx';
import { genCardId } from '../../lib/idGen.js';

function move(list, index, delta) {
  const next = [...list]; const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function Side({ card, side, assets, onChange, courseId, onAddCourseAssets }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const value = card[side] || { rich_text: [{ t: 'text', v: '' }], image_id: null };
  const image = assets?.find((asset) => asset.asset_id === value.image_id);
  function setValue(patch) { onChange({ ...card, [side]: { ...value, ...patch } }); }
  return <div className="flashcards-editor__side">
    <strong>{side === 'front' ? 'Front' : 'Back'}</strong>
    <EditableRichField className="editable-field" placeholder={`Click to edit ${side}...`} value={value.rich_text?.[0]?.v || ''} onCommit={(html) => setValue({ rich_text: [{ t: 'html', v: html }] })} />
    {image && <img className="flashcards-editor__image" src={`/${image.src}`} alt={image.alt || ''} />}
    <button type="button" className="btn-text" onClick={() => setPickerOpen(true)}>{image ? 'Change image' : 'Add image'}</button>
    {image && <button type="button" className="btn-text" onClick={() => setValue({ image_id: null })}>Remove image</button>}
    {pickerOpen && <MediaLibraryPanel courseId={courseId} courseAssets={assets} onAddCourseAssets={onAddCourseAssets} onUpdateCourseAsset={() => {}} onClose={() => setPickerOpen(false)} selectionMode onAddSelected={(ids) => { setValue({ image_id: ids[0] }); setPickerOpen(false); }} getAssetDependents={() => []} />}
  </div>;
}

export default function FlashcardsBlockEditor({ block, onChange, assets, courseId, onAddCourseAssets }) {
  const cards = block.content.cards || [];
  function setCards(next) { onChange({ ...block, content: { ...block.content, cards: next } }); }
  function updateCard(id, card) { setCards(cards.map((item) => item.card_id === id ? card : item)); }
  function addCard() { setCards([...cards, { card_id: genCardId(), front: { rich_text: [{ t: 'text', v: '' }], image_id: null }, back: { rich_text: [{ t: 'text', v: '' }], image_id: null } }]); }
  return <div className="flashcards-editor">
    <p className="settings-panel__hint">Study cards are not scored. Learners flip cards and move through the deck.</p>
    {cards.map((card, index) => <div className="flashcards-editor__card" key={card.card_id}>
      <div className="flashcards-editor__card-header"><strong>Card {index + 1}</strong><span />
        <button type="button" className="btn-text" disabled={index === 0} onClick={() => setCards(move(cards, index, -1))}>↑</button>
        <button type="button" className="btn-text" disabled={index === cards.length - 1} onClick={() => setCards(move(cards, index, 1))}>↓</button>
        <button type="button" className="btn-text" disabled={cards.length <= 1} onClick={() => setCards(cards.filter((item) => item.card_id !== card.card_id))}>Remove</button>
      </div>
      <Side card={card} side="front" assets={assets} onChange={(next) => updateCard(card.card_id, next)} courseId={courseId} onAddCourseAssets={onAddCourseAssets} />
      <Side card={card} side="back" assets={assets} onChange={(next) => updateCard(card.card_id, next)} courseId={courseId} onAddCourseAssets={onAddCourseAssets} />
    </div>)}
    <button type="button" className="btn" onClick={addCard}>+ Add card</button>
  </div>;
}

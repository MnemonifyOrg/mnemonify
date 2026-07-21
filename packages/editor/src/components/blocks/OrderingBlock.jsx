import EditableRichField from './EditableRichField.jsx';
import { genOrderingItemId } from '../../lib/idGen.js';

function move(list, index, delta) { const next = [...list]; const target = index + delta; if (target < 0 || target >= next.length) return next; [next[index], next[target]] = [next[target], next[index]]; return next; }

export default function OrderingBlockEditor({ block, onChange }) {
  const items = block.content.items || [];
  function setItems(next) { onChange({ ...block, content: { ...block.content, items: next.map((item, index) => ({ ...item, correct_position: index })) } }); }
  return <div className="ordering-editor"><p className="settings-panel__hint">Arrange the items in the correct answer order. Learners will see them shuffled.</p>{items.map((item, index) => <div className="ordering-editor__row" key={item.item_id}><span>{index + 1}.</span><EditableRichField className="editable-field" placeholder="Item text..." value={item.text || item.rich_text?.[0]?.v || ''} onCommit={(html) => setItems(items.map((current) => current.item_id === item.item_id ? { ...current, text: html } : current))} /><button type="button" className="btn-text" disabled={index === 0} onClick={() => setItems(move(items, index, -1))}>↑</button><button type="button" className="btn-text" disabled={index === items.length - 1} onClick={() => setItems(move(items, index, 1))}>↓</button><button type="button" className="btn-text" disabled={items.length <= 2} onClick={() => setItems(items.filter((current) => current.item_id !== item.item_id))}>Remove</button></div>)}<button type="button" className="btn" onClick={() => setItems([...items, { item_id: genOrderingItemId(), text: '', correct_position: items.length }])}>+ Add item</button></div>;
}

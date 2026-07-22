import { useState } from 'react';
import RichText from './RichText.jsx';

function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }

export default function OrderingBlock({ block, onTrigger, variables }) {
  const [items, setItems] = useState(() => shuffle(block.content.items || []));
  const [result, setResult] = useState(null);
  function move(index, delta) { const next = [...items]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setItems(next); setResult(null); }
  function submit() { const correct = items.filter((item, index) => item.correct_position === index).length; const score = items.length ? correct / items.length : 0; const payload = { score, correct_items: correct, total_items: items.length }; setResult(items.map((item, index) => item.correct_position === index)); onTrigger(block, correct === items.length && items.length > 0 ? 'onCorrect' : 'onIncorrect', payload); onTrigger(block, 'onComplete', payload); }
  return <div className="block ordering"><ol className="ordering__list">{items.map((item, index) => <li className={result ? (result[index] ? 'ordering__item ordering__item--correct' : 'ordering__item ordering__item--incorrect') : 'ordering__item'} key={item.item_id}><RichText value={item.text || item.rich_text?.[0]?.v || ''} /><span className="ordering__actions"><button type="button" className="btn-text" aria-label={`Move item ${index + 1} up`} disabled={index === 0 || !!result} onClick={() => move(index, -1)}>↑</button><button type="button" className="btn-text" aria-label={`Move item ${index + 1} down`} disabled={index === items.length - 1 || !!result} onClick={() => move(index, 1)}>↓</button>{result && <span aria-label={result[index] ? 'Correct position' : 'Incorrect position'}>{result[index] ? '✓' : '✕'}</span>}</span></li>)}</ol><button type="button" className="btn btn-primary" onClick={submit} disabled={!!result || items.length === 0}>Submit</button>{result && <p role="status">Score: {result.filter(Boolean).length}/{items.length} ({Math.round((result.filter(Boolean).length / items.length) * 100)}%)</p>}</div>;
}

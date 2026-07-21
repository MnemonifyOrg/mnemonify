import { useState } from 'react';
import RichText from './RichText.jsx';

function CardSide({ side, assets }) {
  const image = assets?.find((asset) => asset.asset_id === side?.image_id);
  return <div className="flashcards__side"><RichText value={side?.rich_text?.[0]?.v || side?.text || ''} />{image && <img src={image.src.startsWith('/') || image.src.startsWith('http') ? image.src : `/${image.src}`} alt={image.alt || ''} />}</div>;
}

export default function FlashcardsBlock({ block, assets }) {
  const cards = block.content.cards || [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards.length) return <div className="block flashcards"><p>No cards have been added yet.</p></div>;
  const card = cards[index];
  function flip() { setFlipped((value) => !value); }
  function previous() { setIndex((value) => Math.max(0, value - 1)); setFlipped(false); }
  function next() { setIndex((value) => Math.min(cards.length - 1, value + 1)); setFlipped(false); }
  return <div className="block flashcards">
    <button type="button" className={`flashcards__card ${flipped ? 'flashcards__card--flipped' : ''}`} onClick={flip} aria-label={`${flipped ? 'Back' : 'Front'} of card ${index + 1}`}>
      <CardSide side={flipped ? card.back : card.front} assets={assets} />
    </button>
    <div className="flashcards__controls"><button type="button" className="btn" onClick={previous} disabled={index === 0}>Previous</button><span aria-live="polite">Card {index + 1} of {cards.length}</span><button type="button" className="btn" onClick={next} disabled={index === cards.length - 1}>Next</button></div>
  </div>;
}

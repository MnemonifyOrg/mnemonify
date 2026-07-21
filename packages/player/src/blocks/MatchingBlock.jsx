import { useMemo, useState } from 'react';
import RichText from './RichText.jsx';

function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }

export default function MatchingBlock({ block, onTrigger }) {
  const prompts = block.content.prompts || [];
  const options = useMemo(() => shuffle(block.content.options || []), [block.content.options]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  function submit() {
    const correct = prompts.filter((prompt) => answers[prompt.prompt_id] === prompt.correct_option_id).length;
    const score = prompts.length ? correct / prompts.length : 0;
    const complete = correct === prompts.length && prompts.length > 0;
    const payload = { score, correct_pairs: correct, total_pairs: prompts.length };
    setResult({ answers: { ...answers }, correct, score });
    onTrigger(block, complete ? 'onCorrect' : 'onIncorrect', payload);
    onTrigger(block, 'onComplete', payload);
  }
  function retry() { setAnswers({}); setResult(null); }
  return <div className="block matching"><div className="matching__rows">{prompts.map((prompt) => { const isCorrect = result && result.answers[prompt.prompt_id] === prompt.correct_option_id; return <div className="matching__row" key={prompt.prompt_id}><div className="matching__prompt"><RichText value={prompt.text || prompt.rich_text?.[0]?.v || ''} /></div><select className="matching__select" aria-label="Choose a matching option" value={answers[prompt.prompt_id] || ''} disabled={!!result} onChange={(event) => setAnswers((current) => ({ ...current, [prompt.prompt_id]: event.target.value }))}><option value="">Choose…</option>{options.map((option) => <option key={option.option_id} value={option.option_id}>{option.text?.replace(/<[^>]+>/g, '') || 'Untitled option'}</option>)}</select>{result && <span className={isCorrect ? 'matching__feedback matching__feedback--correct' : 'matching__feedback matching__feedback--incorrect'} aria-label={isCorrect ? 'Correct' : 'Incorrect'}>{isCorrect ? '✓' : '✕'}</span>}</div>; })}</div><button type="button" className="btn btn-primary" onClick={submit} disabled={!!result || prompts.some((prompt) => !answers[prompt.prompt_id])}>Submit</button>{result && <p className="matching__summary" role="status">Score: {result.correct}/{prompts.length} ({Math.round(result.score * 100)}%)</p>}{result && result.correct < prompts.length && block.content.allow_retry !== false && <button type="button" className="btn" onClick={retry}>Try Again</button>}</div>;
}

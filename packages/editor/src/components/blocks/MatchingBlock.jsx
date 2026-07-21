import EditableRichField from './EditableRichField.jsx';
import { genMatchingOptionId, genMatchingPromptId } from '../../lib/idGen.js';

function move(list, index, delta) {
  const next = [...list]; const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]]; return next;
}

export default function MatchingBlockEditor({ block, onChange }) {
  const { prompts = [], options = [] } = block.content;
  function setContent(patch) { onChange({ ...block, content: { ...block.content, ...patch } }); }
  function updatePrompt(id, patch) { setContent({ prompts: prompts.map((item) => item.prompt_id === id ? { ...item, ...patch } : item) }); }
  function updateOption(id, patch) { setContent({ options: options.map((item) => item.option_id === id ? { ...item, ...patch } : item) }); }
  function addPrompt() { setContent({ prompts: [...prompts, { prompt_id: genMatchingPromptId(), text: '', correct_option_id: options[0]?.option_id || '' }] }); }
  function addOption() { setContent({ options: [...options, { option_id: genMatchingOptionId(), text: '' }] }); }
  function removeOption(id) { setContent({ options: options.filter((item) => item.option_id !== id), prompts: prompts.map((item) => item.correct_option_id === id ? { ...item, correct_option_id: '' } : item) }); }
  return <div className="matching-editor">
    <p className="settings-panel__hint">Each prompt is matched to the correct option. Use the Advanced settings section to allow retries.</p>
    <h4>Prompts</h4>
    {prompts.map((prompt, index) => <div className="matching-editor__row" key={prompt.prompt_id}>
      <EditableRichField className="editable-field" placeholder="Prompt text..." value={prompt.text || prompt.rich_text?.[0]?.v || ''} onCommit={(html) => updatePrompt(prompt.prompt_id, { text: html })} />
      <select className="input" value={prompt.correct_option_id || ''} onChange={(event) => updatePrompt(prompt.prompt_id, { correct_option_id: event.target.value })}><option value="">Correct option…</option>{options.map((option) => <option key={option.option_id} value={option.option_id}>{option.text?.replace(/<[^>]+>/g, '') || 'Untitled option'}</option>)}</select>
      <button type="button" className="btn-text" disabled={index === 0} onClick={() => setContent({ prompts: move(prompts, index, -1) })}>↑</button><button type="button" className="btn-text" disabled={index === prompts.length - 1} onClick={() => setContent({ prompts: move(prompts, index, 1) })}>↓</button><button type="button" className="btn-text" disabled={prompts.length <= 1} onClick={() => setContent({ prompts: prompts.filter((item) => item.prompt_id !== prompt.prompt_id) })}>Remove</button>
    </div>)}
    <button type="button" className="btn" onClick={addPrompt}>+ Add prompt</button>
    <h4>Options</h4>
    {options.map((option, index) => <div className="matching-editor__row" key={option.option_id}><EditableRichField className="editable-field" placeholder="Option text..." value={option.text || ''} onCommit={(html) => updateOption(option.option_id, { text: html })} /><button type="button" className="btn-text" disabled={index === 0} onClick={() => setContent({ options: move(options, index, -1) })}>↑</button><button type="button" className="btn-text" disabled={index === options.length - 1} onClick={() => setContent({ options: move(options, index, 1) })}>↓</button><button type="button" className="btn-text" disabled={options.length <= 2} onClick={() => removeOption(option.option_id)}>Remove</button></div>)}
    <button type="button" className="btn" onClick={addOption}>+ Add option</button>
  </div>;
}

export function MatchingBlockSettings({ block, onChange }) {
  return <label className="settings-panel__checkbox-row"><input type="checkbox" checked={block.content.allow_retry !== false} onChange={(event) => onChange({ ...block, content: { ...block.content, allow_retry: event.target.checked } })} /> Allow learners to try again after an incorrect submission</label>;
}

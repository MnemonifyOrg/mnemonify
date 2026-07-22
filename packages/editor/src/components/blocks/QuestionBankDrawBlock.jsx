export default function QuestionBankDrawBlockEditor({ block, questionBanks = [] }) {
  const bank = questionBanks.find((candidate) => candidate.bank_id === block.content?.bank_id);
  return (
    <div className="question-bank-draw-editor card">
      <strong>{bank?.name || 'Question bank not selected'}</strong>
      <span>Draw {block.content?.draw_count || 0} question{block.content?.draw_count === 1 ? '' : 's'} at learner launch.</span>
    </div>
  );
}

export function QuestionBankDrawBlockSettings({ block, questionBanks = [], onChange }) {
  const bank = questionBanks.find((candidate) => candidate.bank_id === block.content?.bank_id);
  const drawCount = Number(block.content?.draw_count) || 1;
  const tooMany = Boolean(bank && drawCount > bank.questions.length);
  return (
    <>
      <label>Question bank</label>
      <select className="input" value={block.content?.bank_id || ''} onChange={(event) => onChange({ ...block, content: { ...block.content, bank_id: event.target.value } })}>
        <option value="">Select a bank…</option>
        {questionBanks.map((candidate) => <option key={candidate.bank_id} value={candidate.bank_id}>{candidate.name || candidate.bank_id} ({candidate.questions.length} questions)</option>)}
      </select>
      <label>Questions to draw</label>
      <input type="number" className="input" min="1" max={bank?.questions.length || undefined} value={drawCount} onChange={(event) => onChange({ ...block, content: { ...block.content, draw_count: Math.max(1, Number(event.target.value) || 1) } })} />
      {tooMany && <p className="settings-panel__warning">This draw requests {drawCount}, but the selected bank has only {bank.questions.length} question{bank.questions.length === 1 ? '' : 's'}.</p>}
      {!bank && <p className="settings-panel__hint">Create a question bank in the Question Banks tab, then select it here.</p>}
    </>
  );
}

import { useState } from 'react';
import { genBankId, genBankQuestionId } from '../lib/idGen.js';
import QuestionBankEditorModal from './QuestionBankEditorModal.jsx';

function emptyQuestion() {
  return {
    question_id: genBankQuestionId(),
    scored: true,
    objective_ids: [],
    tags: [],
    content: {
      scored: true,
      question: '',
      options: [
        { id: `opt_${genBankQuestionId().slice(3)}`, text: '', correct: true },
        { id: `opt_${genBankQuestionId().slice(3)}`, text: '', correct: false },
      ],
    },
  };
}

export default function QuestionBankManagerPanel({ questionBanks, assets, courseId, onChangeQuestionBanks, onAddCourseAssets, onUpdateCourseAsset, variables = [], objectives = [] }) {
  const banks = questionBanks || [];
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.bank_id || null);
  const [editorOpen, setEditorOpen] = useState(false);
  const selectedBank = banks.find((bank) => bank.bank_id === selectedBankId) || banks[0];

  function updateBanks(next, options = { forceSnapshot: true }) {
    onChangeQuestionBanks(next, options);
    if (!next.some((bank) => bank.bank_id === selectedBankId)) {
      setSelectedBankId(next[0]?.bank_id || null);
      setEditorOpen(false);
    }
  }

  function createBank() {
    const bank = { bank_id: genBankId(), name: `Question Bank ${banks.length + 1}`, questions: [emptyQuestion()] };
    updateBanks([...banks, bank]);
    setSelectedBankId(bank.bank_id);
    setEditorOpen(true);
  }

  function updateBank(patch, options = { forceSnapshot: false }) {
    if (!selectedBank) return;
    updateBanks(banks.map((bank) => (bank.bank_id === selectedBank.bank_id ? { ...bank, ...patch } : bank)), options);
  }

  function deleteBank() {
    if (!selectedBank || (typeof window !== 'undefined' && !window.confirm(`Delete ${selectedBank.name || 'this question bank'}? Existing draw blocks will become unconfigured.`))) return;
    updateBanks(banks.filter((bank) => bank.bank_id !== selectedBank.bank_id));
  }

  function addQuestion() {
    if (!selectedBank) return null;
    const question = emptyQuestion();
    updateBank({ questions: [...selectedBank.questions, question] });
    return question.question_id;
  }

  return (
    <div className="settings-panel__section question-bank-manager">
      <h3>Question Banks</h3>
      <p className="settings-panel__hint">Reusable question collections. Open a bank in the full editor to search, manage, and author its questions.</p>
      <div className="question-bank-manager__toolbar">
        <select className="input" aria-label="Select question bank" value={selectedBank?.bank_id || ''} onChange={(event) => { setSelectedBankId(event.target.value); setEditorOpen(false); }}>
          {banks.length === 0 && <option value="">No banks yet</option>}
          {banks.map((bank) => <option key={bank.bank_id} value={bank.bank_id}>{bank.name || bank.bank_id}</option>)}
        </select>
        <button type="button" className="btn" onClick={createBank}>+ New bank</button>
      </div>
      {!selectedBank ? <p className="settings-panel__empty">Create a bank to start adding reusable questions.</p> : (
        <>
          <label>Bank name</label>
          <input className="input" value={selectedBank.name || ''} onChange={(event) => updateBank({ name: event.target.value })} />
          <div className="question-bank-manager__summary">
            <strong>{selectedBank.questions?.length || 0} question{selectedBank.questions?.length === 1 ? '' : 's'}</strong>
            <span className="settings-panel__hint">Includes objective mapping, tags, images, feedback, and scoring controls.</span>
          </div>
          <div className="question-bank-manager__actions">
            <button type="button" className="btn btn-primary" onClick={() => setEditorOpen(true)}>Open bank editor</button>
            <button type="button" className="btn-text settings-panel__danger-action" onClick={deleteBank}>Delete bank</button>
          </div>
        </>
      )}
      {editorOpen && selectedBank && (
        <QuestionBankEditorModal
          bank={selectedBank}
          assets={assets}
          courseId={courseId}
          objectives={objectives}
          variables={variables}
          onChangeBank={updateBank}
          onAddQuestion={addQuestion}
          onAddCourseAssets={onAddCourseAssets}
          onUpdateCourseAsset={onUpdateCourseAsset}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}

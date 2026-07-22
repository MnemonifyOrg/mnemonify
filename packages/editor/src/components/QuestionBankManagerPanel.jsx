import { useState } from 'react';
import KnowledgeCheckBlockEditor from './blocks/KnowledgeCheckBlock.jsx';
import { genBankId, genBankQuestionId } from '../lib/idGen.js';

function emptyQuestion() {
  return {
    question_id: genBankQuestionId(),
    scored: true,
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

export default function QuestionBankManagerPanel({ questionBanks, assets, courseId, onChangeQuestionBanks, onAddCourseAssets, onUpdateCourseAsset, variables = [] }) {
  const banks = questionBanks || [];
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.bank_id || null);
  const selectedBank = banks.find((bank) => bank.bank_id === selectedBankId) || banks[0];

  function updateBanks(next, options = { forceSnapshot: true }) {
    onChangeQuestionBanks(next, options);
    if (!next.some((bank) => bank.bank_id === selectedBankId)) setSelectedBankId(next[0]?.bank_id || null);
  }

  function createBank() {
    const bank = { bank_id: genBankId(), name: `Question Bank ${banks.length + 1}`, questions: [emptyQuestion()] };
    updateBanks([...banks, bank]);
    setSelectedBankId(bank.bank_id);
  }

  function updateBank(patch) {
    updateBanks(banks.map((bank) => (bank.bank_id === selectedBank?.bank_id ? { ...bank, ...patch } : bank)), { forceSnapshot: false });
  }

  function deleteBank() {
    if (!selectedBank || !window.confirm(`Delete ${selectedBank.name || 'this question bank'}? Existing draw blocks will become unconfigured.`)) return;
    updateBanks(banks.filter((bank) => bank.bank_id !== selectedBank.bank_id));
  }

  function updateQuestion(questionId, content) {
    updateBank({ questions: selectedBank.questions.map((question) => (question.question_id === questionId ? { ...question, content, scored: content.scored !== false } : question)) });
  }

  function moveQuestion(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= selectedBank.questions.length) return;
    const questions = [...selectedBank.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    updateBank({ questions });
  }

  function removeQuestion(questionId) {
    if (selectedBank.questions.length <= 1) return;
    updateBank({ questions: selectedBank.questions.filter((question) => question.question_id !== questionId) });
  }

  return (
    <div className="settings-panel__section question-bank-manager">
      <h3>Question Banks</h3>
      <p className="settings-panel__hint">Reusable question collections. A Question Bank block can draw a random subset while keeping that selection stable for each learner.</p>
      <div className="question-bank-manager__toolbar">
        <select className="input" aria-label="Select question bank" value={selectedBank?.bank_id || ''} onChange={(event) => setSelectedBankId(event.target.value)}>
          {banks.length === 0 && <option value="">No banks yet</option>}
          {banks.map((bank) => <option key={bank.bank_id} value={bank.bank_id}>{bank.name || bank.bank_id}</option>)}
        </select>
        <button type="button" className="btn" onClick={createBank}>+ New bank</button>
      </div>
      {!selectedBank ? <p className="settings-panel__empty">Create a bank to start adding reusable questions.</p> : (
        <>
          <label>Bank name</label>
          <input className="input" value={selectedBank.name || ''} onChange={(event) => updateBank({ name: event.target.value })} />
          <button type="button" className="btn-text settings-panel__danger-action" onClick={deleteBank}>Delete bank</button>
          <div className="question-bank-manager__questions">
            {selectedBank.questions.map((question, index) => (
              <div className="question-bank-manager__question card" key={question.question_id}>
                <div className="question-bank-manager__question-header">
                  <strong>Question {index + 1}</strong>
                  <span>
                    <button type="button" className="btn-text" disabled={index === 0} onClick={() => moveQuestion(index, -1)}>↑</button>
                    <button type="button" className="btn-text" disabled={index === selectedBank.questions.length - 1} onClick={() => moveQuestion(index, 1)}>↓</button>
                    <button type="button" className="btn-text" disabled={selectedBank.questions.length <= 1} onClick={() => removeQuestion(question.question_id)}>Remove</button>
                  </span>
                </div>
                <KnowledgeCheckBlockEditor
                  block={{ block_id: `blk_${question.question_id}`, type: 'knowledge-check', content: question.content, triggers: [] }}
                  assets={assets}
                  courseId={courseId}
                  onChange={(updated) => updateQuestion(question.question_id, updated.content)}
                  onAddCourseAssets={onAddCourseAssets}
                  onUpdateCourseAsset={onUpdateCourseAsset}
                  variables={variables}
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => updateBank({ questions: [...selectedBank.questions, emptyQuestion()] })}>+ Add question</button>
        </>
      )}
    </div>
  );
}

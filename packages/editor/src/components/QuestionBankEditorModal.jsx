import { useEffect, useState } from 'react';
import KnowledgeCheckBlockEditor from './blocks/KnowledgeCheckBlock.jsx';
import {
  bulkAssignObjective,
  bulkAssignTag,
  bulkDeleteQuestions,
  bulkRemoveObjective,
  bulkRemoveTag,
  filterBankQuestions,
  questionDisplayText,
  questionType,
} from '../lib/questionBank.js';

const EMPTY_QUESTIONS = [];

function objectiveLabel(objective) {
  return objective.label || objective.text || objective.objective_id;
}

export default function QuestionBankEditorModal({
  bank,
  assets,
  courseId,
  objectives = [],
  variables = [],
  onChangeBank,
  onAddQuestion,
  onRequestLinkedQuestionEdit,
  onRequestLinkedQuestionDelete,
  onAddCourseAssets,
  onUpdateCourseAsset,
  onClose,
}) {
  const questions = bank?.questions ?? EMPTY_QUESTIONS;
  const [activeQuestionId, setActiveQuestionId] = useState(questions[0]?.question_id || null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [objectiveFilter, setObjectiveFilter] = useState('all');
  const [bulkObjectiveId, setBulkObjectiveId] = useState('');
  const [bulkTag, setBulkTag] = useState('');

  useEffect(() => {
    if (!questions.some((question) => question.question_id === activeQuestionId)) {
      setActiveQuestionId(questions[0]?.question_id || null);
    }
    setSelectedQuestionIds((current) => current.filter((id) => questions.some((question) => question.question_id === id)));
  }, [bank?.bank_id, questions, activeQuestionId]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const visibleQuestions = filterBankQuestions(questions, { query, type: typeFilter, objectiveId: objectiveFilter });
  const activeQuestion = questions.find((question) => question.question_id === activeQuestionId) || null;
  const questionTypes = [...new Set(questions.map(questionType))];
  const selectedCount = selectedQuestionIds.length;
  const allVisibleSelected = visibleQuestions.length > 0 && visibleQuestions.every((question) => selectedQuestionIds.includes(question.question_id));

  function updateQuestions(nextQuestions, options = { forceSnapshot: false }) {
    onChangeBank({ questions: nextQuestions }, options);
  }

  function toggleQuestion(questionId) {
    setSelectedQuestionIds((current) => current.includes(questionId)
      ? current.filter((id) => id !== questionId)
      : [...current, questionId]);
  }

  function toggleVisibleQuestions() {
    const visibleIds = visibleQuestions.map((question) => question.question_id);
    setSelectedQuestionIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  }

  function applyBulk(operation) {
    const nextQuestions = operation(questions, selectedQuestionIds);
    const linkedChanged = nextQuestions.find((question, index) => {
      const previous = questions[index];
      return question.linked_entity_id && JSON.stringify(question) !== JSON.stringify(previous);
    });
    if (linkedChanged?.linked_entity_id) {
      onRequestLinkedQuestionEdit?.({
        entityId: linkedChanged.linked_entity_id,
        usage: { kind: 'bank', bank_id: bank.bank_id, question_id: linkedChanged.question_id, entityId: linkedChanged.linked_entity_id },
        question: linkedChanged,
      });
      return;
    }
    updateQuestions(nextQuestions);
  }

  function deleteSelected() {
    if (selectedCount === 0 || (typeof window !== 'undefined' && !window.confirm(`Delete ${selectedCount} selected question${selectedCount === 1 ? '' : 's'}?`))) return;
    const linkedQuestion = questions.find((question) => selectedQuestionIds.includes(question.question_id) && question.linked_entity_id);
    if (linkedQuestion) {
      onRequestLinkedQuestionDelete?.({
        entityId: linkedQuestion.linked_entity_id,
        usage: { kind: 'bank', bank_id: bank.bank_id, question_id: linkedQuestion.question_id, entityId: linkedQuestion.linked_entity_id },
        question: linkedQuestion,
      });
      return;
    }
    const nextQuestions = bulkDeleteQuestions(questions, selectedQuestionIds);
    updateQuestions(nextQuestions);
    setSelectedQuestionIds([]);
    if (!nextQuestions.some((question) => question.question_id === activeQuestionId)) setActiveQuestionId(nextQuestions[0]?.question_id || null);
  }

  function updateQuestion(questionId, content, objectiveIds) {
    const current = questions.find((question) => question.question_id === questionId);
    const updated = { ...current, content, objective_ids: objectiveIds, scored: content.scored !== false };
    if (current?.linked_entity_id) {
      onRequestLinkedQuestionEdit?.({
        entityId: current.linked_entity_id,
        usage: { kind: 'bank', bank_id: bank.bank_id, question_id: questionId, entityId: current.linked_entity_id },
        question: updated,
      });
      return;
    }
    updateQuestions(questions.map((question) => (question.question_id === questionId ? updated : question)));
  }

  function moveQuestion(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    const nextQuestions = [...questions];
    [nextQuestions[index], nextQuestions[target]] = [nextQuestions[target], nextQuestions[index]];
    updateQuestions(nextQuestions, { forceSnapshot: true });
  }

  function removeQuestion(questionId) {
    if (questions.length <= 1) return;
    const current = questions.find((question) => question.question_id === questionId);
    if (current?.linked_entity_id) {
      onRequestLinkedQuestionDelete?.({
        entityId: current.linked_entity_id,
        usage: { kind: 'bank', bank_id: bank.bank_id, question_id: questionId, entityId: current.linked_entity_id },
        question: current,
      });
      return;
    }
    const nextQuestions = questions.filter((question) => question.question_id !== questionId);
    updateQuestions(nextQuestions);
    setSelectedQuestionIds((current) => current.filter((id) => id !== questionId));
    if (activeQuestionId === questionId) setActiveQuestionId(nextQuestions[0]?.question_id || null);
  }

  return (
    <div
      className="modal-overlay question-bank-editor-overlay"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="modal-card question-bank-editor-modal" role="dialog" aria-modal="true" aria-labelledby="question-bank-editor-title">
        <header className="question-bank-editor-modal__header">
          <div>
            <span className="eyebrow">Question Bank</span>
            <h2 id="question-bank-editor-title">{bank?.name || 'Untitled bank'}</h2>
            <p className="settings-panel__hint">Manage questions, objectives, and tags in this bank.</p>
          </div>
          <button type="button" className="btn-text modal-close" aria-label="Close question bank editor" onClick={onClose}>✕</button>
        </header>

        <div className="question-bank-editor-modal__body">
          <aside className="question-bank-editor-modal__master" aria-label="Question bank question list">
            <div className="question-bank-editor-modal__filters">
              <label htmlFor="question-bank-search">Search questions</label>
              <input id="question-bank-search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search text or tags" />
              <label htmlFor="question-bank-type-filter">Question type</label>
              <select id="question-bank-type-filter" className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                {questionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <label htmlFor="question-bank-objective-filter">Objective</label>
              <select id="question-bank-objective-filter" className="input" value={objectiveFilter} onChange={(event) => setObjectiveFilter(event.target.value)}>
                <option value="all">All objectives</option>
                {objectives.map((objective) => <option key={objective.objective_id} value={objective.objective_id}>{objectiveLabel(objective)}</option>)}
              </select>
            </div>

            <div className="question-bank-editor-modal__list-toolbar">
              <label className="settings-panel__checkbox-row">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleQuestions} />
                Select visible ({visibleQuestions.length})
              </label>
              <span className="question-bank-editor-modal__count">{questions.length} total</span>
            </div>
            <button type="button" className="btn question-bank-editor-modal__add" onClick={() => { const questionId = onAddQuestion?.(); if (questionId) setActiveQuestionId(questionId); }}>+ Add question</button>

            <ul className="question-bank-editor-modal__list">
              {visibleQuestions.map((question) => (
                <li className={question.question_id === activeQuestionId ? 'question-bank-editor-modal__list-item question-bank-editor-modal__list-item--active' : 'question-bank-editor-modal__list-item'} key={question.question_id}>
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(question.question_id)}
                    onChange={() => toggleQuestion(question.question_id)}
                    aria-label={`Select ${questionDisplayText(question)}`}
                  />
                  <button type="button" className="question-bank-editor-modal__question-button" onClick={() => setActiveQuestionId(question.question_id)}>
                    <strong>{questionDisplayText(question)}</strong>
                    <span>{questionType(question)} · {question.scored === false ? 'Unscored' : 'Scored'}</span>
                    {(question.tags || []).length > 0 && <small>{question.tags.join(' · ')}</small>}
                  </button>
                </li>
              ))}
              {visibleQuestions.length === 0 && <li className="settings-panel__empty">No questions match these filters.</li>}
            </ul>

            <div className="question-bank-editor-modal__bulk-actions">
              <strong>Bulk actions{selectedCount > 0 ? ` (${selectedCount})` : ''}</strong>
              <select className="input" aria-label="Bulk objective" value={bulkObjectiveId} onChange={(event) => setBulkObjectiveId(event.target.value)}>
                <option value="">Choose objective</option>
                {objectives.map((objective) => <option key={objective.objective_id} value={objective.objective_id}>{objectiveLabel(objective)}</option>)}
              </select>
              <div className="question-bank-editor-modal__bulk-row">
                <button type="button" className="btn" disabled={!bulkObjectiveId || selectedCount === 0} onClick={() => applyBulk((items, ids) => bulkAssignObjective(items, ids, bulkObjectiveId))}>Assign objective</button>
                <button type="button" className="btn-text" disabled={!bulkObjectiveId || selectedCount === 0} onClick={() => applyBulk((items, ids) => bulkRemoveObjective(items, ids, bulkObjectiveId))}>Remove objective</button>
              </div>
              <input className="input" aria-label="Bulk tag" value={bulkTag} onChange={(event) => setBulkTag(event.target.value)} placeholder="Tag name" />
              <div className="question-bank-editor-modal__bulk-row">
                <button type="button" className="btn" disabled={!bulkTag.trim() || selectedCount === 0} onClick={() => applyBulk((items, ids) => bulkAssignTag(items, ids, bulkTag))}>Add tag</button>
                <button type="button" className="btn-text" disabled={!bulkTag.trim() || selectedCount === 0} onClick={() => applyBulk((items, ids) => bulkRemoveTag(items, ids, bulkTag))}>Remove tag</button>
              </div>
              <button type="button" className="btn-text settings-panel__danger-action" disabled={selectedCount === 0 || questions.length - selectedCount < 1} onClick={deleteSelected}>Delete selected</button>
            </div>
          </aside>

          <section className="question-bank-editor-modal__detail" aria-label="Selected question editor">
            {activeQuestion ? (
              <>
                <div className="question-bank-editor-modal__detail-header">
                  <div>
                    <span className="eyebrow">Selected question</span>
                    <h3>{questionDisplayText(activeQuestion)}</h3>
                  </div>
                  <div className="question-bank-editor-modal__question-actions">
                    <button type="button" className="btn-text" disabled={questions.findIndex((question) => question.question_id === activeQuestion.question_id) === 0} onClick={() => moveQuestion(questions.findIndex((question) => question.question_id === activeQuestion.question_id), -1)}>↑ Move up</button>
                    <button type="button" className="btn-text" disabled={questions.findIndex((question) => question.question_id === activeQuestion.question_id) === questions.length - 1} onClick={() => moveQuestion(questions.findIndex((question) => question.question_id === activeQuestion.question_id), 1)}>↓ Move down</button>
                    <button type="button" className="btn-text settings-panel__danger-action" disabled={questions.length <= 1} onClick={() => removeQuestion(activeQuestion.question_id)}>Remove</button>
                  </div>
                </div>
                <KnowledgeCheckBlockEditor
                  block={{ block_id: `blk_${activeQuestion.question_id}`, type: 'knowledge-check', content: activeQuestion.content, objective_ids: activeQuestion.objective_ids || [], triggers: [] }}
                  assets={assets}
                  courseId={courseId}
                  onChange={(updated) => updateQuestion(activeQuestion.question_id, updated.content, updated.objective_ids || [])}
                  onAddCourseAssets={onAddCourseAssets}
                  onUpdateCourseAsset={onUpdateCourseAsset}
                  variables={variables}
                  objectives={objectives}
                />
              </>
            ) : (
              <p className="settings-panel__empty">Select a question to edit it.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

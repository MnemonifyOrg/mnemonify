import { useRef, useState } from 'react';
import { genBankId, genBankQuestionId } from '../lib/idGen.js';
import QuestionBankEditorModal from './QuestionBankEditorModal.jsx';
import BankExportModal from './BankExportModal.jsx';
import BankImportReviewModal from './BankImportReviewModal.jsx';
import { buildNativeQuestionBankExport, exportQuestionBankAsGift, parseNativeQuestionBankExport } from '@mnemonify/schema/question-bank-transfer.js';

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

export default function QuestionBankManagerPanel({ questionBanks, courseJson, assets, courseId, onChangeQuestionBanks, onImportBank, onAddCourseAssets, onUpdateCourseAsset, variables = [], objectives = [], onLinkBlockToBank, onRequestLinkedQuestionEdit, onRequestLinkedQuestionDelete }) {
  const banks = questionBanks || [];
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.bank_id || null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importPayload, setImportPayload] = useState(null);
  const [importError, setImportError] = useState(null);
  const importInputRef = useRef(null);
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

  function downloadExport(format) {
    const sourceCourse = courseJson || { question_banks: banks, linked_entities: [] };
    const result = format === 'native'
      ? { content: JSON.stringify(buildNativeQuestionBankExport(sourceCourse, selectedBank.bank_id), null, 2), filename: `${selectedBank.name || selectedBank.bank_id}.mnemonify-bank.json`, mime: 'application/json' }
      : { ...exportQuestionBankAsGift(sourceCourse, selectedBank.bank_id), mime: 'text/plain' };
    const url = URL.createObjectURL(new Blob([result.content], { type: result.mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  async function readImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = parseNativeQuestionBankExport(await file.text());
      setImportError(null);
      setImportPayload(payload);
    } catch (error) {
      setImportPayload(null);
      setImportError(error.message || 'Could not read this question-bank JSON file.');
    }
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
        <button type="button" className="btn" onClick={() => importInputRef.current?.click()}>Import bank</button>
        <input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={readImportFile} />
      </div>
      {importError && <p className="bank-transfer-error" role="alert">{importError}</p>}
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
            <button type="button" className="btn" onClick={() => setExportOpen(true)}>Export bank</button>
            <button type="button" className="btn-text settings-panel__danger-action" onClick={deleteBank}>Delete bank</button>
          </div>
          <div
            className="question-bank-manager__drop-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const raw = event.dataTransfer.getData('application/x-mnemonify-block');
              if (!raw || !onLinkBlockToBank) return;
              try {
                const source = JSON.parse(raw);
                onLinkBlockToBank(source.pageId, source.blockId, selectedBank.bank_id);
              } catch {
                // Ignore malformed drag payloads from unrelated browser elements.
              }
            }}
          >
            ⇢ Drop a question block here to link it to <strong>{selectedBank.name || selectedBank.bank_id}</strong>
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
          onRequestLinkedQuestionEdit={onRequestLinkedQuestionEdit}
          onRequestLinkedQuestionDelete={onRequestLinkedQuestionDelete}
          onAddCourseAssets={onAddCourseAssets}
          onUpdateCourseAsset={onUpdateCourseAsset}
          onClose={() => setEditorOpen(false)}
        />
      )}
      {exportOpen && selectedBank && <BankExportModal bank={selectedBank} onExport={downloadExport} onClose={() => setExportOpen(false)} />}
      {importPayload && (
        <BankImportReviewModal
          payload={importPayload}
          courseJson={courseJson || { question_banks: banks, variables, meta: { objectives } }}
          questionBanks={banks}
          onConfirm={(request) => {
            onImportBank?.({ ...request, payload: importPayload });
            setImportPayload(null);
          }}
          onClose={() => setImportPayload(null)}
        />
      )}
    </div>
  );
}

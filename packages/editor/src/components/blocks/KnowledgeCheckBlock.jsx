import { useRef, useState } from 'react';
import MediaLibraryPanel from '../MediaLibraryPanel.jsx';
import EditableRichField from './EditableRichField.jsx';
import { genOptionId } from '../../lib/idGen.js';
import VariablePicker from '../VariablePicker.jsx';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const BLUR_HIDE_DELAY_MS = 150;

// Small "add/change/remove image" affordance shared by the question stem,
// each option, and both feedback fields -- same interaction, four places.
function KcImageField({ assetId, assets, label, onPick, onRemove }) {
  const asset = (assets || []).find((a) => a.asset_id === assetId);
  return (
    <div className="kc-image-field">
      {asset && <img className="kc-image-field__thumb" src={`/${asset.src}`} alt={asset.alt || ''} />}
      <button type="button" className="btn-text" onClick={onPick}>
        {asset ? `Change ${label}` : `Add ${label}`}
      </button>
      {asset && (
        <button type="button" className="btn-text" onClick={onRemove}>
          Remove
        </button>
      )}
    </div>
  );
}

export default function KnowledgeCheckBlockEditor({ block, onChange, assets, courseId, onAddCourseAssets, onUpdateCourseAsset, variables = [] }) {
  const { question = '', options = [] } = block.content;
  const containerRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const [toolbarPos, setToolbarPos] = useState(null);
  // Power-user feature most authors won't touch on every question -- tracked
  // as transient editor-only UI state, not persisted to the document, so a
  // collapsed-and-empty feedback field adds no visual clutter by default.
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState(() => new Set());
  // Which image slot the media library picker is currently filling --
  // { kind: 'question' | 'option' | 'optionFeedback' | 'correct' | 'incorrect', optionId? }
  const [imagePickerTarget, setImagePickerTarget] = useState(null);
  const activeFieldRef = useRef(null);

  function setContent(patch) {
    onChange({ ...block, content: { ...block.content, ...patch } });
  }

  function updateOption(id, patch) {
    setContent({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }

  function updateOptionFeedbackImage(id, imageId) {
    setContent({
      options: options.map((o) => {
        if (o.id !== id) return o;
        const feedback = o.feedback || { rich_text: [], reference_ids: [] };
        return { ...o, feedback: { ...feedback, image_id: imageId } };
      }),
    });
  }

  function removeOptionFeedbackImage(id) {
    setContent({
      options: options.map((o) => {
        if (o.id !== id || !o.feedback) return o;
        const { image_id, ...rest } = o.feedback;
        return { ...o, feedback: rest };
      }),
    });
  }

  function handlePickImage(assetIds) {
    const assetId = assetIds[0];
    if (imagePickerTarget && assetId) {
      const { kind, optionId } = imagePickerTarget;
      if (kind === 'question') setContent({ question_image_id: assetId });
      else if (kind === 'option') updateOption(optionId, { image_id: assetId });
      else if (kind === 'optionFeedback') updateOptionFeedbackImage(optionId, assetId);
      else if (kind === 'correct') setContent({ correct_feedback_image_id: assetId });
      else if (kind === 'incorrect') setContent({ incorrect_feedback_image_id: assetId });
    }
    setImagePickerTarget(null);
  }

  function toggleOptionFeedback(id) {
    setExpandedFeedbackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateOptionFeedback(id, html) {
    setContent({
      options: options.map((o) => {
        if (o.id !== id) return o;
        if (!html || !html.replace(/<br>/g, '').trim()) {
          const { feedback, ...rest } = o;
          return rest;
        }
        return { ...o, feedback: { rich_text: [{ t: 'html', v: html }], image_id: o.feedback?.image_id ?? null, reference_ids: [] } };
      }),
    });
  }

  function markCorrect(id) {
    setContent({ options: options.map((o) => ({ ...o, correct: o.id === id })) });
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setContent({ options: [...options, { id: genOptionId(), text: '', correct: false }] });
  }

  function deleteOption(id) {
    if (options.length <= MIN_OPTIONS) return;
    setContent({ options: options.filter((o) => o.id !== id) });
  }

  // The toolbar tracks whichever field is currently focused, rather than
  // sitting permanently above one fixed field (unlike TextBlock.jsx, which
  // only ever has one field). Blur hides it after a short delay so a click
  // on a toolbar button -- which itself steals focus -- doesn't hide the
  // toolbar before the click is registered; the delay is cancelled if
  // another field in this same block picks up focus in the meantime.
  function handleFieldFocus(e) {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    const fieldRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setToolbarPos({ top: fieldRect.top - containerRect.top, left: fieldRect.left - containerRect.left });
  }

  function handleFieldBlur() {
    blurTimeoutRef.current = setTimeout(() => setToolbarPos(null), BLUR_HIDE_DELAY_MS);
  }

  function format(command) {
    document.execCommand(command);
  }

  function insertVariable(name) {
    activeFieldRef.current?.focus();
    document.execCommand('insertHTML', false, `<span class="rich-variable-chip" data-mnemonify-variable="${name}">${name}</span>`);
  }

  return (
    <div className="knowledge-check-block-editor" ref={containerRef} style={{ position: 'relative' }}>
      {toolbarPos && (
        <div
          className="rich-text-toolbar knowledge-check-block-editor__toolbar"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
        >
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('bold')}>
            <strong>B</strong>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('italic')}>
            <em>I</em>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('underline')}>
            <u>U</u>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('superscript')}>
            X<sup>2</sup>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('subscript')}>
            X<sub>2</sub>
          </button>
          <VariablePicker variables={variables} onInsert={insertVariable} />
        </div>
      )}

      <EditableRichField
        className="editable-field knowledge-check-block-editor__question"
        placeholder="Click to add your question..."
        value={question}
        onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
        onBlur={handleFieldBlur}
        onCommit={(html) => setContent({ question: html })}
      />
      <KcImageField
        assetId={block.content.question_image_id}
        assets={assets}
        label="question image"
        onPick={() => setImagePickerTarget({ kind: 'question' })}
        onRemove={() => setContent({ question_image_id: null })}
      />

      <ul className="knowledge-check-block-editor__options">
        {options.map((option) => {
          const feedbackExpanded = expandedFeedbackIds.has(option.id) || !!option.feedback;
          return (
            <li key={option.id}>
              <div className="kc-option-row">
                <input type="radio" checked={!!option.correct} onChange={() => markCorrect(option.id)} title="Mark as correct answer" />
                <EditableRichField
                  className="editable-field"
                  placeholder="Click to add answer option..."
                  value={option.text}
                  onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
                  onBlur={handleFieldBlur}
                  onCommit={(html) => updateOption(option.id, { text: html })}
                />
                {options.length > MIN_OPTIONS && (
                  <button className="btn-text" onClick={() => deleteOption(option.id)}>
                    ✕
                  </button>
                )}
              </div>
              <KcImageField
                assetId={option.image_id}
                assets={assets}
                label="image"
                onPick={() => setImagePickerTarget({ kind: 'option', optionId: option.id })}
                onRemove={() => updateOption(option.id, { image_id: null })}
              />
              <button
                type="button"
                className="btn-text kc-option-feedback-toggle"
                onClick={() => toggleOptionFeedback(option.id)}
              >
                {option.feedback ? 'Feedback for this option ✓' : 'Add feedback for this option'}
              </button>
              {feedbackExpanded && (
                <>
                  <EditableRichField
                    className="editable-field kc-option-feedback-field"
                    placeholder="Shown instead of the general feedback when this option is selected..."
                    value={option.feedback?.rich_text?.[0]?.v || ''}
                    onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
                    onBlur={handleFieldBlur}
                    onCommit={(html) => updateOptionFeedback(option.id, html)}
                  />
                  <KcImageField
                    assetId={option.feedback?.image_id}
                    assets={assets}
                    label="feedback image"
                    onPick={() => setImagePickerTarget({ kind: 'optionFeedback', optionId: option.id })}
                    onRemove={() => removeOptionFeedbackImage(option.id)}
                  />
                </>
              )}
            </li>
          );
        })}
      </ul>
      {options.length < MAX_OPTIONS && (
        <button className="btn" onClick={addOption}>
          + Add option
        </button>
      )}

      <label className="kc-feedback-label">Correct feedback</label>
      <EditableRichField
        className="editable-field"
        value={block.content.correct_feedback || ''}
        onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
        onBlur={handleFieldBlur}
        onCommit={(html) => setContent({ correct_feedback: html })}
      />
      <KcImageField
        assetId={block.content.correct_feedback_image_id}
        assets={assets}
        label="image"
        onPick={() => setImagePickerTarget({ kind: 'correct' })}
        onRemove={() => setContent({ correct_feedback_image_id: null })}
      />

      <label className="kc-feedback-label">Incorrect feedback</label>
      <EditableRichField
        className="editable-field"
        value={block.content.incorrect_feedback || ''}
        onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
        onBlur={handleFieldBlur}
        onCommit={(html) => setContent({ incorrect_feedback: html })}
      />
      <KcImageField
        assetId={block.content.incorrect_feedback_image_id}
        assets={assets}
        label="image"
        onPick={() => setImagePickerTarget({ kind: 'incorrect' })}
        onRemove={() => setContent({ incorrect_feedback_image_id: null })}
      />

      {imagePickerTarget && (
        <MediaLibraryPanel
          courseId={courseId}
          courseAssets={assets}
          onAddCourseAssets={onAddCourseAssets}
          onUpdateCourseAsset={onUpdateCourseAsset}
          selectionMode
          onAddSelected={handlePickImage}
          onClose={() => setImagePickerTarget(null)}
        />
      )}
    </div>
  );
}

export function KnowledgeCheckBlockSettings({ block, onChange }) {
  const showFeedback = block.content.show_feedback !== false;
  return (
    <label className="settings-panel__checkbox-row">
      <input
        type="checkbox"
        checked={showFeedback}
        onChange={(e) => onChange({ ...block, content: { ...block.content, show_feedback: e.target.checked } })}
      />
      Show feedback after answering
    </label>
  );
}

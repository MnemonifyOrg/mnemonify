import { useEffect, useRef, useState } from 'react';
import MediaLibraryPanel from '../MediaLibraryPanel.jsx';
import EditableRichField from './EditableRichField.jsx';
import { genOptionId } from '../../lib/idGen.js';
import VariablePicker from '../VariablePicker.jsx';
import { insertVariableAtSelection } from '../../lib/richText.js';
import ObjectiveMultiSelect from '../ObjectiveMultiSelect.jsx';
import { getCorrectOptionIds } from '@mnemonify/schema/knowledge-check.js';
import { updateKnowledgeCheckCorrectOptions, updateKnowledgeCheckSelectionMode } from '../../lib/knowledgeCheck.js';
import { hasOptionFeedbackContent, hasRichTextContent, toggleExpandedId } from '../../lib/knowledgeCheckEditor.js';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const BLUR_HIDE_DELAY_MS = 150;

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4.5 17 4.5-4 3 2.5 2.5-2 5 4.5" />
    </svg>
  );
}

function FeedbackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 12.5v-7Z" />
      <path d="M8 8h8M8 11h5" />
    </svg>
  );
}

function KcIconButton({ label, active, expanded, onClick, children }) {
  return (
    <button
      type="button"
      className={active ? 'kc-icon-button kc-icon-button--active' : 'kc-icon-button'}
      aria-label={label}
      aria-pressed={active}
      aria-expanded={expanded}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function KcGeneralFeedbackSection({
  id,
  label,
  textValue,
  imageId,
  textExpanded,
  imageExpanded,
  assets,
  selectionRef,
  onToggleText,
  onToggleImage,
  onFocus,
  onBlur,
  onCommit,
  onPick,
  onRemove,
}) {
  return (
    <section className="kc-general-feedback">
      <div className="kc-general-feedback__row">
        <span className="kc-feedback-label">{label}</span>
        <div className="kc-option-actions">
          <KcIconButton
            label={`${label}: ${hasRichTextContent(textValue) ? 'edit' : 'add'} feedback`}
            active={hasRichTextContent(textValue)}
            expanded={textExpanded}
            onClick={onToggleText}
          >
            <FeedbackIcon />
          </KcIconButton>
          <KcIconButton
            label={`${label}: ${imageId ? 'change' : 'add'} image`}
            active={Boolean(imageId)}
            expanded={imageExpanded}
            onClick={onToggleImage}
          >
            <ImageIcon />
          </KcIconButton>
        </div>
      </div>
      {textExpanded && (
        <EditableRichField
          className="editable-field kc-general-feedback__field"
          value={textValue || ''}
          selectionRef={selectionRef}
          onFocus={onFocus}
          onBlur={onBlur}
          onCommit={onCommit}
          placeholder={`Shown when the learner answers ${id === 'correct' ? 'correctly' : 'incorrectly'}...`}
        />
      )}
      {imageExpanded && (
        <KcImageField
          assetId={imageId}
          assets={assets}
          label="image"
          onPick={onPick}
          onRemove={onRemove}
        />
      )}
    </section>
  );
}

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

export default function KnowledgeCheckBlockEditor({ block, onChange, assets, courseId, onAddCourseAssets, onUpdateCourseAsset, variables = [], objectives = [] }) {
  const { question = '', options = [] } = block.content;
  const multiSelect = block.content.multi_select === true;
  const correctOptionIds = new Set(getCorrectOptionIds(block.content));
  const containerRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const [toolbarPos, setToolbarPos] = useState(null);
  // Expanded/collapsed state is transient editor-only UI state. Existing
  // content is initialized open so a compact row never hides saved work.
  const [expandedOptionImageIds, setExpandedOptionImageIds] = useState(() => new Set(options.filter((option) => option.image_id).map((option) => option.id)));
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState(() => new Set(options.filter((option) => hasOptionFeedbackContent(option.feedback)).map((option) => option.id)));
  const [expandedGeneralFeedbackIds, setExpandedGeneralFeedbackIds] = useState(() => new Set([
    ...(hasRichTextContent(block.content.correct_feedback) ? ['correct-text'] : []),
    ...(block.content.correct_feedback_image_id ? ['correct-image'] : []),
    ...(hasRichTextContent(block.content.incorrect_feedback) ? ['incorrect-text'] : []),
    ...(block.content.incorrect_feedback_image_id ? ['incorrect-image'] : []),
  ]));
  // Which image slot the media library picker is currently filling --
  // { kind: 'question' | 'option' | 'optionFeedback' | 'correct' | 'incorrect', optionId? }
  const [imagePickerTarget, setImagePickerTarget] = useState(null);
  const activeFieldRef = useRef(null);
  const selectionRef = useRef(null);

  useEffect(() => {
    setExpandedOptionImageIds(new Set(options.filter((option) => option.image_id).map((option) => option.id)));
    setExpandedFeedbackIds(new Set(options.filter((option) => hasOptionFeedbackContent(option.feedback)).map((option) => option.id)));
    setExpandedGeneralFeedbackIds(new Set([
      ...(hasRichTextContent(block.content.correct_feedback) ? ['correct-text'] : []),
      ...(block.content.correct_feedback_image_id ? ['correct-image'] : []),
      ...(hasRichTextContent(block.content.incorrect_feedback) ? ['incorrect-text'] : []),
      ...(block.content.incorrect_feedback_image_id ? ['incorrect-image'] : []),
    ]));
    // The block id changes when this editor switches to another question. Do
    // not re-open a section merely because the author edited this same block.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.block_id]);

  function setContent(patch) {
    onChange({ ...block, content: { ...block.content, ...patch } });
  }

  function setObjectiveIds(objectiveIds) {
    onChange({ ...block, objective_ids: objectiveIds });
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
        const { image_id: _imageId, ...rest } = o.feedback;
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
    setExpandedFeedbackIds((prev) => toggleExpandedId(prev, id));
  }

  function toggleOptionImage(id) {
    setExpandedOptionImageIds((prev) => toggleExpandedId(prev, id));
  }

  function toggleGeneralFeedback(id) {
    setExpandedGeneralFeedbackIds((prev) => toggleExpandedId(prev, id));
  }

  function updateOptionFeedback(id, value) {
    const richText = Array.isArray(value) ? value : [{ t: 'html', v: value }];
    const hasContent = richText.some((segment) => segment?.t === 'variable' || segment?.v?.replace(/<br>/g, '').trim());
    setContent({
      options: options.map((o) => {
        if (o.id !== id) return o;
        if (!hasContent) {
          const { feedback: _feedback, ...rest } = o;
          return rest;
        }
        return { ...o, feedback: { rich_text: richText, image_id: o.feedback?.image_id ?? null, reference_ids: [] } };
      }),
    });
  }

  function markCorrect(id) {
    const nextIds = multiSelect
      ? (correctOptionIds.has(id) ? [...correctOptionIds].filter((optionId) => optionId !== id) : [...correctOptionIds, id])
      : [id];
    onChange(updateKnowledgeCheckCorrectOptions(block, nextIds));
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setContent({ options: [...options, { id: genOptionId(), text: '', correct: false }] });
  }

  function deleteOption(id) {
    if (options.length <= MIN_OPTIONS) return;
    const nextOptions = options.filter((o) => o.id !== id);
    if (multiSelect) {
      setContent({
        options: nextOptions,
        correct_option_ids: [...correctOptionIds].filter((optionId) => optionId !== id),
      });
    } else {
      const nextCorrectId = block.content.correct_option_id === id ? nextOptions.find((option) => option.correct)?.id : block.content.correct_option_id;
      setContent({ options: nextOptions, correct_option_id: nextCorrectId });
    }
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
    insertVariableAtSelection(activeFieldRef, selectionRef, name);
  }

  return (
    <div className="knowledge-check-block-editor" ref={containerRef} style={{ position: 'relative' }}>
      {objectives.length > 0 && (
        <ObjectiveMultiSelect
          objectives={objectives}
          value={block.objective_ids || []}
          onChange={setObjectiveIds}
          label="Question objectives"
          ariaLabel="Question objectives"
          hint="Optional. Map this question to one or more course objectives."
        />
      )}
      <KnowledgeCheckModeControls block={block} onChange={onChange} />
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
        selectionRef={selectionRef}
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
          const imageExpanded = expandedOptionImageIds.has(option.id);
          const feedbackExpanded = expandedFeedbackIds.has(option.id);
          const feedbackActive = hasOptionFeedbackContent(option.feedback);
          return (
            <li key={option.id}>
              <div className="kc-option-row">
                <input
                  type={multiSelect ? 'checkbox' : 'radio'}
                  checked={correctOptionIds.has(option.id)}
                  onChange={() => markCorrect(option.id)}
                  title={multiSelect ? 'Mark as a correct answer' : 'Mark as correct answer'}
                />
                <EditableRichField
                  className="editable-field"
                  placeholder="Click to add answer option..."
                  value={option.text}
                  selectionRef={selectionRef}
                  onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
                  onBlur={handleFieldBlur}
                  onCommit={(html) => updateOption(option.id, { text: html })}
                />
                <div className="kc-option-actions">
                  <KcIconButton
                    label={option.image_id ? 'Change option image' : 'Add option image'}
                    active={Boolean(option.image_id)}
                    expanded={imageExpanded}
                    onClick={() => toggleOptionImage(option.id)}
                  >
                    <ImageIcon />
                  </KcIconButton>
                  <KcIconButton
                    label={feedbackActive ? 'Edit option feedback' : 'Add option feedback'}
                    active={feedbackActive}
                    expanded={feedbackExpanded}
                    onClick={() => toggleOptionFeedback(option.id)}
                  >
                    <FeedbackIcon />
                  </KcIconButton>
                </div>
                {options.length > MIN_OPTIONS && (
                  <button type="button" className="btn-text kc-option-delete" onClick={() => deleteOption(option.id)} aria-label="Delete option">
                    ✕
                  </button>
                )}
              </div>
              {imageExpanded && (
                <div className="kc-option-extra kc-option-image-extra">
                  <KcImageField
                    assetId={option.image_id}
                    assets={assets}
                    label="image"
                    onPick={() => setImagePickerTarget({ kind: 'option', optionId: option.id })}
                    onRemove={() => updateOption(option.id, { image_id: null })}
                  />
                </div>
              )}
              {feedbackExpanded && (
                <div className="kc-option-extra kc-option-feedback-extra">
                  <EditableRichField
                    className="editable-field kc-option-feedback-field"
                    placeholder="Shown instead of the general feedback when this option is selected..."
                    value={option.feedback?.rich_text || ''}
                    selectionRef={selectionRef}
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
                </div>
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

      <KcGeneralFeedbackSection
        id="correct"
        label="Correct feedback"
        textValue={block.content.correct_feedback}
        imageId={block.content.correct_feedback_image_id}
        textExpanded={expandedGeneralFeedbackIds.has('correct-text')}
        imageExpanded={expandedGeneralFeedbackIds.has('correct-image')}
        assets={assets}
        selectionRef={selectionRef}
        onToggleText={() => toggleGeneralFeedback('correct-text')}
        onToggleImage={() => toggleGeneralFeedback('correct-image')}
        onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
        onBlur={handleFieldBlur}
        onCommit={(html) => setContent({ correct_feedback: html })}
        onPick={() => setImagePickerTarget({ kind: 'correct' })}
        onRemove={() => setContent({ correct_feedback_image_id: null })}
      />
      <KcGeneralFeedbackSection
        id="incorrect"
        label="Incorrect feedback"
        textValue={block.content.incorrect_feedback}
        imageId={block.content.incorrect_feedback_image_id}
        textExpanded={expandedGeneralFeedbackIds.has('incorrect-text')}
        imageExpanded={expandedGeneralFeedbackIds.has('incorrect-image')}
        assets={assets}
        selectionRef={selectionRef}
        onToggleText={() => toggleGeneralFeedback('incorrect-text')}
        onToggleImage={() => toggleGeneralFeedback('incorrect-image')}
        onFocus={(e) => { activeFieldRef.current = e.currentTarget; handleFieldFocus(e); }}
        onBlur={handleFieldBlur}
        onCommit={(html) => setContent({ incorrect_feedback: html })}
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

export function KnowledgeCheckModeControls({ block, onChange }) {
  const multiSelect = block.content.multi_select === true;
  return (
    <div className="knowledge-check-mode-controls">
      <label className="settings-panel__checkbox-row">
        <input
          type="checkbox"
          checked={multiSelect}
          onChange={(e) => onChange(updateKnowledgeCheckSelectionMode(block, e.target.checked))}
        />
        Select all that apply
      </label>
      {multiSelect && (
        <label className="knowledge-check-mode-controls__feedback">
          Feedback style
          <select
            value={block.content.feedback_mode === 'per_option' ? 'per_option' : 'summary'}
            onChange={(e) => onChange({ ...block, content: { ...block.content, feedback_mode: e.target.value } })}
          >
            <option value="summary">Summary</option>
            <option value="per_option">Per-option</option>
          </select>
        </label>
      )}
    </div>
  );
}

export function KnowledgeCheckBlockSettings({ block, onChange, objectives = [] }) {
  const showFeedback = block.content.show_feedback !== false;
  return (
    <>
      <KnowledgeCheckModeControls block={block} onChange={onChange} />
      <label className="settings-panel__checkbox-row">
        <input
          type="checkbox"
          checked={showFeedback}
          onChange={(e) => onChange({ ...block, content: { ...block.content, show_feedback: e.target.checked } })}
        />
        Show feedback after answering
      </label>
      <ObjectiveMultiSelect
        objectives={objectives}
        value={block.objective_ids || []}
        onChange={(objectiveIds) => onChange({ ...block, objective_ids: objectiveIds })}
        label="Question objectives"
        ariaLabel="Question objectives"
      />
    </>
  );
}

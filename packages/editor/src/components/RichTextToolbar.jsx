import { useCallback, useEffect, useState } from 'react';
import VariablePicker from './VariablePicker.jsx';
import TextColorPicker from './blocks/TextColorPicker.jsx';
import LinkPicker from './LinkPicker.jsx';
import { restoreRichTextSelection } from '../lib/richText.js';

function ListIcon({ ordered = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ordered ? <><path d="M4 5h2M4 12h2M4 19h2" /><path d="M9 5h11M9 12h11M9 19h11" /></> : <><circle cx="5" cy="5" r="1" /><circle cx="5" cy="12" r="1" /><circle cx="5" cy="19" r="1" /><path d="M9 5h11M9 12h11M9 19h11" /></>}
    </svg>
  );
}

function AlignIcon({ alignment }) {
  const lines = alignment === 'center'
    ? ['M6 5h12', 'M4 9h16', 'M6 13h12', 'M4 17h16']
    : alignment === 'right'
      ? ['M9 5h11', 'M5 9h15', 'M9 13h11', 'M5 17h15']
      : ['M4 5h11', 'M4 9h16', 'M4 13h11', 'M4 17h16'];
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{lines.map((line) => <path key={line} d={line} />)}</svg>;
}

function queryActive(command) {
  try {
    return document.queryCommandState?.(command) === true;
  } catch {
    return false;
  }
}

function selectedLinkHref(field, selection) {
  if (!field || !selection?.anchorNode || !field.contains(selection.anchorNode)) return '';
  let node = selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement;
  while (node && node !== field) {
    if (node.tagName === 'A') return node.getAttribute('href') || '';
    node = node.parentElement;
  }
  return '';
}

export default function RichTextToolbar({
  fieldRef,
  selectionRef,
  variables = [],
  onInsert,
  enableColor = true,
  enableLists = true,
  enableAlignment = true,
  className = '',
  style,
}) {
  const [active, setActive] = useState({});

  const refreshActiveState = useCallback(() => {
    const field = fieldRef?.current;
    const selection = typeof window !== 'undefined' ? window.getSelection?.() : null;
    if (!field || !selection?.anchorNode || !field.contains(selection.anchorNode)) return;
    const center = queryActive('justifyCenter');
    const right = queryActive('justifyRight');
    setActive({
      unordered: queryActive('insertUnorderedList'),
      ordered: queryActive('insertOrderedList'),
      left: queryActive('justifyLeft') || (!center && !right),
      center,
      right,
      linkHref: selectedLinkHref(field, selection),
    });
  }, [fieldRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActiveState);
    return () => document.removeEventListener('selectionchange', refreshActiveState);
  }, [refreshActiveState]);

  function format(command) {
    const field = fieldRef?.current;
    if (!field || typeof document === 'undefined') return;
    field.focus();
    restoreRichTextSelection(field, selectionRef);
    document.execCommand(command);
    refreshActiveState();
  }

  function button(command, label, icon, key) {
    return (
      <button
        type="button"
        className={active[key] ? 'btn-text rich-text-toolbar__button is-active' : 'btn-text rich-text-toolbar__button'}
        aria-label={label}
        aria-pressed={Boolean(active[key])}
        title={label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => format(command)}
      >
        {icon}
      </button>
    );
  }

  function applyLink(href) {
    const field = fieldRef?.current;
    if (!field || typeof document === 'undefined') return;
    field.focus();
    restoreRichTextSelection(field, selectionRef);
    document.execCommand('createLink', false, href);
    field.blur();
    refreshActiveState();
  }

  function removeLink() {
    const field = fieldRef?.current;
    if (!field || typeof document === 'undefined') return;
    field.focus();
    restoreRichTextSelection(field, selectionRef);
    document.execCommand('unlink');
    field.blur();
    refreshActiveState();
  }

  return (
    <div className={`rich-text-toolbar ${className}`.trim()} style={style} role="toolbar" aria-label="Text formatting">
      <button type="button" className="btn-text rich-text-toolbar__button" aria-label="Bold" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => format('bold')}><strong>B</strong></button>
      <button type="button" className="btn-text rich-text-toolbar__button" aria-label="Italic" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => format('italic')}><em>I</em></button>
      <button type="button" className="btn-text rich-text-toolbar__button" aria-label="Underline" title="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => format('underline')}><u>U</u></button>
      <button type="button" className="btn-text rich-text-toolbar__button" aria-label="Superscript" title="Superscript" onMouseDown={(event) => event.preventDefault()} onClick={() => format('superscript')}>X<sup>2</sup></button>
      <button type="button" className="btn-text rich-text-toolbar__button" aria-label="Subscript" title="Subscript" onMouseDown={(event) => event.preventDefault()} onClick={() => format('subscript')}>X<sub>2</sub></button>
      {enableColor && <TextColorPicker fieldRef={fieldRef} selectionRef={selectionRef} />}
      {enableLists && button('insertUnorderedList', 'Bulleted list', <ListIcon />, 'unordered')}
      {enableLists && button('insertOrderedList', 'Numbered list', <ListIcon ordered />, 'ordered')}
      {enableAlignment && <span className="rich-text-toolbar__group" aria-label="Text alignment">
        {button('justifyLeft', 'Align left', <AlignIcon alignment="left" />, 'left')}
        {button('justifyCenter', 'Align center', <AlignIcon alignment="center" />, 'center')}
        {button('justifyRight', 'Align right', <AlignIcon alignment="right" />, 'right')}
      </span>}
      <LinkPicker fieldRef={fieldRef} selectionRef={selectionRef} value={active.linkHref || ''} onApply={applyLink} onRemove={removeLink} />
      {onInsert && <VariablePicker variables={variables} fieldRef={fieldRef} selectionRef={selectionRef} onInsert={onInsert} />}
    </div>
  );
}

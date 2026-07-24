import { useEffect, useRef, useState } from 'react';
import {
  captureRichTextSelection,
  isLowContrast,
  normalizeColorToHex,
  restoreRichTextSelection,
  TEXT_COLORS,
} from '../../lib/richText.js';

function backgroundColorFor(field) {
  if (typeof window === 'undefined' || !field) return '#FFFFFF';
  let current = field;
  while (current) {
    const color = window.getComputedStyle(current).backgroundColor;
    if (/rgba\([^)]*,\s*0\)$/i.test(color)) {
      current = current.parentElement;
      continue;
    }
    const normalized = normalizeColorToHex(color);
    if (normalized) return normalized;
    current = current.parentElement;
  }
  return '#FFFFFF';
}

export default function TextColorPicker({ fieldRef, selectionRef }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customColor, setCustomColor] = useState('#0E7A8A');
  const [lastColor, setLastColor] = useState(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    function updateCurrentColor() {
      const field = fieldRef?.current;
      const selection = window.getSelection?.();
      if (!field || !selection?.anchorNode || !field.contains(selection.anchorNode)) return;
      let current = selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement;
      while (current && current !== field) {
        const normalized = normalizeColorToHex(current.style?.color || '');
        if (normalized) {
          setLastColor(normalized);
          return;
        }
        current = current.parentElement;
      }
    }
    document.addEventListener('selectionchange', updateCurrentColor);
    return () => document.removeEventListener('selectionchange', updateCurrentColor);
  }, [fieldRef]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function rememberSelection(event) {
    event.preventDefault();
    captureRichTextSelection(fieldRef?.current, selectionRef);
  }

  function applyColor(value) {
    const field = fieldRef?.current;
    if (!field || typeof document === 'undefined') return;
    field.focus();
    restoreRichTextSelection(field, selectionRef);
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, value || 'inherit');
    setLastColor(value || null);
    setOpen(false);
    setCustomOpen(false);
  }

  function applyCustomColor() {
    const normalized = normalizeColorToHex(customColor);
    if (normalized) applyColor(normalized);
  }

  const normalizedCustomColor = normalizeColorToHex(customColor);
  const lowContrast = normalizedCustomColor && isLowContrast(normalizedCustomColor, backgroundColorFor(fieldRef?.current));

  return (
    <div className="text-color-picker" ref={pickerRef}>
      <button
        type="button"
        className="btn-text text-color-picker__trigger"
        aria-label="Text color"
        aria-expanded={open}
        title="Text color"
        onMouseDown={rememberSelection}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-color-picker__letter" aria-hidden="true">A</span>
        <span className="text-color-picker__underline" style={{ backgroundColor: lastColor || 'currentColor' }} aria-hidden="true" />
      </button>
      {open && (
        <div className="text-color-picker__popover" role="dialog" aria-label="Text color picker">
          <div className="text-color-picker__preset-grid" role="listbox" aria-label="Preset text colors">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                className={color.value ? 'text-color-picker__swatch' : 'text-color-picker__swatch text-color-picker__swatch--default'}
                style={color.value ? { backgroundColor: color.value } : undefined}
                title={color.name}
                aria-label={`Text color: ${color.name}`}
                onMouseDown={rememberSelection}
                onClick={() => applyColor(color.value)}
              />
            ))}
          </div>
          <button
            type="button"
            className="btn-text text-color-picker__more"
            onMouseDown={rememberSelection}
            onClick={() => setCustomOpen((value) => !value)}
          >
            More colors
          </button>
          {customOpen && (
            <div className="text-color-picker__custom">
              <label htmlFor="custom-text-color">Hex color</label>
              <div className="text-color-picker__custom-row">
                <input
                  id="custom-text-color"
                  className="input"
                  type="text"
                  value={customColor}
                  onChange={(event) => setCustomColor(event.target.value)}
                  placeholder="#0E7A8A"
                  inputMode="text"
                />
                <button type="button" className="btn btn-primary" disabled={!normalizedCustomColor} onMouseDown={rememberSelection} onClick={applyCustomColor}>Apply</button>
              </div>
              {lowContrast && <p className="text-color-picker__warning" role="status">This color may be hard to read against the current background.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useRef, useState } from 'react';
import EditableRichField from './EditableRichField.jsx';
import { CELL_TAGS, escapeHtml } from '../../lib/richText.js';

const BLUR_HIDE_DELAY_MS = 150;

// A clipboard payload copied from Excel/Sheets/Word as a cell range serializes
// to text/plain as tab-separated columns and newline-separated rows -- a
// single-cell (or non-tabular) paste never contains either character, which
// is what distinguishes "fill a grid of cells" from "paste text into the
// one focused cell" (the latter must keep working exactly as plain
// contentEditable paste already does). Trailing blank line dropped because
// every real clipboard grid copy ends with one (a trailing newline with no
// tab), which would otherwise read as a spurious empty extra row.
function parseClipboardGrid(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}

// Table cells stay plain text by design (ARCHITECTURE.md 3.7: "Cell
// content is plain text only. No rich text, no nested blocks.") with
// deliberate, narrow exceptions on top of that: superscript/subscript,
// since pathology lab data needs notation like 10³ and del(5q); and, per a
// later author request for pathology content, bold/italic for italicizing
// organism/gene names. Cells reuse the same sanitized-HTML infra as every
// other contentEditable field, but with a restricted CELL_TAGS allowlist
// (no underline, no line-breaks, keeping cells lighter-weight than full
// text blocks) -- see DECISIONS.md for why sup/sub was chosen over
// inserting literal Unicode superscript/subscript characters (the
// simpler-looking option, but one that can't represent every needed
// character -- there is no Unicode subscript "q", which "del(5q)" requires).
export default function TableBlockEditor({ block, onChange }) {
  const { caption = '', has_header_row: hasHeaderRow, has_header_col: hasHeaderCol, rows = [] } = block.content;
  const containerRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const [toolbarPos, setToolbarPos] = useState(null);

  function setContent(patch, options) {
    onChange({ ...block, content: { ...block.content, ...patch } }, options);
  }

  function updateCell(rowIndex, colIndex, html) {
    const newRows = rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? html : cell)) : row));
    setContent({ rows: newRows });
  }

  // Grid-fill paste (item 7): expands the table to fit the pasted range when
  // it's larger than the current grid, and only overwrites the cells the
  // paste actually covers -- everything outside that range is untouched.
  // Expanding rows/columns is a discrete structural change, same category as
  // the Add Row/Add Column buttons in TableBlockSettings below, so it forces
  // its own undo/redo snapshot; a paste that fits inside the existing grid
  // does not.
  function handleCellPaste(e, rowIndex, colIndex) {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!/[\t\n]/.test(text)) return;
    e.preventDefault();

    const grid = parseClipboardGrid(text);
    if (grid.length === 0) return;

    const currentColCount = rows[0]?.length || 0;
    const neededRowCount = rowIndex + grid.length;
    const neededColCount = colIndex + Math.max(...grid.map((r) => r.length));
    const colCount = Math.max(currentColCount, neededColCount);
    const willExpand = neededRowCount > rows.length || neededColCount > currentColCount;

    const newRows = rows.map((row) => {
      const extended = [...row];
      while (extended.length < colCount) extended.push('');
      return extended;
    });
    while (newRows.length < neededRowCount) {
      newRows.push(new Array(colCount).fill(''));
    }

    grid.forEach((gridRow, r) => {
      gridRow.forEach((value, c) => {
        newRows[rowIndex + r][colIndex + c] = escapeHtml(value);
      });
    });

    setContent({ rows: newRows }, willExpand ? { forceSnapshot: true } : undefined);
  }

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

  return (
    <div className="table-block-editor" ref={containerRef} style={{ position: 'relative' }}>
      {toolbarPos && (
        <div className="rich-text-toolbar table-block-editor__toolbar" style={{ top: toolbarPos.top, left: toolbarPos.left }}>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('bold')}>
            <strong>B</strong>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('italic')}>
            <em>I</em>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('superscript')}>
            X<sup>2</sup>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('subscript')}>
            X<sub>2</sub>
          </button>
        </div>
      )}
      <input
        className="input table-block-editor__caption"
        placeholder="Table caption (optional)"
        value={caption}
        onChange={(e) => setContent({ caption: e.target.value })}
      />
      <table className="table-block-editor__grid">
        <tbody>
          {rows.map((row, rowIndex) => {
            const isHeaderRow = hasHeaderRow && rowIndex === 0;
            return (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  const isHeaderCol = hasHeaderCol && colIndex === 0;
                  const Tag = isHeaderRow || isHeaderCol ? 'th' : 'td';
                  return (
                    <EditableRichField
                      key={colIndex}
                      Tag={Tag}
                      allowedTags={CELL_TAGS}
                      className={
                        isHeaderRow || isHeaderCol
                          ? 'table-block-editor__cell table-block-editor__cell--header'
                          : 'table-block-editor__cell'
                      }
                      value={cell}
                      onFocus={handleFieldFocus}
                      onBlur={handleFieldBlur}
                      onCommit={(html) => updateCell(rowIndex, colIndex, html)}
                      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                      onPaste={(e) => handleCellPaste(e, rowIndex, colIndex)}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const MIN_ROWS = 1;
const MIN_COLS = 1;

export function TableBlockSettings({ block, onChange }) {
  const { has_header_row: hasHeaderRow, has_header_col: hasHeaderCol, rows = [] } = block.content;
  const colCount = rows[0]?.length || 0;

  // Row/column structure changes are discrete, forced snapshots -- see
  // CourseEditor.jsx's updateCourseJson and DECISIONS.md.
  function setContent(patch, options) {
    onChange({ ...block, content: { ...block.content, ...patch } }, options);
  }

  function addRow() {
    setContent({ rows: [...rows, new Array(colCount).fill('')] }, { forceSnapshot: true });
  }
  function deleteRow() {
    if (rows.length <= MIN_ROWS) return;
    setContent({ rows: rows.slice(0, -1) }, { forceSnapshot: true });
  }
  function addColumn() {
    setContent({ rows: rows.map((row) => [...row, '']) }, { forceSnapshot: true });
  }
  function deleteColumn() {
    if (colCount <= MIN_COLS) return;
    setContent({ rows: rows.map((row) => row.slice(0, -1)) }, { forceSnapshot: true });
  }

  return (
    <>
      <div className="table-block-settings__toolbar">
        <button type="button" className="btn" onClick={addRow}>
          + Add Row
        </button>
        <button type="button" className="btn" onClick={deleteRow} disabled={rows.length <= MIN_ROWS}>
          − Delete Row
        </button>
        <button type="button" className="btn" onClick={addColumn}>
          + Add Column
        </button>
        <button type="button" className="btn" onClick={deleteColumn} disabled={colCount <= MIN_COLS}>
          − Delete Column
        </button>
      </div>

      <label className="settings-panel__checkbox-row">
        <input
          type="checkbox"
          checked={!!hasHeaderRow}
          onChange={(e) => setContent({ has_header_row: e.target.checked }, { forceSnapshot: true })}
        />
        Header row
      </label>
      <label className="settings-panel__checkbox-row">
        <input
          type="checkbox"
          checked={!!hasHeaderCol}
          onChange={(e) => setContent({ has_header_col: e.target.checked }, { forceSnapshot: true })}
        />
        Header column
      </label>
    </>
  );
}

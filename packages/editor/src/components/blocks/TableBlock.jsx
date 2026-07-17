// contentEditable table cells sit in normal DOM/tab order, so Tab and
// Shift+Tab move between cells using the browser's native focus order --
// no custom key handling needed for that.
export default function TableBlockEditor({ block, onChange }) {
  const { caption = '', has_header_row: hasHeaderRow, has_header_col: hasHeaderCol, rows = [] } = block.content;

  function setContent(patch) {
    onChange({ ...block, content: { ...block.content, ...patch } });
  }

  function updateCell(rowIndex, colIndex, text) {
    const newRows = rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? text : cell)) : row));
    setContent({ rows: newRows });
  }

  return (
    <div className="table-block-editor">
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
                    <Tag
                      key={colIndex}
                      className={
                        isHeaderRow || isHeaderCol
                          ? 'table-block-editor__cell table-block-editor__cell--header'
                          : 'table-block-editor__cell'
                      }
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const text = e.currentTarget.textContent;
                        if (text !== cell) updateCell(rowIndex, colIndex, text);
                      }}
                    >
                      {cell}
                    </Tag>
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

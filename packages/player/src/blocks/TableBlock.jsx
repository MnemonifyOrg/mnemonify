// Wrapped in an overflow-x scroller for narrow screens (ARCHITECTURE.md
// 3.7) rather than letting the table break the page layout; print CSS
// removes the wrapper's scroll behavior so the table prints at full width.
export default function TableBlock({ block }) {
  const { caption, has_header_row: hasHeaderRow, has_header_col: hasHeaderCol, rows = [] } = block.content;

  return (
    <div className="block block-table">
      <div className="block-table__scroll">
        <table>
          {caption && <caption>{caption}</caption>}
          <tbody>
            {rows.map((row, rowIndex) => {
              const isHeaderRow = hasHeaderRow && rowIndex === 0;
              return (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => {
                    const isHeaderCol = hasHeaderCol && colIndex === 0;
                    if (isHeaderRow) {
                      return (
                        <th key={colIndex} scope="col">
                          {cell}
                        </th>
                      );
                    }
                    if (isHeaderCol) {
                      return (
                        <th key={colIndex} scope="row">
                          {cell}
                        </th>
                      );
                    }
                    return <td key={colIndex}>{cell}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

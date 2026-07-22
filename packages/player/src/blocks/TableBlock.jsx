import { useEffect, useRef, useState } from 'react';
import RichText from './RichText.jsx';
import { CELL_TAGS } from '../lib/richText.js';

// Wrapped in an overflow-x scroller for narrow screens (ARCHITECTURE.md
// 3.7) rather than letting the table break the page layout; print CSS
// removes the wrapper's scroll behavior so the table prints at full width.
//
// The scroll wrapper itself genuinely works (overflow-x: auto correctly
// triggers whenever the table's content is wider than the wrapper -- see
// the min-width: max-content comment on `.block-table table` in
// player.css) but paints no visible scrollbar at all on macOS/iOS-style
// overlay-scrollbar setups until a scroll gesture is already under way,
// which reads as a cut-off, broken table with no indication that more
// content exists. This hint is a JS-detected fallback that doesn't depend
// on the browser/OS ever rendering a scrollbar: it measures the wrapper's
// actual overflow directly and only renders when there's real overflow to
// announce. See DECISIONS.md.
function useScrollHint(scrollRef, rows) {
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    function measure() {
      setOverflowing(el.scrollWidth > el.clientWidth + 1);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return overflowing;
}

export default function TableBlock({ block, variables }) {
  const { caption, has_header_row: hasHeaderRow, has_header_col: hasHeaderCol, rows = [] } = block.content;
  const scrollRef = useRef(null);
  const overflowing = useScrollHint(scrollRef, rows);

  return (
    <div className="block block-table">
      <div className="block-table__scroll" ref={scrollRef}>
        <table>
          {caption && <caption>{caption}</caption>}
          <tbody>
            {rows.map((row, rowIndex) => {
              const isHeaderRow = hasHeaderRow && rowIndex === 0;
              return (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => {
                    const isHeaderCol = hasHeaderCol && colIndex === 0;
                    const content = <RichText value={cell} variables={variables} allowedTags={CELL_TAGS} />;
                    if (isHeaderRow) {
                      return (
                        <th key={colIndex} scope="col">
                          {content}
                        </th>
                      );
                    }
                    if (isHeaderCol) {
                      return (
                        <th key={colIndex} scope="row">
                          {content}
                        </th>
                      );
                    }
                    return <td key={colIndex}>{content}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {overflowing && (
        <p className="block-table__scroll-hint" aria-hidden="true">
          ↔ Scroll to see more
        </p>
      )}
    </div>
  );
}

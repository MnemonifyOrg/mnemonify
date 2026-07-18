import { TEXT_COLORS } from '../../lib/richText.js';

// Shared by TextBlock.jsx and HeadingBlock.jsx editors (item 8). A curated,
// fixed palette -- not an open color picker -- applied character-selection-
// level via document.execCommand('foreColor', ...), same pattern family as
// the existing Bold/Italic/Underline toolbar buttons. See
// packages/editor/src/lib/richText.js for the palette values themselves and
// DECISIONS.md for their measured contrast ratios.
export default function TextColorPicker() {
  function applyColor(value) {
    // styleWithCSS makes foreColor emit `<span style="color:...">` rather
    // than the legacy `<font color="...">` -- richText.js's sanitizer only
    // recognizes the former.
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, value || 'inherit');
  }

  return (
    <div className="text-color-picker">
      {TEXT_COLORS.map((c) => (
        <button
          key={c.name}
          type="button"
          className={
            c.value
              ? 'text-color-picker__swatch'
              : 'text-color-picker__swatch text-color-picker__swatch--default'
          }
          style={c.value ? { backgroundColor: c.value } : undefined}
          title={c.name}
          aria-label={`Text color: ${c.name}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyColor(c.value)}
        />
      ))}
    </div>
  );
}

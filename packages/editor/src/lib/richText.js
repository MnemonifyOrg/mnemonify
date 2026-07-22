// Sanitizes and serializes the inline-formatted HTML captured from a
// contentEditable field into a small, safe allowlisted subset. This is the
// root-cause fix for the "formatting lost after preview" bug: the previous
// implementation captured `el.textContent` on blur, which is plain text --
// it silently drops every tag (bold/italic/underline/sup/sub) AND every
// line break, since `textContent` concatenates all text nodes with no
// separator at all, not even for `<div>`/`<br>` boundaries. Capturing
// (sanitized) `innerHTML` instead preserves both. See DECISIONS.md.
//
// Duplicated identically in packages/player/src/lib/richText.js rather than
// imported across the package boundary -- same tradeoff already made for
// ImageBlock.jsx's WIDTH_PRESET_PCT (kept in sync by comment, not by
// import), since neither package depends on the other and this file has
// zero dependencies of its own (pure DOM API, no React).

export const RICH_TEXT_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SUP', 'SUB', 'BR', 'SPAN']);
const VARIABLE_TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
const VARIABLE_MARKER_PREFIX = '\uE000MNEMONIFY_VAR_';
const VARIABLE_MARKER_SUFFIX = '\uE001';
// Curated text-color palette (item 8) -- deliberately NOT an open color
// picker, a fixed set applied via document.execCommand('foreColor', ...).
// Each non-null value is pre-verified against the light default background
// (#FFFFFF); two (Emerald, Coral) are darkened from their raw --mn-* brand
// token because the token itself falls short of 4.5:1 on white -- see
// DECISIONS.md for the exact measured ratios, including why a single fixed
// hex cannot also clear 4.5:1 against a dark-navy background (mathematically
// impossible for these two background extremes at once; DECISIONS.md has
// the proof) and why that's acceptable given headings/text never actually
// render against a dark-navy background anywhere in this app today.
export const TEXT_COLORS = [
  { name: 'Default', value: null },
  { name: 'Primary Blue', value: '#2563EB' },
  { name: 'Violet', value: '#6D28D9' },
  { name: 'Emerald', value: '#127D59' },
  { name: 'Coral', value: '#A82424' },
  { name: 'Deep Navy', value: '#0A1020' },
];
const TEXT_COLOR_VALUES = new Set(TEXT_COLORS.map((c) => c.value?.toLowerCase()).filter(Boolean));

// DOM-normalizes an inline color (the browser reports `node.style.color` as
// `rgb(r, g, b)` even when the HTML source said `#rrggbb`) back to lowercase
// hex so it can be checked against TEXT_COLOR_VALUES.
function normalizeColorToHex(colorStr) {
  if (!colorStr) return null;
  const trimmed = colorStr.trim();
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(trimmed);
  if (hexMatch) return `#${hexMatch[1].toLowerCase()}`;
  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i.exec(trimmed);
  if (!rgbMatch) return null;
  const toHex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
}
// Narrower allowlist for table cells (ARCHITECTURE.md 3.7: "Cell content is
// plain text only" -- sup/sub is the original deliberate, narrow exception;
// bold/italic were added on top of that per an author request for
// pathology content (italicizing organism/gene names) -- see DECISIONS.md.
// Underline and line-breaks stay excluded to keep cells lighter-weight than
// full text-editable blocks.
export const CELL_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'SUP', 'SUB']);

function nodeToAst(node, allowedTags) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue ? [{ type: 'text', value: node.nodeValue }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  let children = [...node.childNodes].flatMap((child) => nodeToAst(child, allowedTags));
  const tag = node.tagName;

  // A `color` can land as an inline style on ANY element, not just a fresh
  // <span>: when a selection sits fully inside an existing inline element
  // (e.g. bolded text), execCommand('foreColor', ...) with styleWithCSS
  // attaches the style directly to that element (a <b style="color:...">)
  // rather than wrapping a new span around it -- checked and confirmed by
  // hand, not assumed. So every element is checked for a valid palette
  // color here, before the tag-specific handling below, and its children
  // wrapped in a color node regardless of which tag actually carried the
  // style. Validated against the fixed TEXT_COLOR_VALUES allowlist rather
  // than copied through, so this doesn't reopen the "no attribute is ever
  // copied" invariant to arbitrary style/injection payloads: an element
  // with no color, or a color outside the curated palette (e.g. from a
  // paste), contributes nothing extra here.
  if (allowedTags.has('SPAN')) {
    const hex = normalizeColorToHex(node.style?.color || '');
    if (hex && TEXT_COLOR_VALUES.has(hex)) {
      children = [{ type: 'span', color: hex, children }];
    }
  }

  if (tag === 'BR') return allowedTags.has('BR') ? [{ type: 'br' }] : [];
  // A block-level line container (DIV/P) is what most browsers insert on
  // Enter inside a contentEditable region -- flattened to "a line break,
  // then this line's content" rather than preserved as a real nested
  // block, since nothing downstream needs paragraph-level semantics beyond
  // "these are separate lines." Dropped entirely (not even a break) when
  // BR isn't in the allowlist -- e.g. table cells stay single-line.
  if (tag === 'DIV' || tag === 'P') {
    return allowedTags.has('BR') ? [{ type: 'br' }, ...children] : children;
  }
  // SPAN itself carries no semantics beyond the color it may have
  // contributed above -- it's never in `allowedTags` as a real tag type
  // (RICH_TEXT_TAGS includes it only to gate the color check), so it always
  // falls through to "unwrap to children" like any other disallowed tag.
  if (allowedTags.has(tag) && tag !== 'SPAN') {
    return [{ type: tag.toLowerCase(), children }];
  }
  // Disallowed tag (span, a, img, script, style, or anything a paste
  // brought in): unwrap to just its sanitized children, dropping the tag
  // itself and any attributes it carried. No attribute is ever copied by
  // this function for ANY tag, allowed or not -- that is what makes this
  // safe against HTML injection (no onerror=, no javascript: href, no
  // style-based attacks) without needing an attribute-level allowlist.
  return children;
}

// Leading/trailing <br> AST nodes (e.g. from an empty first line) are
// trimmed so an untouched or emptied field serializes back to '', matching
// the existing `.editable-field:empty::before` placeholder CSS rule.
function trimBreaks(ast) {
  let start = 0;
  let end = ast.length;
  while (start < end && ast[start].type === 'br') start++;
  while (end > start && ast[end - 1].type === 'br') end--;
  return ast.slice(start, end);
}

export function htmlToRichAst(html, allowedTags = RICH_TEXT_TAGS) {
  const scratch = document.createElement('div');
  scratch.innerHTML = html || '';
  return trimBreaks([...scratch.childNodes].flatMap((node) => nodeToAst(node, allowedTags)));
}

export function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function splitVariableSyntax(value) {
  const source = String(value || '');
  const parts = [];
  let lastIndex = 0;
  let match;
  VARIABLE_TOKEN_PATTERN.lastIndex = 0;
  while ((match = VARIABLE_TOKEN_PATTERN.exec(source))) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    parts.push({ type: 'variable', name: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) parts.push({ type: 'text', value: source.slice(lastIndex) });
  return parts;
}

export function captureRichTextSelection(element, selectionRef) {
  if (!element || !selectionRef || typeof window === 'undefined') return;
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) return;
  selectionRef.current = { element, range: range.cloneRange() };
}

export function restoreRichTextSelection(element, selectionRef) {
  const saved = selectionRef?.current;
  if (!saved || saved.element !== element || typeof window === 'undefined') return false;
  if (!element.contains(saved.range.commonAncestorContainer)) return false;
  const selection = window.getSelection?.();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(saved.range);
  return true;
}

export function insertVariableAtSelection(fieldRef, selectionRef, name) {
  const field = fieldRef?.current;
  if (!field || typeof document === 'undefined') return false;
  field.focus();
  if (!restoreRichTextSelection(field, selectionRef)) {
    const range = document.createRange();
    range.selectNodeContents(field);
    range.collapse(false);
    const selection = window.getSelection?.();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  const safeName = escapeHtml(String(name || ''));
  return document.execCommand('insertHTML', false, `<span class="rich-variable-chip" data-mnemonify-variable="${safeName}">${safeName}</span>`);
}

function astToHtml(ast) {
  return ast
    .map((node) => {
      if (node.type === 'text') return escapeHtml(node.value);
      if (node.type === 'br') return '<br>';
      if (node.type === 'span') return `<span style="color:${node.color}">${astToHtml(node.children)}</span>`;
      return `<${node.type}>${astToHtml(node.children)}</${node.type}>`;
    })
    .join('');
}

// Round-trips arbitrary (possibly attacker- or Word-import-supplied) HTML
// through the AST above and back to a canonical string containing only the
// allowed tags with zero attributes -- the actual sanitization step. Called
// both when the editor commits a field on blur and, defensively, whenever
// the player renders a stored value (packages/player/src/blocks/RichText.jsx),
// so a value can never carry more than the allowed formatting regardless of
// which path it arrived through.
export function sanitizeRichHtml(html, allowedTags = RICH_TEXT_TAGS) {
  return astToHtml(htmlToRichAst(html, allowedTags));
}

export function richSegmentsToEditableHtml(value, allowedTags = RICH_TEXT_TAGS) {
  if (!Array.isArray(value)) return sanitizeRichHtml(value || '', allowedTags);
  return value.map((segment) => {
    if (segment?.t === 'variable') {
      const name = String(segment.var_name || '');
      return `<span class="rich-variable-chip" data-mnemonify-variable="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
    }
    return sanitizeRichHtml(segment?.v || '', allowedTags);
  }).join('');
}

function replaceVariableTokensInTextNodes(root, markerFor) {
  const textNodes = [];

  function visit(node) {
    if (node.nodeType === 3) {
      textNodes.push(node);
      return;
    }
    if (node.nodeType !== 1) return;
    const chipName = node.getAttribute('data-mnemonify-variable');
    if (chipName) {
      node.replaceWith(document.createTextNode(markerFor(chipName)));
      return;
    }
    [...node.childNodes].forEach(visit);
  }

  visit(root);
  textNodes.forEach((node) => {
    if (!node.parentNode) return;
    const parts = splitVariableSyntax(node.nodeValue);
    if (!parts.some((part) => part.type === 'variable')) return;
    const fragment = document.createDocumentFragment();
    parts.forEach((part) => {
      fragment.appendChild(document.createTextNode(part.type === 'variable' ? markerFor(part.name) : part.value));
    });
    node.replaceWith(fragment);
  });
}

export function editableHtmlToRichValue(html, allowedTags = RICH_TEXT_TAGS) {
  const source = String(html || '');
  const scratch = document.createElement('div');
  scratch.innerHTML = source;
  const variableNames = [];
  const markerFor = (name) => {
    const index = variableNames.push(String(name)) - 1;
    return `${VARIABLE_MARKER_PREFIX}${index}${VARIABLE_MARKER_SUFFIX}`;
  };
  replaceVariableTokensInTextNodes(scratch, markerFor);
  const sanitized = sanitizeRichHtml(scratch.innerHTML, allowedTags);
  const marker = new RegExp(`${VARIABLE_MARKER_PREFIX}(\\d+)${VARIABLE_MARKER_SUFFIX}`, 'g');
  const segments = [];
  let last = 0;
  let match;
  while ((match = marker.exec(sanitized))) {
    const literal = sanitized.slice(last, match.index);
    if (literal) segments.push({ t: 'html', v: literal });
    segments.push({ t: 'variable', var_name: variableNames[Number(match[1])] });
    last = marker.lastIndex;
  }
  if (!segments.length) return sanitizeRichHtml(source, allowedTags);
  const tail = sanitized.slice(last);
  if (tail) segments.push({ t: 'html', v: tail });
  return segments;
}

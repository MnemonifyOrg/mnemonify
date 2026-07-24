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

export const RICH_TEXT_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SUP', 'SUB', 'BR', 'SPAN', 'UL', 'OL', 'LI']);
const VARIABLE_TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
const SEGMENT_MARKER_PREFIX = '\uE000MNEMONIFY_SEG_';
const VARIABLE_MARKER_SUFFIX = '\uE001';
// Presets for the Word-style text-color picker. Authors may also choose a
// custom hex value; the sanitizer still normalizes every color and never
// copies arbitrary style text or attributes through to stored content.
export const TEXT_COLORS = [
  { name: 'Default', value: null },
  { name: 'Primary Blue', value: '#2563EB' },
  { name: 'Violet', value: '#6D28D9' },
  { name: 'Emerald', value: '#127D59' },
  { name: 'Coral', value: '#A82424' },
  { name: 'Deep Navy', value: '#0A1020' },
  { name: 'Slate', value: '#344054' },
  { name: 'Gray', value: '#667085' },
  { name: 'Light Blue', value: '#175CD3' },
  { name: 'Sky', value: '#026AA2' },
  { name: 'Teal', value: '#0E7A8A' },
  { name: 'Green', value: '#067647' },
  { name: 'Lime', value: '#3F6212' },
  { name: 'Amber', value: '#B54708' },
  { name: 'Orange', value: '#C4320A' },
  { name: 'Red', value: '#B42318' },
  { name: 'Rose', value: '#C01048' },
  { name: 'Pink', value: '#C11574' },
  { name: 'Magenta', value: '#9E165F' },
  { name: 'Purple', value: '#6941C6' },
  { name: 'Indigo', value: '#3538CD' },
];

// DOM-normalizes an inline color (the browser reports `node.style.color` as
// `rgb(r, g, b)` even when the HTML source said `#rrggbb`) back to lowercase
// hex before it is stored.
export function normalizeColorToHex(colorStr) {
  if (!colorStr) return null;
  const trimmed = colorStr.trim();
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (hexMatch) {
    const value = hexMatch[1].length === 3
      ? hexMatch[1].split('').map((character) => character + character).join('')
      : hexMatch[1];
    return `#${value.toLowerCase()}`;
  }
  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i.exec(trimmed);
  if (!rgbMatch) return null;
  const toHex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
}

function hexToRgb(hex) {
  const normalized = normalizeColorToHex(hex);
  if (!normalized) return null;
  return [1, 3, 5].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground, background = '#FFFFFF') {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return null;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLowContrast(foreground, background = '#FFFFFF') {
  const ratio = contrastRatio(foreground, background);
  return ratio !== null && ratio < 4.5;
}

function normalizeTextAlign(value) {
  const normalized = String(value || '').toLowerCase().trim();
  return ['center', 'right', 'justify'].includes(normalized) ? normalized : null;
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
  // hand, not assumed. So every element is checked for a valid color here,
  // before the tag-specific handling below, and its children wrapped in a
  // color node regardless of which tag actually carried the style. Values
  // are normalized to hex rather than copied through, so this doesn't reopen
  // the "no attribute is ever copied" invariant to arbitrary CSS payloads.
  if (allowedTags.has('SPAN')) {
    const hex = normalizeColorToHex(node.style?.color || '');
    if (hex) {
      children = [{ type: 'span', color: hex, children }];
    }
  }

  const alignment = normalizeTextAlign(node.style?.textAlign);
  if (alignment && (tag === 'DIV' || tag === 'P')) {
    return [{ type: 'align', align: alignment, children }];
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
      if (node.type === 'align') return `<div style="text-align:${node.align}">${astToHtml(node.children)}</div>`;
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
    if (segment?.t === 'glossary_link') {
      const termId = escapeHtml(String(segment.term_id || ''));
      return `<span class="rich-glossary-chip" data-mnemonify-glossary-term="${termId}">${escapeHtml(String(segment.v || ''))}</span>`;
    }
    if (segment?.t === 'text') {
      const escaped = escapeHtml(String(segment.v || ''));
      return allowedTags.has('BR') ? escaped.replace(/\n/g, '<br>') : escaped;
    }
    return sanitizeRichHtml(segment?.v || '', allowedTags);
  }).join('');
}

function replaceSpecialSegmentsInTextNodes(root, markerFor) {
  const textNodes = [];

  function visit(node) {
    if (node.nodeType === 3) {
      textNodes.push(node);
      return;
    }
    if (node.nodeType !== 1) return;
    const chipName = node.getAttribute('data-mnemonify-variable');
    if (chipName) {
      node.replaceWith(document.createTextNode(markerFor({ t: 'variable', var_name: chipName })));
      return;
    }
    const glossaryTermId = node.getAttribute('data-mnemonify-glossary-term');
    if (glossaryTermId) {
      node.replaceWith(document.createTextNode(markerFor({ t: 'glossary_link', term_id: glossaryTermId, v: node.textContent || '' })));
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
      fragment.appendChild(document.createTextNode(part.type === 'variable' ? markerFor({ t: 'variable', var_name: part.name }) : part.value));
    });
    node.replaceWith(fragment);
  });
}

export function editableHtmlToRichValue(html, allowedTags = RICH_TEXT_TAGS) {
  const source = String(html || '');
  const scratch = document.createElement('div');
  scratch.innerHTML = source;
  const specialSegments = [];
  const markerFor = (segment) => {
    const index = specialSegments.push(segment) - 1;
    return `${SEGMENT_MARKER_PREFIX}${index}${VARIABLE_MARKER_SUFFIX}`;
  };
  replaceSpecialSegmentsInTextNodes(scratch, markerFor);
  const sanitized = sanitizeRichHtml(scratch.innerHTML, allowedTags);
  const marker = new RegExp(`${SEGMENT_MARKER_PREFIX}(\\d+)${VARIABLE_MARKER_SUFFIX}`, 'g');
  const segments = [];
  let last = 0;
  let match;
  while ((match = marker.exec(sanitized))) {
    const literal = sanitized.slice(last, match.index);
    if (literal) segments.push({ t: 'html', v: literal });
    segments.push(specialSegments[Number(match[1])]);
    last = marker.lastIndex;
  }
  if (!segments.length) return sanitizeRichHtml(source, allowedTags);
  const tail = sanitized.slice(last);
  if (tail) segments.push({ t: 'html', v: tail });
  return segments;
}

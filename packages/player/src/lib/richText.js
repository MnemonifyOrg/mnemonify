// Sanitizes and serializes the inline-formatted HTML captured from a
// contentEditable field into a small, safe allowlisted subset. This is the
// root-cause fix for the "formatting lost after preview" bug: the previous
// implementation captured `el.textContent` on blur, which is plain text --
// it silently drops every tag (bold/italic/underline/sup/sub) AND every
// line break, since `textContent` concatenates all text nodes with no
// separator at all, not even for `<div>`/`<br>` boundaries. Capturing
// (sanitized) `innerHTML` instead preserves both. See DECISIONS.md.
//
// Duplicated identically in packages/editor/src/lib/richText.js rather than
// imported across the package boundary -- same tradeoff already made for
// ImageBlock.jsx's WIDTH_PRESET_PCT (kept in sync by comment, not by
// import), since neither package depends on the other and this file has
// zero dependencies of its own (pure DOM API, no React).

export const RICH_TEXT_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SUP', 'SUB', 'BR', 'SPAN', 'UL', 'OL', 'LI', 'A']);
// DOM-normalizes an inline color (the browser reports `node.style.color` as
// `rgb(r, g, b)` even when the HTML source said `#rrggbb`) back to lowercase
// hex. Arbitrary valid hex values are safe to preserve; style attributes and
// malformed values are never copied through the sanitizer.
function normalizeColorToHex(colorStr) {
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

function normalizeTextAlign(value) {
  const normalized = String(value || '').toLowerCase().trim();
  return ['center', 'right', 'justify'].includes(normalized) ? normalized : null;
}

export function normalizeExternalHref(value) {
  const source = String(value || '').trim();
  if (!source) return null;
  try {
    const url = new URL(source);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
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
  if (tag === 'A') {
    const href = allowedTags.has('A') ? normalizeExternalHref(node.getAttribute('href')) : null;
    return href ? [{ type: 'link', href, children }] : children;
  }
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

function astToHtml(ast) {
  return ast
    .map((node) => {
      if (node.type === 'text') return escapeHtml(node.value);
      if (node.type === 'br') return '<br>';
      if (node.type === 'span') return `<span style="color:${node.color}">${astToHtml(node.children)}</span>`;
      if (node.type === 'align') return `<div style="text-align:${node.align}">${astToHtml(node.children)}</div>`;
      if (node.type === 'link') return `<a href="${escapeHtml(node.href)}">${astToHtml(node.children)}</a>`;
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

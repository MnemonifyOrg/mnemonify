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

export const RICH_TEXT_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SUP', 'SUB', 'BR']);
// Narrower allowlist for table cells (ARCHITECTURE.md 3.7: "Cell content is
// plain text only" -- sup/sub is the one deliberate, narrow exception; see
// DECISIONS.md for why bold/italic/underline/line-breaks stay excluded).
export const SUP_SUB_TAGS = new Set(['SUP', 'SUB']);

function nodeToAst(node, allowedTags) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue ? [{ type: 'text', value: node.nodeValue }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const children = [...node.childNodes].flatMap((child) => nodeToAst(child, allowedTags));
  const tag = node.tagName;

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
  if (allowedTags.has(tag)) {
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

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function astToHtml(ast) {
  return ast
    .map((node) => {
      if (node.type === 'text') return escapeHtml(node.value);
      if (node.type === 'br') return '<br>';
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

import { htmlToRichAst, RICH_TEXT_TAGS } from '../lib/richText.js';

const TAG_MAP = { b: 'b', strong: 'strong', i: 'i', em: 'em', u: 'u', sup: 'sup', sub: 'sub' };

function renderNodes(nodes) {
  return nodes.map((node, i) => {
    if (node.type === 'text') return node.value;
    if (node.type === 'br') return <br key={i} />;
    if (node.type === 'span') {
      return (
        <span key={i} style={{ color: node.color }}>
          {renderNodes(node.children)}
        </span>
      );
    }
    const Tag = TAG_MAP[node.type] || 'span';
    return <Tag key={i}>{renderNodes(node.children)}</Tag>;
  });
}

// Renders a sanitized rich-text HTML string (see ../lib/richText.js) as
// real React elements -- never via dangerouslySetInnerHTML, so there is no
// HTML injection surface regardless of what the stored value contains
// (matches ARCHITECTURE.md 19's "no raw HTML injection through content
// fields" rule). Re-sanitizes defensively at render time (not just trusting
// that the editor already sanitized on save), in case content ever arrives
// through another path, e.g. a future Word import.
export default function RichText({ value, allowedTags = RICH_TEXT_TAGS }) {
  if (!value) return null;
  return <>{renderNodes(htmlToRichAst(value, allowedTags))}</>;
}

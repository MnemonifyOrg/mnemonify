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

function variableValue(varName, variables) {
  if (!varName || !variables || !Object.prototype.hasOwnProperty.call(variables, varName)) return '';
  const value = variables[varName];
  return value === null || value === undefined ? '' : String(value);
}

function renderSegments(segments, { variables, assets = [], onOpenModal, allowedTags }) {
  return (segments || []).map((segment, i) => {
    if (segment.t === 'variable') {
      return <span key={i} data-variable={segment.var_name}>{variableValue(segment.var_name, variables)}</span>;
    }
    if (segment.t === 'asset_link') {
      const asset = assets.find((candidate) => candidate.asset_id === segment.asset_id);
      return (
        <button key={i} type="button" className="block-text__asset-link" tabIndex={0} onClick={() => asset && onOpenModal?.({ type: 'image', asset, ariaLabel: asset.alt || asset.caption || 'Image' })}>
          {segment.v || ''}
        </button>
      );
    }
    if (segment.t === 'html') return <span key={i}><RichText value={segment.v} variables={variables} allowedTags={allowedTags} /></span>;
    return <span key={i}>{segment.v || ''}</span>;
  });
}

// Renders a sanitized rich-text HTML string (see ../lib/richText.js) as
// real React elements -- never via dangerouslySetInnerHTML, so there is no
// HTML injection surface regardless of what the stored value contains
// (matches ARCHITECTURE.md 19's "no raw HTML injection through content
// fields" rule). Re-sanitizes defensively at render time (not just trusting
// that the editor already sanitized on save), in case content ever arrives
// through another path, e.g. a future Word import.
export default function RichText({ value, variables, assets, onOpenModal, allowedTags = RICH_TEXT_TAGS }) {
  if (!value) return null;
  if (Array.isArray(value)) return <>{renderSegments(value, { variables, assets, onOpenModal, allowedTags })}</>;
  if (value?.rich_text) return <>{renderSegments(value.rich_text, { variables, assets, onOpenModal, allowedTags })}</>;
  return <>{renderNodes(htmlToRichAst(value, allowedTags))}</>;
}

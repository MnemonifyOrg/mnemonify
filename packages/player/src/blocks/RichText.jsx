import { htmlToRichAst, RICH_TEXT_TAGS } from '../lib/richText.js';

const TAG_MAP = { b: 'b', strong: 'strong', i: 'i', em: 'em', u: 'u', sup: 'sup', sub: 'sub' };
const VARIABLE_TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

export function interpolateText(value, variables = {}) {
  const source = String(value || '');
  const parts = [];
  let lastIndex = 0;
  let match;
  VARIABLE_TOKEN_PATTERN.lastIndex = 0;
  while ((match = VARIABLE_TOKEN_PATTERN.exec(source))) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    parts.push({ type: 'variable', name: match[1], value: variableValue(match[1], variables) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) parts.push({ type: 'text', value: source.slice(lastIndex) });
  return parts;
}

function renderNodes(nodes, variables) {
  return nodes.map((node, i) => {
    if (node.type === 'text') return renderInlineText(node.value, variables, `node-${i}`);
    if (node.type === 'br') return <br key={i} />;
    if (node.type === 'span') {
      return (
        <span key={i} style={{ color: node.color }}>
          {renderNodes(node.children, variables)}
        </span>
      );
    }
    const Tag = TAG_MAP[node.type] || 'span';
    return <Tag key={i}>{renderNodes(node.children, variables)}</Tag>;
  });
}

function variableValue(varName, variables) {
  if (!varName || !variables || !Object.prototype.hasOwnProperty.call(variables, varName)) return '';
  const value = variables[varName];
  return value === null || value === undefined ? '' : String(value);
}

function renderInlineText(value, variables, keyPrefix) {
  return interpolateText(value, variables).map((part, index) => (
    part.type === 'variable'
      ? <span key={`${keyPrefix}-variable-${index}`} data-variable={part.name}>{part.value}</span>
      : <span key={`${keyPrefix}-text-${index}`}>{part.value}</span>
  ));
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
    return <span key={i}>{renderInlineText(segment.v || '', variables, `segment-${i}`)}</span>;
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
  return <>{renderNodes(htmlToRichAst(value, allowedTags), variables)}</>;
}

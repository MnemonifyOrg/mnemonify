import { createContext, useContext, useState } from 'react';
import { htmlToRichAst, RICH_TEXT_TAGS } from '../lib/richText.js';
import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';

export const GlossaryContext = createContext({ terms: [], onOpenGlossary: null, featureFlags: FEATURE_FLAGS });

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

export function GlossaryLink({ segment, glossaryTerm, onOpenGlossary, variables, assets, allowedTags, featureFlags = FEATURE_FLAGS }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!featureFlags.glossary || !glossaryTerm) return <span>{segment.v || ''}</span>;
  return (
    <span className="glossary-link__wrapper">
      <button
        type="button"
        className="glossary-link"
        aria-label={`${segment.v || glossaryTerm.term}: ${plainDefinition(glossaryTerm.definition)}`}
        onMouseEnter={() => setPreviewOpen(true)}
        onMouseLeave={() => setPreviewOpen(false)}
        onFocus={() => setPreviewOpen(true)}
        onBlur={() => setPreviewOpen(false)}
        onClick={() => onOpenGlossary?.(glossaryTerm.term_id)}
      >
        {segment.v || glossaryTerm.term}
      </button>
      {previewOpen && (
        <span className="glossary-link__tooltip" role="tooltip">
          <RichText value={glossaryTerm.definition} variables={variables} assets={assets} allowedTags={allowedTags} featureFlags={featureFlags} />
        </span>
      )}
    </span>
  );
}

function plainDefinition(definition) {
  return (definition?.rich_text || []).map((segment) => segment.v || '').join('').replace(/<[^>]+>/g, '');
}

function renderSegments(segments, { variables, assets = [], onOpenModal, glossaryTerms = [], onOpenGlossary, allowedTags, featureFlags }) {
  const termsById = new Map(glossaryTerms.map((term) => [term.term_id, term]));
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
    if (segment.t === 'glossary_link') {
      return <GlossaryLink key={i} segment={segment} glossaryTerm={termsById.get(segment.term_id)} onOpenGlossary={onOpenGlossary} variables={variables} assets={assets} allowedTags={allowedTags} featureFlags={featureFlags} />;
    }
    if (segment.t === 'html') return <span key={i}><RichText value={segment.v} variables={variables} allowedTags={allowedTags} featureFlags={featureFlags} /></span>;
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
export default function RichText({ value, variables, assets, onOpenModal, glossaryTerms, onOpenGlossary, allowedTags = RICH_TEXT_TAGS, featureFlags }) {
  const glossaryContext = useContext(GlossaryContext);
  const resolvedGlossaryTerms = glossaryTerms ?? glossaryContext.terms ?? [];
  const resolvedOpenGlossary = onOpenGlossary ?? glossaryContext.onOpenGlossary;
  const resolvedFeatureFlags = featureFlags ?? glossaryContext.featureFlags ?? FEATURE_FLAGS;
  if (!value) return null;
  if (Array.isArray(value)) return <>{renderSegments(value, { variables, assets, onOpenModal, glossaryTerms: resolvedGlossaryTerms, onOpenGlossary: resolvedOpenGlossary, allowedTags, featureFlags: resolvedFeatureFlags })}</>;
  if (value?.rich_text) return <>{renderSegments(value.rich_text, { variables, assets, onOpenModal, glossaryTerms: resolvedGlossaryTerms, onOpenGlossary: resolvedOpenGlossary, allowedTags, featureFlags: resolvedFeatureFlags })}</>;
  return <>{renderNodes(htmlToRichAst(value, allowedTags), variables)}</>;
}

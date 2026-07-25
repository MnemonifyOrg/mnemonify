import { safeEmbedSandbox } from '../lib/embedSandbox.js';
import { isPdfUrl } from '../lib/isPdfUrl.js';

// In-player containment rule (ARCHITECTURE.md 5.2): the iframe is
// sandboxed with only the allowances the author configured, and never
// includes allow-popups-to-escape-sandbox -- that specific token lets a
// popup opened from inside the iframe escape the sandbox's restrictions
// entirely, which would let embedded content navigate the parent/top
// window and defeat the whole point of sandboxing it. safeEmbedSandbox
// strips it defensively; see packages/player/src/lib/embedSandbox.js.
export default function EmbedBlock({ block }) {
  const { url, label, sandbox } = block.content;
  const safeSandbox = safeEmbedSandbox(sandbox, 'allow-scripts allow-same-origin allow-presentation allow-popups');
  const isPdf = isPdfUrl(url);

  return (
    <div className="block block-embed">
      {label && <p className="block-embed__label">{label}</p>}
      {isPdf ? (
        <object
          className="block-embed__pdf"
          data={url}
          type="application/pdf"
          title={label || 'PDF document'}
          tabIndex={-1}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            Open PDF in a new tab
          </a>
        </object>
      ) : (
        <iframe
          className="block-embed__iframe"
          src={url}
          title={label || 'Embedded content'}
          sandbox={safeSandbox}
          tabIndex={-1}
          loading="lazy"
        />
      )}
      {/* Hidden on screen, shown only in print/PDF (player.css) -- an
          iframe can't render in a static PDF, so print output falls back
          to a plain reference instead of a blank box. */}
      <p className="block-embed__print-link">
        {label ? `${label}: ` : ''}
        {url}
      </p>
    </div>
  );
}

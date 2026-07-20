import { DEFAULT_EMBED_SANDBOX } from '../../lib/blockDefaults.js';
import { toEmbeddableUrl } from '../../lib/embedUrl.js';

// Domains known to work well embedded (DigitalScope for pathology WSI
// viewers, plus the common video hosts). Not an enforced restriction --
// just a warning, since an author may have a legitimate reason to embed
// something else -- the player only ever loads the iframe with the
// author-configured sandbox regardless of domain.
const ALLOWED_DOMAINS = ['digitalscope.org', 'youtube.com', 'youtu.be', 'vimeo.com'];

function isAllowedDomain(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return true; // incomplete/invalid URL still being typed -- don't warn yet
  }
}

export default function EmbedBlockEditor({ block, onChange }) {
  const { url = '', label = '', sandbox } = block.content;
  const showWarning = url.trim() && !isAllowedDomain(url);

  function setContent(patch) {
    onChange({ ...block, content: { ...block.content, ...patch } });
  }

  return (
    <div className="embed-block-editor">
      <label>Label</label>
      <input
        className="input"
        value={label}
        onChange={(e) => setContent({ label: e.target.value })}
        placeholder="e.g. View Whole Slide Image"
      />

      <label>URL</label>
      <input
        className="input"
        value={url}
        onChange={(e) => setContent({ url: e.target.value })}
        onPaste={(e) => {
          // Convert recognized YouTube/Vimeo watch-page or short links to
          // their embeddable form on paste -- the common way an author
          // gets a URL onto their clipboard in the first place. Doesn't
          // interfere with normal typing: only replaces the field when
          // the pasted text is a full, recognized URL.
          const pasted = e.clipboardData.getData('text');
          const converted = toEmbeddableUrl(pasted);
          if (converted !== pasted) {
            e.preventDefault();
            setContent({ url: converted });
          }
        }}
        onBlur={(e) => {
          // Safety net for a manually-typed (not pasted) watch/short URL.
          const converted = toEmbeddableUrl(e.target.value);
          if (converted !== e.target.value) setContent({ url: converted });
        }}
        placeholder="https://..."
      />

      {showWarning && (
        <p className="embed-block-editor__warning">
          This domain isn't on the known-good list ({ALLOWED_DOMAINS.join(', ')}) and may not embed reliably for
          all learners.
        </p>
      )}

      {url.trim() && (
        // Same sandbox rules as the player -- an author previewing here
        // sees exactly the containment the learner will get.
        <iframe
          className="embed-block-editor__preview"
          src={url}
          title={label || 'Embed preview'}
          sandbox={sandbox || DEFAULT_EMBED_SANDBOX}
        />
      )}
    </div>
  );
}

// In-player containment rule (ARCHITECTURE.md 5.2): the iframe is
// sandboxed with only the allowances the author configured, and never
// includes allow-popups-to-escape-sandbox -- that specific token lets a
// popup opened from inside the iframe escape the sandbox's restrictions
// entirely, which would let embedded content navigate the parent/top
// window and defeat the whole point of sandboxing it.
export default function EmbedBlock({ block }) {
  const { url, label, sandbox } = block.content;
  const safeSandbox = (sandbox || 'allow-scripts allow-same-origin allow-popups')
    .split(' ')
    .filter((token) => token !== 'allow-popups-to-escape-sandbox')
    .join(' ');

  return (
    <div className="block block-embed">
      {label && <p className="block-embed__label">{label}</p>}
      <iframe
        className="block-embed__iframe"
        src={url}
        title={label || 'Embedded content'}
        sandbox={safeSandbox}
      />
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

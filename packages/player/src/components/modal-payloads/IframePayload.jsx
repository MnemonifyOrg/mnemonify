// No trigger action opens this today (embed blocks render inline, not
// via the modal), but ARCHITECTURE.md 5.3 lists `iframe` as a payload
// type the unified modal layer must support, so the renderer exists and
// reuses EmbedBlock's exact sandbox-token stripping rule (see
// ARCHITECTURE.md 5.2) so a future caller gets the same containment
// guarantee for free, with nothing new to get wrong.
export default function IframePayload({ payload }) {
  const { url, label, sandbox } = payload;
  const safeSandbox = (sandbox || 'allow-scripts allow-same-origin allow-popups')
    .split(' ')
    .filter((token) => token !== 'allow-popups-to-escape-sandbox')
    .join(' ');

  return (
    <div className="modal-payload modal-payload--iframe">
      <iframe className="modal-payload__iframe" src={url} title={label || 'Embedded content'} sandbox={safeSandbox} />
    </div>
  );
}

// Plain-text modal content -- used by the utility bar's Resources item
// (a real PDF list is Phase 5 scope, P1-18) and by custom utility items
// configured with a simple text target rather than a page jump. Not in
// ARCHITECTURE.md 5.3's original payload list; added because the modal's
// existing generic "Unsupported content." fallback can't carry a
// caller-specific message, and a placeholder is real enough content to
// deserve its own tiny payload type rather than a hack on `iframe`.
export default function MessagePayload({ payload }) {
  return <p className="modal-payload__message">{payload.message}</p>;
}

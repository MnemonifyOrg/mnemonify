// Editor-side copy of the player guard. The editor and player are separately
// deployed apps, so this intentionally mirrors the small DOM-only helper
// rather than introducing a cross-app runtime dependency.
export function installEmbedFocusGuard({
  documentRef = globalThis.document,
  scrollTarget,
  iframeSelector = '.embed-block-editor__preview',
  intervalMs = 200,
} = {}) {
  if (!documentRef || !scrollTarget) return () => {};

  const startPosition = {
    x: Number(scrollTarget.scrollLeft || 0),
    y: Number(scrollTarget.scrollTop || 0),
  };
  let interacted = false;
  function restoreStartPosition() {
    if (interacted) return;
    scrollTarget.scrollLeft = startPosition.x;
    scrollTarget.scrollTop = startPosition.y;
  }

  const markInteracted = () => { interacted = true; };
  const iframes = Array.from(documentRef.querySelectorAll?.(iframeSelector) || []);
  const handlePointerDown = () => markInteracted();
  const handleWheel = () => markInteracted();
  const handleTouchStart = () => markInteracted();
  const handleKeyDown = () => markInteracted();
  documentRef.addEventListener?.('pointerdown', handlePointerDown, true);
  documentRef.addEventListener?.('wheel', handleWheel, { passive: true, capture: true });
  documentRef.addEventListener?.('touchstart', handleTouchStart, { passive: true, capture: true });
  documentRef.addEventListener?.('keydown', handleKeyDown, true);
  iframes.forEach((iframe) => iframe.addEventListener?.('load', restoreStartPosition));

  // Start empty so a guard recreated during page/course updates also checks
  // an iframe that is already the active element on its first poll.
  let lastActive = null;
  const pollId = globalThis.setInterval?.(() => {
    const active = documentRef.activeElement;
    if (active === lastActive) return;
    lastActive = active;
    if (iframes.includes(active)) restoreStartPosition();
  }, intervalMs);
  const settleId = globalThis.setTimeout?.(() => {
    if (!interacted) {
      startPosition.x = Number(scrollTarget.scrollLeft || 0);
      startPosition.y = Number(scrollTarget.scrollTop || 0);
    }
  }, 0);

  return () => {
    if (pollId != null) globalThis.clearInterval?.(pollId);
    if (settleId != null) globalThis.clearTimeout?.(settleId);
    documentRef.removeEventListener?.('pointerdown', handlePointerDown, true);
    documentRef.removeEventListener?.('wheel', handleWheel, { passive: true, capture: true });
    documentRef.removeEventListener?.('touchstart', handleTouchStart, { passive: true, capture: true });
    documentRef.removeEventListener?.('keydown', handleKeyDown, true);
    iframes.forEach((iframe) => iframe.removeEventListener?.('load', restoreStartPosition));
  };
}

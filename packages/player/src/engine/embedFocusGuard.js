// Cross-origin iframe contents cannot be inspected or have their focus
// events observed by the parent document. The parent can reliably watch
// document.activeElement, however, and restore the scroll position that
// existed before an unsolicited embed focus. Deliberate interaction disables
// correction for the rest of that page view so it never fights the viewer.
export function installEmbedFocusGuard({
  documentRef = globalThis.document,
  scrollTarget = globalThis.window,
  iframeSelector = '.block-embed__iframe',
  intervalMs = 200,
} = {}) {
  if (!documentRef || !scrollTarget) return () => {};

  const startPosition = {
    x: Number(scrollTarget.scrollX || 0),
    y: Number(scrollTarget.scrollY || 0),
  };
  let interacted = false;

  function restoreStartPosition() {
    if (interacted) return;
    scrollTarget.scrollTo?.(startPosition.x, startPosition.y);
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
  const pollId = scrollTarget.setInterval?.(() => {
    const active = documentRef.activeElement;
    if (active === lastActive) return;
    lastActive = active;
    if (iframes.includes(active)) restoreStartPosition();
  }, intervalMs);
  const settleId = globalThis.setTimeout?.(() => {
    if (!interacted) {
      startPosition.x = Number(scrollTarget.scrollX || 0);
      startPosition.y = Number(scrollTarget.scrollY || 0);
    }
  }, 0);

  return () => {
    if (pollId != null) scrollTarget.clearInterval?.(pollId);
    if (settleId != null) globalThis.clearTimeout?.(settleId);
    documentRef.removeEventListener?.('pointerdown', handlePointerDown, true);
    documentRef.removeEventListener?.('wheel', handleWheel, { passive: true, capture: true });
    documentRef.removeEventListener?.('touchstart', handleTouchStart, { passive: true, capture: true });
    documentRef.removeEventListener?.('keydown', handleKeyDown, true);
    iframes.forEach((iframe) => iframe.removeEventListener?.('load', restoreStartPosition));
  };
}

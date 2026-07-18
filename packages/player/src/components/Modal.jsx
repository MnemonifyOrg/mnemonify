import { useEffect, useRef } from 'react';
import ImagePayload from './modal-payloads/ImagePayload.jsx';
import IframePayload from './modal-payloads/IframePayload.jsx';
import PdfPayload from './modal-payloads/PdfPayload.jsx';
import EmailPayload from './modal-payloads/EmailPayload.jsx';
import BlockRenderer from '../blocks/BlockRenderer.jsx';

// Unified in-player modal layer (ARCHITECTURE.md 5.3). One component
// handles every OPEN_MODAL payload type; only `image` has a real caller
// today (image blocks, carousel blocks, text asset-links) so it's the
// only payload with a fully built-out experience (pan/zoom, carousel
// nav). The others exist so the payload contract is real and the modal
// itself doesn't need to change shape when their features arrive later.
const PAYLOAD_RENDERERS = {
  image: ImagePayload,
  iframe: IframePayload,
  pdf: PdfPayload,
  email: EmailPayload,
};

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Modal({ payload, onClose }) {
  const dialogRef = useRef(null);
  const triggerElRef = useRef(null);

  // Focus management: remember what had focus before opening so it can
  // be restored on close (WCAG requirement, ARCHITECTURE.md 5.3).
  useEffect(() => {
    if (payload) {
      triggerElRef.current = document.activeElement;
    } else if (triggerElRef.current && document.contains(triggerElRef.current)) {
      triggerElRef.current.focus();
      triggerElRef.current = null;
    }
  }, [payload]);

  useEffect(() => {
    if (!payload) return undefined;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    // Focus the dialog itself on open (not a specific control inside it)
    // so screen readers announce its aria-label -- for an image payload
    // that label is set to the image's alt text, satisfying "alt text
    // announced when the lightbox opens" without extra focus juggling.
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [payload, onClose]);

  if (!payload) return null;

  const isOverlay = payload.type === 'interactive_video_overlay';
  const PayloadComponent = isOverlay ? null : PAYLOAD_RENDERERS[payload.type];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        data-payload-type={payload.type}
        role="dialog"
        aria-modal="true"
        aria-label={payload.ariaLabel || 'Content viewer'}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {isOverlay ? (
          payload.block ? (
            <div className="modal-payload modal-payload--overlay">
              <BlockRenderer block={payload.block} assets={payload.assets || []} onTrigger={payload.onTrigger} />
            </div>
          ) : (
            <p className="modal-payload__placeholder">No overlay content.</p>
          )
        ) : PayloadComponent ? (
          <PayloadComponent payload={payload} onClose={onClose} />
        ) : (
          <p className="modal-payload__placeholder">Unsupported content.</p>
        )}
      </div>
    </div>
  );
}

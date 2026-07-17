// No caller opens this today -- the PDF asset pipeline (P1-18) hasn't
// been built yet, so there is nothing to test this against. Renders via
// the browser's own native PDF viewer inside an iframe rather than
// pulling in pdfjs-dist for a payload type with zero real callers;
// ARCHITECTURE.md 5.3's "renders PDF.js viewer" is the intended end
// state once P1-18 lands, at which point this can be swapped for a real
// PDF.js-backed viewer without changing anything that calls into it.
export default function PdfPayload({ payload }) {
  const { url, label } = payload;
  return (
    <div className="modal-payload modal-payload--pdf">
      <iframe className="modal-payload__pdf-frame" src={url} title={label || 'PDF document'} />
      <a className="modal-payload__pdf-download" href={url} download>
        Download PDF
      </a>
    </div>
  );
}

// Use the browser's native PDF renderer through <object>, which is more
// reliable for application/pdf resources than putting the document in the
// generic, sandboxed HTML iframe used by ordinary embeds.
export default function PdfPayload({ payload }) {
  const { url, label } = payload;
  return (
    <div className="modal-payload modal-payload--pdf">
      <object className="modal-payload__pdf-frame" data={url} type="application/pdf" title={label || 'PDF document'}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open PDF in a new tab
        </a>
      </object>
      <a className="modal-payload__pdf-download" href={url} download>
        Download PDF
      </a>
    </div>
  );
}

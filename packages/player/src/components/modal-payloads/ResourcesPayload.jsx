function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// Manually-attached course resources (Step 2, Phase 4 usability-fix
// session) -- distinct from the still-unbuilt Phase 5 auto-generated PDF
// pipeline (P1-18/19, ARCHITECTURE.md 12). The two are expected to coexist
// in this same modal once Phase 5 lands (an auto-generated summary PDF
// listed alongside whatever's manually attached here), not replace one
// another -- see DECISIONS.md. Each resource downloads via a real
// <a download> so the browser saves the file to disk rather than
// navigating the player tab away from the course, per the in-player
// containment rule (ARCHITECTURE.md 5.2) -- `download` forces
// save-to-disk behavior for a same-origin URL instead of the browser's
// default of navigating to/rendering the file in place.
export default function ResourcesPayload({ payload }) {
  const resources = payload.resources || [];

  if (resources.length === 0) {
    return <p className="modal-payload__placeholder">No resources have been added to this course yet.</p>;
  }

  return (
    <div className="modal-payload modal-payload--resources">
      <ul className="modal-payload__resource-list">
        {resources.map((resource) => (
          <li key={resource.resource_id} className="modal-payload__resource-row">
            <div className="modal-payload__resource-info">
              <span className="modal-payload__resource-label">{resource.label || resource.filename}</span>
              <span className="modal-payload__resource-size">{formatFileSize(resource.size_bytes)}</span>
            </div>
            <a
              className="modal-payload__resource-download"
              href={`/uploads/${resource.file_path}`}
              download={resource.label || resource.filename}
            >
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

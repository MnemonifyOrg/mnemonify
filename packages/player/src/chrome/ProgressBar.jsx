// Thin bar directly below the top bar (ARCHITECTURE.md 5.1). Fill
// percentage is completed-page-count / total-page-count -- page
// completion is runtime learner state (in-memory + SCORM suspend_data),
// never stored in the course JSON itself, so this is driven entirely by
// props from App.jsx's own state.
export default function ProgressBar({ completedCount, totalCount }) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-label="Course progress"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

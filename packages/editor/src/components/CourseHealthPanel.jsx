// Phase 4.5c: the author-facing findings panel for the minimal technical
// Course Analyzer (packages/schema/analyzer). This is the "Course Health"
// concept UX-AUDIT.md's Basic-mode "Accessibility status" idea maps onto
// -- one panel, not two competing surfaces. Findings are computed by the
// caller (CourseEditor.jsx, via useMemo over analyzeCourse) and passed in
// already-run; this component only renders and handles navigation clicks.
export default function CourseHealthPanel({ findings, onNavigateToFinding }) {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  return (
    <div className="settings-panel__section course-health">
      <h3>Course Health</h3>
      <p className="settings-panel__hint">
        Deterministic technical checks: schema validity, broken references, accessibility gaps, and unused content.
        This does not evaluate instructional quality.
      </p>

      {findings.length === 0 ? (
        <p className="course-health__clean">✓ No issues found. This course is ready to publish.</p>
      ) : (
        <>
          {errors.length > 0 && (
            <div className="course-health__group">
              <h4 className="course-health__group-title course-health__group-title--error">Errors ({errors.length})</h4>
              <ul className="course-health__list">
                {errors.map((f, i) => (
                  <li key={`${f.ruleId}-${i}`} className="course-health__item course-health__item--error">
                    <button type="button" className="course-health__item-btn" onClick={() => onNavigateToFinding(f)}>
                      {f.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="course-health__group">
              <h4 className="course-health__group-title course-health__group-title--warning">Warnings ({warnings.length})</h4>
              <ul className="course-health__list">
                {warnings.map((f, i) => (
                  <li key={`${f.ruleId}-${i}`} className="course-health__item course-health__item--warning">
                    <button type="button" className="course-health__item-btn" onClick={() => onNavigateToFinding(f)}>
                      {f.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

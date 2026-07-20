import { useState } from 'react';

// Phase 4.6 Step 8: findings with the same ruleId collapse into one row
// with a count instead of N separate rows (UX-AUDIT.md's "18 images
// missing alt text" example). A per-ruleId plural label is needed because
// each rule's raw `message` is written for exactly one instance ("Text (1)
// has no alt text.") -- there's no way to pluralize that string
// generically, so each rule gets its own short generic phrasing here.
const RULE_LABELS = {
  'schema.invalid': (n) => `${n} schema validation errors`,
  'broken_ref.variable_missing': (n) => `${n} broken variable references`,
  'broken_ref.visibility_variable_missing': (n) => `${n} broken visibility conditions`,
  'broken_ref.block_target_missing': (n) => `${n} triggers that target a missing block`,
  'broken_ref.page_target_missing': (n) => `${n} links to a page that no longer exists`,
  'broken_ref.asset_missing': (n) => `${n} references to an image or media file that no longer exists`,
  'broken_ref.page_group_missing': (n) => `${n} modules referencing a page that no longer exists`,
  'a11y.image_alt_missing': (n) => `${n} images missing alt text`,
  'a11y.carousel_image_alt_missing': (n) => `${n} carousels with an image missing alt text`,
  'a11y.table_caption_missing': (n) => `${n} tables missing a caption`,
  'unused.variable': (n) => `${n} unused variables`,
  'unused.asset': (n) => `${n} unused uploaded files`,
  'unused.unreachable_block': (n) => `${n} blocks that may be unreachable`,
  'completeness.unsatisfiable_continue_gate': (n) => `${n} pages with an unsatisfiable Continue gate`,
};

// Both alt-text rules (plain image blocks and carousel-embedded images)
// route to the same bulk review screen -- alt text actually lives on the
// shared asset (Step 9), so fixing it there resolves either finding type
// regardless of which block surfaced it.
const ALT_TEXT_RULE_IDS = new Set(['a11y.image_alt_missing', 'a11y.carousel_image_alt_missing']);

function groupByRule(items) {
  const map = new Map();
  for (const f of items) {
    if (!map.has(f.ruleId)) map.set(f.ruleId, []);
    map.get(f.ruleId).push(f);
  }
  return [...map.values()];
}

function FindingGroupRow({ items, severity, onNavigateToFinding, onOpenAltTextReview }) {
  const [expanded, setExpanded] = useState(false);
  const ruleId = items[0].ruleId;

  if (items.length === 1) {
    return (
      <li className={`course-health__item course-health__item--${severity}`}>
        <button type="button" className="course-health__item-btn" onClick={() => onNavigateToFinding(items[0])}>
          {items[0].message}
        </button>
      </li>
    );
  }

  const label = RULE_LABELS[ruleId] ? RULE_LABELS[ruleId](items.length) : `${items.length}× ${items[0].message}`;

  if (ALT_TEXT_RULE_IDS.has(ruleId)) {
    return (
      <li className={`course-health__item course-health__item--${severity}`}>
        <div className="course-health__group-row">
          <span className="course-health__group-label">{label}</span>
          <button type="button" className="btn-text course-health__review-all" onClick={onOpenAltTextReview}>
            Review all
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={`course-health__item course-health__item--${severity}`}>
      <button
        type="button"
        className="course-health__item-btn course-health__group-toggle"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {label} {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <ul className="course-health__sublist">
          {items.map((f, i) => (
            <li key={`${f.ruleId}-${i}`}>
              <button type="button" className="course-health__item-btn" onClick={() => onNavigateToFinding(f)}>
                {f.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Phase 4.5c: the author-facing findings panel for the minimal technical
// Course Analyzer (packages/schema/analyzer). This is the "Course Health"
// concept UX-AUDIT.md's Basic-mode "Accessibility status" idea maps onto
// -- one panel, not two competing surfaces. Findings are computed by the
// caller (CourseEditor.jsx, via useMemo over analyzeCourse) and passed in
// already-run; this component only renders and handles navigation clicks.
export default function CourseHealthPanel({ findings, onNavigateToFinding, onOpenAltTextReview }) {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const errorGroups = groupByRule(errors);
  const warningGroups = groupByRule(warnings);

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
          {errorGroups.length > 0 && (
            <div className="course-health__group">
              <h4 className="course-health__group-title course-health__group-title--error">Errors ({errors.length})</h4>
              <ul className="course-health__list">
                {errorGroups.map((items) => (
                  <FindingGroupRow
                    key={items[0].ruleId}
                    items={items}
                    severity="error"
                    onNavigateToFinding={onNavigateToFinding}
                    onOpenAltTextReview={onOpenAltTextReview}
                  />
                ))}
              </ul>
            </div>
          )}
          {warningGroups.length > 0 && (
            <div className="course-health__group">
              <h4 className="course-health__group-title course-health__group-title--warning">Warnings ({warnings.length})</h4>
              <ul className="course-health__list">
                {warningGroups.map((items) => (
                  <FindingGroupRow
                    key={items[0].ruleId}
                    items={items}
                    severity="warning"
                    onNavigateToFinding={onNavigateToFinding}
                    onOpenAltTextReview={onOpenAltTextReview}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

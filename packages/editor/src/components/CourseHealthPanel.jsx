import { useState } from 'react';

const CATEGORY_ORDER = [
  ['reference', 'Reference'],
  ['accessibility', 'Accessibility'],
  ['asset', 'Asset'],
];

function groupByRule(items) {
  const groups = new Map();
  for (const finding of items) {
    if (!groups.has(finding.ruleId)) groups.set(finding.ruleId, []);
    groups.get(finding.ruleId).push(finding);
  }
  return [...groups.values()];
}

function FindingGroupRow({ items, severity, onNavigateToFinding, onOpenAltTextReview }) {
  const [expanded, setExpanded] = useState(false);
  const first = items[0];

  if (items.length === 1) {
    return (
      <li className={`course-health__item course-health__item--${severity}`}>
        <button type="button" className="course-health__item-btn" onClick={() => onNavigateToFinding(first)}>
          {first.message}
        </button>
      </li>
    );
  }

  if (['a11y.image_alt_missing', 'accessibility.image_alt_missing'].includes(items[0].ruleId) && onOpenAltTextReview) {
    return (
      <li className={`course-health__item course-health__item--${severity}`}>
        <div className="course-health__group-row">
          <span className="course-health__group-label">{items.length} images missing alt text</span>
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
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {items.length} findings of this type {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <ul className="course-health__sublist">
          {items.map((finding, index) => (
            <li key={`${finding.ruleId}-${finding.entityId}-${index}`}>
              <button type="button" className="course-health__item-btn" onClick={() => onNavigateToFinding(finding)}>
                {finding.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CategorySection({ category, label, findings, onNavigateToFinding, onOpenAltTextReview }) {
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  if (!findings.length) return null;

  function renderSeverity(items, severity) {
    if (!items.length) return null;
    return (
      <div className="course-health__severity">
        <h4 className={`course-health__severity-title course-health__severity-title--${severity}`}>
          {severity === 'error' ? 'Errors' : 'Warnings'} ({items.length})
        </h4>
        <ul className="course-health__list">
          {groupByRule(items).map((group) => (
            <FindingGroupRow
              key={`${category}-${group[0].ruleId}`}
              items={group}
              severity={severity}
              onNavigateToFinding={onNavigateToFinding}
              onOpenAltTextReview={onOpenAltTextReview}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className="course-health__category" data-category={category}>
      <h3 className="course-health__category-title">{label}</h3>
      {renderSeverity(errors, 'error')}
      {renderSeverity(warnings, 'warning')}
    </section>
  );
}

// The existing Course Health icon-rail drawer renders the analyzer output.
// Findings are grouped by the three 4.5c categories, while repeated rules
// collapse into expandable rows so a course with many images remains usable.
export default function CourseHealthPanel({ findings = [], onNavigateToFinding, onOpenAltTextReview }) {
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return (
    <div className="settings-panel__section course-health">
      <p className="settings-panel__hint">
        Deterministic checks for references, accessibility, and uploaded assets. Findings refresh as the course changes.
      </p>

      {findings.length === 0 ? (
        <p className="course-health__clean">✓ No issues found. This course is ready to publish.</p>
      ) : (
        <>
          <p className="course-health__summary">
            {errors.length} error{errors.length === 1 ? '' : 's'}, {warnings.length} warning{warnings.length === 1 ? '' : 's'}
          </p>
          {CATEGORY_ORDER.map(([category, label]) => (
            <CategorySection
              key={category}
              category={category}
              label={label}
              findings={findings.filter((finding) => finding.category === category)}
              onNavigateToFinding={onNavigateToFinding}
              onOpenAltTextReview={onOpenAltTextReview}
            />
          ))}
        </>
      )}
    </div>
  );
}

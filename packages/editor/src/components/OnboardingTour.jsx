import { useEffect, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'mnemonify_onboarding_tour_step';
const PADDING = 8;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT_ESTIMATE = 190;
const GAP = 20;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function computeTooltipPos(rect) {
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom;
  const spaceRight = vw - rect.right;

  if (spaceBelow > TOOLTIP_HEIGHT_ESTIMATE + GAP) {
    return {
      top: rect.bottom + GAP,
      left: clamp(rect.left, 12, vw - TOOLTIP_WIDTH - 12),
    };
  }
  if (spaceRight > TOOLTIP_WIDTH + GAP) {
    return {
      top: clamp(rect.top, 12, vh - TOOLTIP_HEIGHT_ESTIMATE - 12),
      left: rect.right + GAP,
    };
  }
  if (rect.top > TOOLTIP_HEIGHT_ESTIMATE + GAP) {
    return {
      top: rect.top - GAP - TOOLTIP_HEIGHT_ESTIMATE,
      left: clamp(rect.left, 12, vw - TOOLTIP_WIDTH - 12),
    };
  }
  return {
    top: clamp(rect.top, 12, vh - TOOLTIP_HEIGHT_ESTIMATE - 12),
    left: Math.max(12, rect.left - GAP - TOOLTIP_WIDTH),
  };
}

const STEPS = [
  {
    target: '[data-tour="page-list"]',
    title: 'Pages',
    body: 'Every course is made of pages. Add, rename, or delete pages here to structure your course.',
  },
  {
    target: '[data-tour="add-block"]',
    title: 'Add content blocks',
    body: 'Click here to add a block — text, headings, images, lists, quizzes, and more. This is how you build a page.',
  },
  {
    target: '.settings-panel',
    title: 'Settings',
    body: 'Select a block to edit its settings here. With nothing selected, this panel shows course-wide settings like title and theme.',
  },
  {
    target: '[data-tour="preview-toggle"]',
    title: 'Live preview',
    body: 'Preview your course exactly as learners will see it, at phone, tablet, or desktop widths.',
  },
  {
    target: '[data-tour="media-library"]',
    title: 'Media library',
    body: 'Upload images one at a time or in bulk (even as a ZIP), then reuse them across blocks like the image carousel.',
  },
  {
    target: '[data-tour="save-template"]',
    title: 'Templates',
    body: 'Turn any course into a reusable template — teammates can start new courses from it, or export it to Word for offline authoring.',
  },
  {
    target: '[data-tour="save-status"]',
    title: 'Autosave',
    body: 'Your changes save automatically a few seconds after you stop typing — no save button to remember.',
  },
];

function readStoredStep() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw === null ? NaN : parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < STEPS.length ? parsed : 0;
}

export default function OnboardingTour({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(readStoredStep);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];

  useLayoutEffect(() => {
    function measure() {
      const el = document.querySelector(step.target);
      setRect(el ? el.getBoundingClientRect() : null);
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step.target]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(stepIndex));
  }, [stepIndex]);

  function finish() {
    window.localStorage.removeItem(STORAGE_KEY);
    onComplete();
  }

  function next() {
    if (stepIndex === STEPS.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function prev() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const highlightStyle = rect
    ? {
        position: 'fixed',
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
      };

  const tooltipPos = computeTooltipPos(rect);

  return (
    <div className="onboarding-tour">
      <div className="onboarding-tour__backdrop" onClick={(e) => e.stopPropagation()} />
      <div className="onboarding-tour__highlight" style={highlightStyle} />
      <div className="onboarding-tour__tooltip" style={tooltipPos}>
        <p className="onboarding-tour__progress">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="onboarding-tour__actions">
          <button className="onboarding-tour__skip" onClick={finish}>
            Skip
          </button>
          <div className="onboarding-tour__nav">
            {stepIndex > 0 && (
              <button className="btn" onClick={prev}>
                Previous
              </button>
            )}
            <button className="btn btn-primary" onClick={next}>
              {stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

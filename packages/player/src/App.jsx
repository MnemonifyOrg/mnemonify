import { useEffect, useRef, useState } from 'react';
import bundledCourse from '../../../samples/sample-course.json';
import BlockRenderer from './blocks/BlockRenderer.jsx';
import Modal from './components/Modal.jsx';
import TopBar from './chrome/TopBar.jsx';
import ProgressBar from './chrome/ProgressBar.jsx';
import NavDrawer from './chrome/NavDrawer.jsx';
import ContinueButton from './chrome/ContinueButton.jsx';
import UtilityBar from './chrome/UtilityBar.jsx';
import { runTriggers, evaluateCondition } from './engine/triggerEngine.js';
import scorm2004 from './lms/scorm2004.js';

function RichTextPreview({ field }) {
  if (!field?.rich_text?.length) return null;
  return (
    <>
      {field.rich_text.map((segment, i) => (
        <span key={i}>{segment.v}</span>
      ))}
    </>
  );
}

function initialVariables(course) {
  const vars = {};
  course.variables.forEach((v) => {
    vars[v.name] = v.default;
  });
  return vars;
}

// Total knowledge checks across every page, not just the current one --
// used for the 'passed_final_quiz' completion rule and SCORM scoring,
// both of which are course-wide, not page-scoped.
function countKnowledgeChecks(course) {
  return course.pages.reduce((sum, page) => sum + page.blocks.filter((b) => b.type === 'knowledge-check').length, 0);
}

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;
}

export default function App() {
  const [course, setCourse] = useState(null);
  const [variables, setVariables] = useState({});
  const [isScorm, setIsScorm] = useState(false);
  const [modalPayload, setModalPayload] = useState(null);
  const [currentPageId, setCurrentPageId] = useState(null);
  // Runtime learner state (ARCHITECTURE.md 5.1/5.6) -- never stored in the
  // course JSON itself, only in-memory here and mirrored into SCORM
  // suspend_data when a SCORM context is active, exactly like `variables`.
  const [completedPageIds, setCompletedPageIds] = useState([]);
  const [visitedPageIds, setVisitedPageIds] = useState([]);
  // Runtime block show/hide state (Phase 4 Part 2), keyed by block_id.
  // Sparse -- only ever gains an entry when a SHOW_BLOCK/HIDE_BLOCK trigger
  // effect actually fires; a block with no entry here falls back to its own
  // `block.visibility.initial` (BlockRenderer.jsx). Session-only, not
  // persisted to SCORM suspend_data -- see DECISIONS.md.
  const [blockVisibility, setBlockVisibility] = useState({});
  // Starts closed and corrects itself in a mount effect below rather than
  // via a lazy useState initializer -- window.innerWidth/matchMedia can
  // read stale or zeroed values during the synchronous first-render pass,
  // before the browser has finished its own initial layout in some
  // embedding contexts (observed directly: matchMedia('(min-width:
  // 1280px)') read false on a genuinely 1280px-wide viewport when measured
  // synchronously at first render, then correctly read true once measured
  // from an effect after mount). A `useEffect` runs after paint, when the
  // viewport is guaranteed settled in every real browser.
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const answeredRef = useRef({ total: 0, correct: 0, answeredCount: 0 });
  const completedRef = useRef(false);

  async function evaluateCourseCompletion(courseArg, variablesArg, completedPageIdsArg, currentPageIdArg) {
    if (completedRef.current || !courseArg) return;
    const rule = courseArg.meta.completion_rule || 'viewed_all_pages';
    const { total, answeredCount, correct } = answeredRef.current;
    // 'passed_final_quiz': driven by knowledge-check answers, course-wide --
    // preserves the Phase 2 behavior this rule already had, just no longer
    // scoped to a single hardcoded page. 'viewed_all_pages' (the default,
    // and the sample course's own setting): driven purely by Continue-button
    // page completion, independent of whether any page has a quiz at all.
    const isComplete =
      rule === 'passed_final_quiz' && total > 0
        ? answeredCount >= total
        : completedPageIdsArg.length >= courseArg.pages.length;
    if (!isComplete) return;

    completedRef.current = true;
    await scorm2004.setSuspendData({
      variables: variablesArg,
      pageId: currentPageIdArg,
      completedPageIds: completedPageIdsArg,
    });
    await scorm2004.setCompletion('completed');
    if (total > 0) {
      await scorm2004.setScore(correct, 0, total, correct / total);
      await scorm2004.setSuccess(correct === total ? 'passed' : 'failed');
      await scorm2004.terminate('normal', null, { raw: correct, min: 0, max: total, scaled: correct / total });
    } else {
      await scorm2004.terminate('normal');
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      scorm2004.startTimer();

      let scormAvailable = false;
      let loadedCourse = bundledCourse;
      let restoredVariables = initialVariables(bundledCourse);
      let restoredPageId = bundledCourse.pages[0].page_id;
      let restoredCompletedPageIds = [];

      const params = new URLSearchParams(window.location.search);
      const isPreview = params.get('preview') === 'true';

      try {
        if (isPreview) {
          // Editor preview context (ARCHITECTURE.md 5.6): loads the current
          // saved state straight from the API, not the published content
          // endpoint, and never touches SCORM -- this isn't a real learner
          // session.
          const previewCourseId = params.get('courseId');
          const response = await fetch(`${window.location.origin}/api/courses/${previewCourseId}`);
          const record = await response.json();
          if (cancelled) return;
          loadedCourse = record.course_json;
          restoredVariables = initialVariables(loadedCourse);
          restoredPageId = loadedCourse.pages[0].page_id;
        } else {
          scormAvailable = await scorm2004.initialize();
          if (cancelled) return;

          if (scormAvailable) {
            const courseId = params.get('courseId') || 'sample';
            const contentServerUrl = window.location.origin;
            const response = await fetch(`${contentServerUrl}/content/${courseId}`);
            loadedCourse = await response.json();
            if (cancelled) return;

            const suspend = await scorm2004.getSuspendData();
            restoredVariables = suspend.variables || initialVariables(loadedCourse);
            restoredPageId = suspend.pageId || loadedCourse.pages[0].page_id;
            restoredCompletedPageIds = suspend.completedPageIds || [];

            await scorm2004.setLocation(restoredPageId);
            await scorm2004.setSuspendData({
              variables: restoredVariables,
              pageId: restoredPageId,
              completedPageIds: restoredCompletedPageIds,
            });
          }
        }
      } catch (err) {
        // Never leave the learner/author stuck on "Loading course..." because
        // SCORM communication or a preview fetch failed -- fall back to the
        // bundled course so the player still works.
        console.error('[player] Boot failed, falling back to bundled course:', err);
        scormAvailable = false;
        loadedCourse = bundledCourse;
        restoredVariables = initialVariables(bundledCourse);
        restoredPageId = bundledCourse.pages[0].page_id;
        restoredCompletedPageIds = [];
      }

      // Defensive fallback if a prior save references a page_id that no
      // longer exists in this version of the course (e.g. the author
      // deleted a page) -- restart at the first page rather than crash on
      // a missing page lookup. Full structural-change-detection UX
      // (ARCHITECTURE.md P1-25) is later-phase scope; this is just the
      // "don't throw" floor for it.
      if (!loadedCourse.pages.some((p) => p.page_id === restoredPageId)) {
        restoredPageId = loadedCourse.pages[0].page_id;
      }

      if (cancelled) return;
      setIsScorm(scormAvailable);
      answeredRef.current = { total: countKnowledgeChecks(loadedCourse), correct: 0, answeredCount: 0 };
      setVariables(restoredVariables);
      setCourse(loadedCourse);
      setCurrentPageId(restoredPageId);
      setCompletedPageIds(restoredCompletedPageIds);
      setVisitedPageIds(restoredCompletedPageIds.includes(restoredPageId) ? restoredCompletedPageIds : [...restoredCompletedPageIds, restoredPageId]);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!course) return;
    // Per-course customizable interactive color (meta.theme.accent, see
    // ARCHITECTURE.md 3.3). Overrides brand.css's --color-primary default
    // -- named --color-primary (not --color-accent) so it doesn't collide
    // with the brand system's own fixed --color-accent (amber CTA color).
    document.documentElement.style.setProperty('--color-primary', course.meta.theme.accent);
  }, [course]);

  useEffect(() => {
    // A live MediaQueryList rather than a one-time measurement -- besides
    // handling real window resizes (a genuine gap otherwise: resizing from
    // mobile to desktop mid-session should reasonably open the persistent
    // sidebar), this also covers an environment quirk observed directly
    // during testing: window.innerWidth/matchMedia can still read a stale
    // pre-layout value for a brief window even after mount, past the point
    // a one-shot effect measurement already ran and captured the wrong
    // answer. The 'change' listener catches the correction whenever the
    // browser's matched state actually flips, instead of trusting a single
    // snapshot at an arbitrary point in time.
    const mql = window.matchMedia('(min-width: 1280px)');
    setNavDrawerOpen(mql.matches);
    function handleChange(e) {
      setNavDrawerOpen(e.matches);
    }
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!course) return;
    // Embed blocks (e.g. a DigitalScope WSI iframe) can trigger the
    // browser's default iframe-focus auto-scroll behavior -- some browsers
    // resolve an iframe gaining focus by scrolling it into view, jumping
    // the page down to wherever the embed sits even though nothing the
    // course itself asked for that. window.scrollTo here targets this
    // document's own scroll position (this player may itself be running
    // inside the editor's preview iframe, in which case `window` is that
    // iframe's own window, not the outer editor page -- exactly the
    // container that needs resetting).
    //
    // Rather than guess at a timeout long enough to cover every viewer's
    // load time, this needs to detect the actual signal: the iframe
    // becoming the parent document's focused element, whenever that
    // happens. `document.activeElement` is polled (not a `focusin`
    // listener -- confirmed by hand that browsers deliberately suppress
    // that event across a cross-origin boundary, so it would silently
    // never fire for a real cross-origin WSI embed).
    //
    // This must NOT fight a learner who deliberately clicks into the embed
    // to use it, or who has started scrolling/interacting with the page at
    // all -- see DECISIONS.md for the full reasoning.
    window.scrollTo(0, 0);

    let userHasInteracted = false;
    function markInteracted() {
      userHasInteracted = true;
    }
    window.addEventListener('wheel', markInteracted, { passive: true });
    window.addEventListener('touchstart', markInteracted, { passive: true });
    window.addEventListener('keydown', markInteracted);

    const iframes = Array.from(document.querySelectorAll('.block-embed__iframe'));
    const clickedIframes = new WeakSet();

    function handlePointerDown(e) {
      const iframe = e.target?.closest?.('.block-embed__iframe');
      if (iframe) {
        clickedIframes.add(iframe);
        userHasInteracted = true;
      }
    }

    function resetScroll() {
      if (!userHasInteracted) window.scrollTo(0, 0);
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    iframes.forEach((iframe) => iframe.addEventListener('load', resetScroll));

    let lastActive = document.activeElement;
    const pollId = window.setInterval(() => {
      const active = document.activeElement;
      if (active === lastActive) return;
      lastActive = active;
      if (iframes.includes(active) && !clickedIframes.has(active)) {
        resetScroll();
      }
    }, 200);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('wheel', markInteracted);
      window.removeEventListener('touchstart', markInteracted);
      window.removeEventListener('keydown', markInteracted);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      iframes.forEach((iframe) => iframe.removeEventListener('load', resetScroll));
    };
  }, [course]);

  // Fires onPageEnter and marks the page visited whenever currentPageId
  // changes -- including the very first time it's set on boot, so the
  // initial page gets the same lifecycle treatment as every page navigated
  // to afterward, with no separate "first page" special case.
  useEffect(() => {
    if (!course || !currentPageId) return;
    const page = course.pages.find((p) => p.page_id === currentPageId);
    if (!page) return;
    const result = runTriggers(variables, page.triggers, 'onPageEnter');
    setVariables(result.variables);
    applyEffects(result.effects);
    setVisitedPageIds((prev) => (prev.includes(currentPageId) ? prev : [...prev, currentPageId]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageId, course]);

  // Applies the non-variable side effects a trigger's actions can produce
  // (ARCHITECTURE.md 4 / triggerEngine.js header comment). SHOW_BLOCK/
  // HIDE_BLOCK update the block-visibility map that BlockRenderer reads;
  // JUMP_TO_PAGE navigates directly (it does not re-fire onPageExit on the
  // page being left -- that page is already mid-handling the event that
  // produced this effect, so re-entering the exit lifecycle from inside it
  // would be circular).
  function applyEffects(effects) {
    effects.forEach((effect) => {
      if (effect.action === 'SHOW_BLOCK') {
        setBlockVisibility((v) => ({ ...v, [effect.target]: true }));
      } else if (effect.action === 'HIDE_BLOCK') {
        setBlockVisibility((v) => ({ ...v, [effect.target]: false }));
      } else if (effect.action === 'JUMP_TO_PAGE') {
        goToPage(effect.target);
      }
    });
  }

  useEffect(() => {
    if (!course) return;
    console.log('[player] variable state:', variables);
    if (isScorm) {
      scorm2004.setSuspendData({ variables, pageId: currentPageId, completedPageIds });
    }
  }, [variables, course, isScorm, currentPageId, completedPageIds]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (!course || completedRef.current) return;
      scorm2004.setSuspendData({ variables, pageId: currentPageId, completedPageIds });
      scorm2004.terminate('suspend');
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [course, variables, currentPageId, completedPageIds]);

  function handleOpenModal(payload) {
    setModalPayload(payload);
  }

  function handleCloseModal() {
    setModalPayload(null);
  }

  function handleTrigger(block, eventName) {
    const result = runTriggers(variables, block.triggers, eventName);
    setVariables(result.variables);
    applyEffects(result.effects);

    if (block.type === 'knowledge-check' && (eventName === 'onCorrect' || eventName === 'onIncorrect')) {
      answeredRef.current.answeredCount += 1;
      if (eventName === 'onCorrect') answeredRef.current.correct += 1;
      evaluateCourseCompletion(course, result.variables, completedPageIds, currentPageId);
    }
  }

  // Pure navigation -- sets the current page and, on mobile/tablet, closes
  // the drawer (ARCHITECTURE.md 5.1: "closes on: clicking a page" -- a
  // desktop persistent sidebar doesn't get this, it isn't a temporary
  // overlay). Does not itself fire onPageExit/onPageEnter: onPageExit
  // needs the OLD page reference and is fired by callers before switching;
  // onPageEnter fires uniformly for every navigation (including the very
  // first page) via the useEffect above, keyed on currentPageId.
  function goToPage(pageId) {
    if (!isDesktopViewport()) setNavDrawerOpen(false);
    setCurrentPageId(pageId);
  }

  function getPageStatus(pageId) {
    if (completedPageIds.includes(pageId)) return 'completed';
    if (visitedPageIds.includes(pageId)) return 'in-progress';
    const navMode = course.meta.nav_mode || 'free';
    if (navMode === 'linear') {
      const targetIndex = course.pages.findIndex((p) => p.page_id === pageId);
      const currentIndex = course.pages.findIndex((p) => p.page_id === currentPageId);
      const completedIndices = completedPageIds.map((id) => course.pages.findIndex((p) => p.page_id === id));
      const furthestUnlockedIndex = Math.max(currentIndex, ...completedIndices, 0);
      if (targetIndex > furthestUnlockedIndex) return 'locked';
    }
    return 'not-visited';
  }

  function handleDrawerNavigate(pageId) {
    if (getPageStatus(pageId) === 'locked') return;
    const currentPage = course.pages.find((p) => p.page_id === currentPageId);
    if (pageId !== currentPageId) {
      const result = runTriggers(variables, currentPage?.triggers, 'onPageExit');
      setVariables(result.variables);
      applyEffects(result.effects);
    }
    goToPage(pageId);
  }

  // Utility-bar custom items with a JUMP_TO_PAGE-style action are an
  // author-configured escape hatch (e.g. "back to overview," a glossary
  // cross-reference) -- deliberately NOT gated by linear-mode page
  // locking the way drawer browsing is. This matches how JUMP_TO_PAGE
  // behaves everywhere else in the trigger vocabulary (ARCHITECTURE.md 4):
  // nav_mode governs whether the learner can freely browse the page list,
  // not whether a specific, author-placed navigation action can fire.
  function handleJumpToPage(pageId) {
    const targetPage = course.pages.find((p) => p.page_id === pageId);
    if (!targetPage) return;
    const currentPage = course.pages.find((p) => p.page_id === currentPageId);
    if (pageId !== currentPageId) {
      const result = runTriggers(variables, currentPage?.triggers, 'onPageExit');
      setVariables(result.variables);
      applyEffects(result.effects);
    }
    goToPage(pageId);
  }

  function handleContinue() {
    const currentPage = course.pages.find((p) => p.page_id === currentPageId);
    if (!currentPage) return;
    const nextCompletedPageIds = completedPageIds.includes(currentPageId)
      ? completedPageIds
      : [...completedPageIds, currentPageId];
    setCompletedPageIds(nextCompletedPageIds);
    const result = runTriggers(variables, currentPage.triggers, 'onPageExit');
    setVariables(result.variables);
    applyEffects(result.effects);

    const currentIndex = course.pages.findIndex((p) => p.page_id === currentPageId);
    const nextPage = course.pages[currentIndex + 1];
    if (nextPage) {
      goToPage(nextPage.page_id);
    } else {
      evaluateCourseCompletion(course, result.variables, nextCompletedPageIds, currentPageId);
    }
  }

  function handleToggleDrawer() {
    setNavDrawerOpen((open) => !open);
  }

  if (!course || !currentPageId) {
    return (
      <div className="player">
        <main className="player__page">
          <p>Loading course…</p>
        </main>
      </div>
    );
  }

  const page = course.pages.find((p) => p.page_id === currentPageId);
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
  const currentIndex = course.pages.findIndex((p) => p.page_id === currentPageId);
  const isLastPage = currentIndex === course.pages.length - 1;
  const continueDisabled = page.continue_gate ? !evaluateCondition(page.continue_gate, variables) : false;

  return (
    <div className="player-shell">
      <TopBar
        courseTitle={course.meta.title}
        onToggleDrawer={handleToggleDrawer}
        drawerOpen={navDrawerOpen}
        utilityBar={course.meta.utility_bar}
        onOpenModal={handleOpenModal}
        onJumpToPage={handleJumpToPage}
      />
      <ProgressBar completedCount={completedPageIds.length} totalCount={course.pages.length} />
      <div className="player-shell__body">
        <NavDrawer
          pages={course.pages}
          pageDisplay={course.meta.page_display || 'flat'}
          pageGroups={course.meta.page_groups}
          currentPageId={currentPageId}
          getStatus={getPageStatus}
          onNavigate={handleDrawerNavigate}
          open={navDrawerOpen}
          onClose={() => setNavDrawerOpen(false)}
        />
        <main className="player">
          <div className="player__page">
            {/* Course-wide header, rendered above the content on every page. */}
            {course.meta.header && (
              <div className="player__course-header">
                <RichTextPreview field={course.meta.header} />
              </div>
            )}
            <h1 className="player__page-title">{page.title}</h1>
            {page.blocks.map((block) => (
              <BlockRenderer
                key={block.block_id}
                block={block}
                assets={course.assets}
                onTrigger={handleTrigger}
                isPreview={isPreview}
                onOpenModal={handleOpenModal}
                blockVisibility={blockVisibility}
              />
            ))}
            <ContinueButton
              label={isLastPage ? 'Finish' : 'Continue'}
              disabled={continueDisabled}
              onClick={handleContinue}
            />
            {course.meta.footer && (
              <div className="player__course-footer">
                <RichTextPreview field={course.meta.footer} />
              </div>
            )}
          </div>
        </main>
      </div>
      <UtilityBar
        utilityBar={course.meta.utility_bar}
        courseTitle={course.meta.title}
        onOpenModal={handleOpenModal}
        onJumpToPage={handleJumpToPage}
        layout="bottom"
      />
      <Modal payload={modalPayload} onClose={handleCloseModal} />
    </div>
  );
}

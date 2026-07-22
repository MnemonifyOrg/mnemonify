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
import { configureAnalytics, track } from './engine/analytics.js';
import * as mediaManager from './engine/mediaManager.js';
import scorm2004 from './lms/scorm2004.js';
import { createScoreState, recordInteractionScore, scoreVariables, stripSystemVariables, isScoredInteraction, restoreInteractionStates, recordInteractionState, prepareQuestionBankDraws, collectKnowledgeChecks } from './engine/scoring.js';
import RichText from './blocks/RichText.jsx';
import { getPageStatus as getNavigationPageStatus } from './engine/navigation.js';
import { resetPageScroll } from './engine/scroll.js';

function RichTextPreview({ field, variables }) {
  if (!field?.rich_text?.length) return null;
  return <RichText value={field.rich_text} variables={variables} />;
}

function initialVariables(course) {
  const vars = {};
  (course.variables || []).forEach((v) => {
    vars[v.name] = v.default;
  });
  return vars;
}

function publishSettings(course) {
  return {
    completion_criteria: 'viewed_all_pages',
    report_status_as: 'both',
    success_enabled: true,
    passing_score_pct: 80,
    ...(course?.meta?.publish_settings || {}),
  };
}

// Total knowledge checks across every page, not just the current one --
// used for the 'passed_final_quiz' completion rule and SCORM scoring,
// both of which are course-wide, not page-scoped.
function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;
}

export default function App() {
  const [course, setCourse] = useState(null);
  const [courseResources, setCourseResources] = useState([]);
  const [variables, setVariables] = useState({});
  const [scoreState, setScoreState] = useState({ scoreMax: 0, scoreRaw: 0, completedInteractionIds: [] });
  const [interactionStates, setInteractionStates] = useState({});
  const [questionBankDraws, setQuestionBankDraws] = useState({});
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
  const timelineContextRef = useRef(null);
  const pageEnterTimesRef = useRef(new Map());
  const scoreStateRef = useRef(scoreState);
  const interactionStatesRef = useRef(interactionStates);
  const questionBankDrawsRef = useRef(questionBankDraws);

  function runtimeVariables(courseArg = course, scoreArg = scoreStateRef.current) {
    return { ...variables, ...scoreVariables(courseArg, scoreArg) };
  }

  function trackPageEnter(pageId) {
    const enteredAt = Date.now();
    pageEnterTimesRef.current.set(pageId, enteredAt);
    track('page_enter', {
      pageId,
      payload: { entered_at: new Date(enteredAt).toISOString() },
    });
  }

  function trackPageExit(pageId) {
    const enteredAt = pageEnterTimesRef.current.get(pageId);
    pageEnterTimesRef.current.delete(pageId);
    const timeOnPage = enteredAt === undefined ? 0 : Math.max(0, (Date.now() - enteredAt) / 1000);
    track('page_exit', {
      pageId,
      payload: { time_on_page: Number(timeOnPage.toFixed(3)) },
    });
  }

  async function evaluateCourseCompletion(courseArg, variablesArg, completedPageIdsArg, currentPageIdArg, scoreArg = scoreStateRef.current) {
    if (completedRef.current || !courseArg) return;
    const settings = publishSettings(courseArg);
    const score = scoreVariables(courseArg, scoreArg);
    const hasScored = score.ScoreMax > 0;
    const viewedAllPages = completedPageIdsArg.length >= courseArg.pages.length;
    const passedAssessment = hasScored && score.ScorePassed;
    const isComplete = settings.completion_criteria === 'passed_assessment'
      ? (hasScored ? passedAssessment : viewedAllPages)
      : settings.completion_criteria === 'either'
        ? (viewedAllPages || passedAssessment)
        : viewedAllPages;
    if (!isComplete) return;

    completedRef.current = true;
    track('course_complete', {
      pageId: currentPageIdArg,
      payload: {
        completion_criteria: settings.completion_criteria,
        completed_pages: completedPageIdsArg.length,
        total_pages: courseArg.pages.length,
        score: { raw: score.ScoreRaw, min: 0, max: score.ScoreMax, scaled: score.ScorePercent / 100 },
        success: hasScored ? (score.ScorePassed ? 'passed' : 'failed') : 'unknown',
      },
    });
    await scorm2004.setSuspendData({
      variables: variablesArg,
      pageId: currentPageIdArg,
      completedPageIds: completedPageIdsArg,
      scoreState: scoreArg,
      interactionStates: interactionStatesRef.current,
      questionBankDraws: questionBankDrawsRef.current,
    });
    if (settings.report_status_as !== 'success_only') await scorm2004.setCompletion('completed');
    if (settings.report_status_as !== 'completion_only') await scorm2004.setSuccess(hasScored ? (score.ScorePassed ? 'passed' : 'failed') : 'unknown');
    const scorePayload = hasScored ? { raw: score.ScoreRaw, min: 0, max: score.ScoreMax, scaled: score.ScorePercent / 100 } : null;
    if (scorePayload) await scorm2004.setScore(scorePayload.raw, scorePayload.min, scorePayload.max, scorePayload.scaled);
    await scorm2004.terminate('normal', settings.report_status_as !== 'completion_only' ? (hasScored ? (score.ScorePassed ? 'passed' : 'failed') : 'unknown') : null, scorePayload);
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
      let restoredScoreState = createScoreState(bundledCourse);
      let restoredInteractionStates = {};
      let restoredQuestionBankDraws = {};
      let restoredInteractionStatePayload = {};

      const params = new URLSearchParams(window.location.search);
      const isPreview = params.get('preview') === 'true';
      const isPrint = params.get('print') === '1';
      const printPageId = params.get('page_id');
      let learnerId = null;

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
          restoredPageId = printPageId || loadedCourse.pages[0].page_id;
          restoredScoreState = createScoreState(loadedCourse);
          restoredInteractionStates = {};
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
            learnerId = await scorm2004.getLearnerId();
            restoredVariables = suspend.variables || initialVariables(loadedCourse);
            restoredPageId = suspend.pageId || loadedCourse.pages[0].page_id;
            restoredCompletedPageIds = suspend.completedPageIds || [];
            restoredScoreState = createScoreState(loadedCourse, suspend.scoreState);
            restoredInteractionStatePayload = suspend.interactionStates || {};
            restoredQuestionBankDraws = suspend.questionBankDraws || {};
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
        restoredScoreState = createScoreState(bundledCourse);
        restoredInteractionStates = {};
        restoredQuestionBankDraws = {};
        restoredInteractionStatePayload = {};
      }

      const prepared = prepareQuestionBankDraws(loadedCourse, restoredQuestionBankDraws);
      loadedCourse = prepared.course;
      restoredQuestionBankDraws = prepared.questionBankDraws;
      restoredScoreState = createScoreState(loadedCourse, restoredScoreState);
      restoredInteractionStates = restoreInteractionStates(loadedCourse, restoredInteractionStatePayload);
      if (scormAvailable) {
        await scorm2004.setLocation(restoredPageId);
        await scorm2004.setSuspendData({
          variables: restoredVariables,
          pageId: restoredPageId,
          completedPageIds: restoredCompletedPageIds,
          scoreState: restoredScoreState,
          interactionStates: restoredInteractionStates,
          questionBankDraws: restoredQuestionBankDraws,
        });
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
      await configureAnalytics({
        courseId: isPreview ? null : loadedCourse.meta.course_id,
        courseVersion: params.get('versionId'),
        learnerId,
      });
      setIsScorm(scormAvailable);
      answeredRef.current = { total: collectKnowledgeChecks(loadedCourse).length, correct: 0, answeredCount: 0 };
      scoreStateRef.current = restoredScoreState;
      interactionStatesRef.current = restoredInteractionStates;
      questionBankDrawsRef.current = restoredQuestionBankDraws;
      setVariables(stripSystemVariables(restoredVariables));
      setScoreState(restoredScoreState);
      setInteractionStates(restoredInteractionStates);
      setQuestionBankDraws(restoredQuestionBankDraws);
      setCourse(loadedCourse);
      if (isPreview && params.get('courseId')) {
        fetch(`${window.location.origin}/api/courses/${params.get('courseId')}/resources`)
          .then((response) => (response.ok ? response.json() : []))
          .then((resources) => { if (!cancelled) setCourseResources(resources); })
          .catch(() => {});
      }
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
    window.__MNEMONIFY_BOOTED__ = true;
    document.title = course.title || course.meta?.title || 'Mnemonify Course';
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
    resetPageScroll();

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

  useEffect(() => {
    if (!currentPageId) return;
    resetPageScroll();
  }, [currentPageId]);

  // Fires onPageEnter and marks the page visited whenever currentPageId
  // changes -- including the very first time it's set on boot, so the
  // initial page gets the same lifecycle treatment as every page navigated
  // to afterward, with no separate "first page" special case.
  useEffect(() => {
    if (!course || !currentPageId) return;
    const page = course.pages.find((p) => p.page_id === currentPageId);
    if (!page) return;
    const result = runTriggers(runtimeVariables(), page.triggers, 'onPageEnter');
    setVariables(stripSystemVariables(result.variables));
    applyEffects(result.effects);
    setVisitedPageIds((prev) => (prev.includes(currentPageId) ? prev : [...prev, currentPageId]));
    trackPageEnter(currentPageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageId, course]);

  // Applies the non-variable side effects a trigger's actions can produce
  // (ARCHITECTURE.md 4 / triggerEngine.js header comment). SHOW_BLOCK/
  // HIDE_BLOCK update the block-visibility map that BlockRenderer reads;
  // JUMP_TO_PAGE navigates directly (it does not re-fire onPageExit on the
  // page being left -- that page is already mid-handling the event that
  // produced this effect, so re-entering the exit lifecycle from inside it
  // would be circular).
  function applyEffects(effects, { timelineBlockId } = {}) {
    const opensModal = effects.some((effect) => effect.action === 'OPEN_MODAL');
    effects.forEach((effect) => {
      if (effect.action === 'SHOW_BLOCK') {
        setBlockVisibility((v) => ({ ...v, [effect.target]: true }));
      } else if (effect.action === 'HIDE_BLOCK') {
        setBlockVisibility((v) => ({ ...v, [effect.target]: false }));
      } else if (effect.action === 'JUMP_TO_PAGE') {
        goToPage(effect.target);
      } else if (effect.action === 'JUMP_TO_TIMESTAMP') {
        const blockId = timelineBlockId || timelineContextRef.current?.blockId;
        if (!blockId) return;
        mediaManager.seek(blockId, effect.target);
        if (timelineContextRef.current) timelineContextRef.current.resumeTimestamp = effect.target;
        if (!opensModal && !timelineContextRef.current?.modalOpen) mediaManager.play(blockId);
      } else if (effect.action === 'OPEN_MODAL') {
        const block = effect.content?.block;
        if (!block) return;
        if (timelineContextRef.current) timelineContextRef.current.modalOpen = true;
        setModalPayload({
          type: effect.payload_type,
          block,
          assets: course?.assets || [],
          onTrigger: handleOverlayTrigger,
        });
      }
    });
  }

  useEffect(() => {
    if (!course) return;
    console.log('[player] variable state:', variables);
    if (isScorm) {
      scorm2004.setSuspendData({ variables, pageId: currentPageId, completedPageIds, scoreState, interactionStates, questionBankDraws });
    }
  }, [variables, course, isScorm, currentPageId, completedPageIds, scoreState, interactionStates, questionBankDraws]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (!course || completedRef.current) return;
      scorm2004.setSuspendData({ variables, pageId: currentPageId, completedPageIds, scoreState, interactionStates, questionBankDraws });
      scorm2004.terminate('suspend');
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [course, variables, currentPageId, completedPageIds, scoreState, interactionStates, questionBankDraws]);

  function handleOpenModal(payload) {
    setModalPayload(payload);
  }

  function handleCloseModal() {
    const timelineContext = timelineContextRef.current;
    setModalPayload(null);
    if (timelineContext) {
      const resumeTimestamp = timelineContext.resumeTimestamp ?? timelineContext.timestamp;
      mediaManager.seek(timelineContext.blockId, resumeTimestamp);
      mediaManager.play(timelineContext.blockId);
      timelineContextRef.current = null;
    }
  }

  function handleTrigger(block, eventName, eventPayload) {
    if (block.type === 'knowledge-check' && eventName === 'onComplete') {
      track('knowledge_check_attempt', {
        pageId: currentPageId,
        blockId: block.block_id,
        payload: eventPayload,
      });
    } else if (eventName === 'onOpen' || eventName === 'onClose' || eventName === 'onClick') {
      track('block_interaction', {
        pageId: currentPageId,
        blockId: block.block_id,
        payload: { event: eventName },
      });
    }
    let nextScoreState = scoreStateRef.current;
    let nextInteractionStates = interactionStatesRef.current;
    if (eventName === 'onComplete' && block.type === 'knowledge-check') {
      nextInteractionStates = recordInteractionState(nextInteractionStates, block, eventPayload);
      if (nextInteractionStates !== interactionStatesRef.current) {
        interactionStatesRef.current = nextInteractionStates;
        setInteractionStates(nextInteractionStates);
      }
    }
    if (eventName === 'onComplete' && isScoredInteraction(block)) {
      nextScoreState = recordInteractionScore(course, nextScoreState, block, eventPayload);
      if (nextScoreState !== scoreStateRef.current) {
        scoreStateRef.current = nextScoreState;
        setScoreState(nextScoreState);
      }
    }
    const result = runTriggers({ ...variables, ...scoreVariables(course, nextScoreState) }, block.triggers, eventName);
    setVariables(stripSystemVariables(result.variables));
    applyEffects(result.effects, {
      timelineBlockId: block.type === 'video' ? block.block_id : timelineContextRef.current?.blockId,
    });

    if (block.type === 'knowledge-check' && (eventName === 'onCorrect' || eventName === 'onIncorrect')) {
      answeredRef.current.answeredCount += 1;
      if (eventName === 'onCorrect') answeredRef.current.correct += 1;
      evaluateCourseCompletion(course, stripSystemVariables(result.variables), completedPageIds, currentPageId, nextScoreState);
    }
    if (eventName === 'onComplete' && isScoredInteraction(block)) {
      evaluateCourseCompletion(course, stripSystemVariables(result.variables), completedPageIds, currentPageId, nextScoreState);
    }
  }

  function handleOverlayTrigger(block, eventName, eventPayload) {
    handleTrigger(block, eventName, eventPayload);
  }

  function handleTimelineReached(videoBlock, timelineTrigger, timestamp) {
    timelineContextRef.current = {
      blockId: videoBlock.block_id,
      timestamp,
      resumeTimestamp: timestamp,
    };
    const timelineEvent = { ...timelineTrigger, event: 'onTimeReached' };
    const result = runTriggers(runtimeVariables(), [...(videoBlock.triggers || []), timelineEvent], 'onTimeReached');
    setVariables(stripSystemVariables(result.variables));
    applyEffects(result.effects, { timelineBlockId: videoBlock.block_id });
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
    return getNavigationPageStatus({
      pageId,
      pages: course.pages,
      navMode: course.meta.nav_mode || 'free',
      completedPageIds,
      visitedPageIds,
    });
  }

  function handleDrawerNavigate(pageId) {
    if (getPageStatus(pageId) === 'locked') return;
    const currentPage = course.pages.find((p) => p.page_id === currentPageId);
    if (pageId !== currentPageId) {
      trackPageExit(currentPageId);
      const result = runTriggers(runtimeVariables(), currentPage?.triggers, 'onPageExit');
      setVariables(stripSystemVariables(result.variables));
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
      trackPageExit(currentPageId);
      const result = runTriggers(runtimeVariables(), currentPage?.triggers, 'onPageExit');
      setVariables(stripSystemVariables(result.variables));
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
    trackPageExit(currentPageId);
    track('continue_clicked', {
      pageId: currentPageId,
      payload: {
        conditions_met: currentPage.continue_gate
          ? continueDisabled
            ? []
            : ['continue_gate']
          : ['no_continue_gate'],
      },
    });
    const result = runTriggers(runtimeVariables(), currentPage.triggers, 'onPageExit');
    setVariables(stripSystemVariables(result.variables));
    applyEffects(result.effects);

    const currentIndex = course.pages.findIndex((p) => p.page_id === currentPageId);
    const nextPage = course.pages[currentIndex + 1];
    if (nextPage) {
      goToPage(nextPage.page_id);
    } else {
      evaluateCourseCompletion(course, stripSystemVariables(result.variables), nextCompletedPageIds, currentPageId, scoreStateRef.current);
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
  const params = new URLSearchParams(window.location.search);
  const isPrintMode = params.get('print') === '1';
  const isWorksheet = params.get('worksheet') === '1';
  const visibleResources = [
    ...(course.meta.resources || []),
    ...(course.meta.pdf_settings?.resources_page === false ? [] : courseResources),
  ];
  const currentIndex = course.pages.findIndex((p) => p.page_id === currentPageId);
  const isLastPage = currentIndex === course.pages.length - 1;
  const playerVariables = runtimeVariables();
  const continueDisabled = page.continue_gate ? !evaluateCondition(page.continue_gate, playerVariables) : false;

  return (
    <div className="player-shell">
      <TopBar
        courseTitle={course.meta.title}
        onToggleDrawer={handleToggleDrawer}
        drawerOpen={navDrawerOpen}
        utilityBar={course.meta.utility_bar}
        resources={visibleResources}
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
          utilityBar={course.meta.utility_bar}
          resources={visibleResources}
          courseTitle={course.meta.title}
          onOpenModal={handleOpenModal}
          onJumpToPage={handleJumpToPage}
        />
        <main className="player">
          <div className="player__page">
            {/* Course-wide header, rendered above the content on every page. */}
            {course.meta.header && (
              <div className="player__course-header">
                <RichTextPreview field={course.meta.header} variables={playerVariables} />
              </div>
            )}
            <h1 className="player__page-title">{page.title}</h1>
            {page.blocks.map((block) => (
              <BlockRenderer
                key={block.block_id}
                block={block}
                assets={course.assets}
                onTrigger={handleTrigger}
                onTimeReached={handleTimelineReached}
                isPreview={isPreview}
                onOpenModal={handleOpenModal}
                blockVisibility={blockVisibility}
                variables={playerVariables}
                interactionStates={interactionStates}
                course={course}
                printMode={isPrintMode}
                worksheetMode={isWorksheet}
              />
            ))}
            <ContinueButton
              label={isLastPage ? 'Finish' : 'Continue'}
              disabled={continueDisabled}
              onClick={handleContinue}
            />
            {course.meta.footer && (
              <div className="player__course-footer">
                <RichTextPreview field={course.meta.footer} variables={playerVariables} />
              </div>
            )}
          </div>
        </main>
      </div>
      <UtilityBar
        utilityBar={course.meta.utility_bar}
        resources={visibleResources}
        courseTitle={course.meta.title}
        onOpenModal={handleOpenModal}
        onJumpToPage={handleJumpToPage}
        layout="bottom"
      />
      <Modal payload={modalPayload} onClose={handleCloseModal} />
    </div>
  );
}

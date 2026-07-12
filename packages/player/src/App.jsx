import { useEffect, useRef, useState } from 'react';
import bundledCourse from '../../../samples/sample-course.json';
import BlockRenderer from './blocks/BlockRenderer.jsx';
import { runTriggers } from './engine/triggerEngine.js';
import scorm2004 from './lms/scorm2004.js';

function initialVariables(course) {
  const vars = {};
  course.variables.forEach((v) => {
    vars[v.name] = v.default;
  });
  return vars;
}

function countKnowledgeChecks(page) {
  return page.blocks.filter((b) => b.type === 'knowledge-check').length;
}

export default function App() {
  const [course, setCourse] = useState(null);
  const [variables, setVariables] = useState({});
  const [isScorm, setIsScorm] = useState(false);
  const answeredRef = useRef({ total: 0, correct: 0, answeredCount: 0 });
  const completedRef = useRef(false);

  async function evaluateCompletion(courseArg, variablesArg) {
    if (completedRef.current || !courseArg) return;
    const { total, correct, answeredCount } = answeredRef.current;
    const pageViewed = answeredCount >= total;
    if (!pageViewed) return;

    completedRef.current = true;
    await scorm2004.setSuspendData({ variables: variablesArg, pageId: courseArg.pages[0].page_id });
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

            await scorm2004.setLocation(restoredPageId);
            await scorm2004.setSuspendData({ variables: restoredVariables, pageId: restoredPageId });
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
      }

      if (cancelled) return;
      setIsScorm(scormAvailable);
      answeredRef.current = { total: countKnowledgeChecks(loadedCourse.pages[0]), correct: 0, answeredCount: 0 };
      setVariables(restoredVariables);
      setCourse(loadedCourse);

      if (answeredRef.current.total === 0) {
        evaluateCompletion(loadedCourse, restoredVariables);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!course) return;
    document.documentElement.style.setProperty('--color-accent', course.meta.theme.accent);
  }, [course]);

  useEffect(() => {
    if (!course) return;
    console.log('[player] variable state:', variables);
    if (isScorm) {
      scorm2004.setSuspendData({ variables, pageId: course.pages[0].page_id });
    }
  }, [variables, course, isScorm]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (!course || completedRef.current) return;
      scorm2004.setSuspendData({ variables, pageId: course.pages[0].page_id });
      scorm2004.terminate('suspend');
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [course, variables]);

  function handleTrigger(block, eventName) {
    setVariables((current) => runTriggers(current, block.triggers, eventName));

    if (block.type === 'knowledge-check' && (eventName === 'onCorrect' || eventName === 'onIncorrect')) {
      answeredRef.current.answeredCount += 1;
      if (eventName === 'onCorrect') answeredRef.current.correct += 1;
      evaluateCompletion(course, variables);
    }
  }

  if (!course) {
    return (
      <div className="player">
        <main className="player__page">
          <p>Loading course…</p>
        </main>
      </div>
    );
  }

  const page = course.pages[0];

  return (
    <div className="player">
      <main className="player__page">
        <h1 className="player__page-title">{page.title}</h1>
        {page.blocks.map((block) => (
          <BlockRenderer key={block.block_id} block={block} assets={course.assets} onTrigger={handleTrigger} />
        ))}
      </main>
    </div>
  );
}

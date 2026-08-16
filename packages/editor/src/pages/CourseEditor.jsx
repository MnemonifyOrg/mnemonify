import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import {
  genCardId,
  genFeedbackId,
  genHotspotRegionId,
  genItemId,
  genMatchingOptionId,
  genMatchingPromptId,
  genOptionId,
  genOrderingItemId,
  genPageId,
} from '../lib/idGen.js';
import PageList from '../components/PageList.jsx';
import BlockCanvas from '../components/BlockCanvas.jsx';
import DrawerSettingsContent from '../components/DrawerSettingsContent.jsx';
import SaveAsTemplateModal from '../components/SaveAsTemplateModal.jsx';
import SavePageAsTemplateModal from '../components/SavePageAsTemplateModal.jsx';
import PageTemplateGalleryModal from '../components/PageTemplateGalleryModal.jsx';
import MediaLibraryPanel from '../components/MediaLibraryPanel.jsx';
import BulkAltTextReview from '../components/BulkAltTextReview.jsx';
import OnboardingTour from '../components/OnboardingTour.jsx';
import MoreToolsMenu from '../components/MoreToolsMenu.jsx';
import EditorDrawerShell from '../components/EditorDrawerShell.jsx';
import LinkedEntityPrompt from '../components/LinkedEntityPrompt.jsx';
import VersionHistoryModal from '../components/VersionHistoryModal.jsx';
import { applyGlossarySuggestion } from '@mnemonify/schema/glossary.js';
import { getDependents } from '@mnemonify/schema/dependency-index.js';
import { analyzeCourse, getBlockingFindings } from '@mnemonify/schema/analyzer/index.js';
import {
  deleteEntityEverywhere,
  detachUsageWithUpdate,
  findLinkedUsages,
  linkBlockToBank,
  materializeLinkedEntities,
  mergePagesPreservingLinked,
  mergeQuestionBanksPreservingLinked,
  unlinkUsage,
  updateLinkedEntityFromBankQuestion,
  updateLinkedEntityFromBlock,
} from '@mnemonify/schema/linked-entities.js';
import { importNativeQuestionBank } from '@mnemonify/schema/question-bank-transfer.js';
import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';
import { toggleRailDrawer } from '../lib/editorDrawer.js';
import { installEmbedFocusGuard } from '../lib/embedFocusGuard.js';
import { useAuth } from '../auth/AuthContext.jsx';
import '../styles/courseEditor.css';

const AUTOSAVE_DELAY_MS = 5000;
const PREVIEW_WIDTHS = { phone: '375px', tablet: '768px', desktop: '100%' };
const BLOCK_SETTINGS_HINT_STORAGE_KEY = 'mnemonify_block_settings_hint_seen';
const BLOCK_SETTINGS_HINT_DURATION_MS = 5000;

// Undo/redo (ARCHITECTURE.md 3.9). MAX_UNDO_STACK caps memory; TYPING_BURST_MS
// coalesces a run of rapid changes (e.g. keystrokes in a controlled input)
// into a single undo step so undo reverts a meaningful chunk, not one
// keystroke -- see the design note above updateCourseJson/pushUndoSnapshot.
const MAX_UNDO_STACK = 50;
const TYPING_BURST_MS = 500;

function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// Standard circular-arrow undo/redo convention (Google Docs, Word, most
// design tools) -- inline SVG rather than a new icon-library dependency,
// since none is installed in this package (see DECISIONS.md). The prior
// hook-curl glyphs (↶/↷) tested as unrecognizable to non-technical users.
function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function TopBarDivider() {
  return <span className="course-editor__top-bar-divider" aria-hidden="true" />;
}

export default function CourseEditor({ featureFlags = FEATURE_FLAGS }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { canEdit, isReviewer, user, role } = useAuth();

  const [course, setCourse] = useState(null);
  const [activePageId, setActivePageId] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [showBlockSettingsHint, setShowBlockSettingsHint] = useState(false);
  const [activeRailItem, setActiveRailItem] = useState(null);
  const [contextualDrawer, setContextualDrawer] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [editingTitle, setEditingTitle] = useState(false);
  const [previewMode, setPreviewMode] = useState(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showAltTextReview, setShowAltTextReview] = useState(false);
  const [showTour, setShowTour] = useState(searchParams.get('tour') === '1');
  const [showExportSaving, setShowExportSaving] = useState(false);
  const [pageToSaveAsTemplate, setPageToSaveAsTemplate] = useState(null);
  const [showInsertFromTemplate, setShowInsertFromTemplate] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState(null);
  const [pendingLinkedEdit, setPendingLinkedEdit] = useState(null);
  const [pendingLinkedDelete, setPendingLinkedDelete] = useState(null);
  const [libraryGlossaries, setLibraryGlossaries] = useState([]);
  const [libraryGlossaryTerms, setLibraryGlossaryTerms] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [courseVersions, setCourseVersions] = useState([]);
  const [versionHistoryLoading, setVersionHistoryLoading] = useState(false);
  const [versionHistoryError, setVersionHistoryError] = useState(null);
  const [assetMetadataById, setAssetMetadataById] = useState(null);
  const [uploadedAssetIds, setUploadedAssetIds] = useState(null);
  const [uploadedResourceIds, setUploadedResourceIds] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentAnchor, setCommentAnchor] = useState(null);

  const blockSettingsHintTimerRef = useRef(null);

  // Phase 4.6 Step 2: panel collapse + Focus Mode. Deliberately plain
  // useState, entirely separate from the undo/redo system below -- this is
  // view state (what the author is currently looking at), not document
  // state (what the course contains). Toggling a panel or Focus Mode must
  // never push an undo snapshot and must never itself be undoable; see
  // DECISIONS.md. Session-level only (resets on reload), per this step's
  // own "doesn't need to persist across sessions" allowance.
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const effectiveLeftCollapsed = leftPanelCollapsed || focusMode;

  function dismissBlockSettingsHint() {
    if (blockSettingsHintTimerRef.current) {
      window.clearTimeout(blockSettingsHintTimerRef.current);
      blockSettingsHintTimerRef.current = null;
    }
    setShowBlockSettingsHint(false);
  }

  function maybeShowBlockSettingsHint() {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(BLOCK_SETTINGS_HINT_STORAGE_KEY)) return;
      window.localStorage.setItem(BLOCK_SETTINGS_HINT_STORAGE_KEY, '1');
    } catch {
      // The hint still works in privacy-restricted browsers; it simply cannot
      // persist across reloads when storage is unavailable.
    }
    setShowBlockSettingsHint(true);
    if (blockSettingsHintTimerRef.current) window.clearTimeout(blockSettingsHintTimerRef.current);
    blockSettingsHintTimerRef.current = window.setTimeout(() => {
      setShowBlockSettingsHint(false);
      blockSettingsHintTimerRef.current = null;
    }, BLOCK_SETTINGS_HINT_DURATION_MS);
  }

  useEffect(() => () => {
    if (blockSettingsHintTimerRef.current) window.clearTimeout(blockSettingsHintTimerRef.current);
  }, []);

  function handleCloseDrawer() {
    setActiveRailItem(null);
    setContextualDrawer(null);
    setCommentAnchor(null);
  }

  function handleRailItemClick(itemId) {
    const opening = activeRailItem !== itemId;
    if (itemId === 'comments') {
      if (opening) {
        const current = courseRef.current?.course_json;
        const currentPage = current?.pages?.find((candidate) => candidate.page_id === activePageId);
        const selected = currentPage?.blocks?.find((block) => block.block_id === selectedBlockId);
        setCommentAnchor(selected
          ? { blockId: selected.block_id, pageId: activePageId, fallbackLabel: selected.label || `${selected.type} block` }
          : (currentPage ? { pageId: currentPage.page_id, fallbackLabel: currentPage.title || 'Untitled page' } : null));
      } else {
        setCommentAnchor(null);
      }
    } else if (itemId !== 'comments') {
      setCommentAnchor(null);
    }
    setActiveRailItem((current) => toggleRailDrawer(current, itemId));
    setContextualDrawer(null);
    setSelectedBlockId(null);
  }

  function handleSelectBlock(blockId) {
    setCommentAnchor(null);
    setSelectedBlockId(blockId);
    setActiveRailItem(null);
    setContextualDrawer(null);
    if (blockId && showBlockSettingsHint) dismissBlockSettingsHint();
    else if (blockId) maybeShowBlockSettingsHint();
    else dismissBlockSettingsHint();
  }

  function handleOpenBlockSettings(blockId) {
    setCommentAnchor(null);
    dismissBlockSettingsHint();
    setSelectedBlockId(blockId);
    setActiveRailItem(null);
    setContextualDrawer(blockId ? { kind: 'block', id: blockId } : null);
  }

  function clearContextualSelection() {
    setCommentAnchor(null);
    dismissBlockSettingsHint();
    setSelectedBlockId(null);
    setContextualDrawer(null);
  }

  const courseRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Undo/redo state. The stacks themselves are refs (not React state) since
  // pushing to them is a synchronous side effect that must happen exactly
  // once per mutation, not tied to React's render/commit cycle -- only
  // canUndo/canRedo (derived booleans for the toolbar buttons) need to be
  // state so their re-render is triggered. Snapshots are in-memory only:
  // never written to localStorage or the server, so they do not survive a
  // page reload (matches ARCHITECTURE.md 3.9's accepted v1 simplification).
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const burstActiveRef = useRef(false);
  const burstTimerRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!featureFlags.glossary) return undefined;
    api.listGlossaries().then(setLibraryGlossaries).catch((error) => console.warn('[course-editor] could not load glossary library:', error));
    return undefined;
  }, [featureFlags.glossary]);

  useEffect(() => {
    if (!featureFlags.glossary) return undefined;
    const glossaryId = course?.course_json?.meta?.glossary_id;
    if (!glossaryId) {
      setLibraryGlossaryTerms([]);
      return undefined;
    }
    let cancelled = false;
    api.getGlossary(glossaryId).then((glossary) => {
      if (!cancelled) setLibraryGlossaryTerms(glossary.terms || []);
    }).catch((error) => {
      if (!cancelled) {
        setLibraryGlossaryTerms([]);
        console.warn('[course-editor] could not load attached glossary:', error);
      }
    });
    return () => { cancelled = true; };
  }, [course?.course_json?.meta?.glossary_id, featureFlags.glossary]);

  useEffect(() => {
    setAssetMetadataById(null);
    setUploadedAssetIds(null);
    setUploadedResourceIds(null);
    api.getCourse(id).then((c) => {
      setCourse(c);
      setActivePageId(c.course_json.pages?.[0]?.page_id || null);
      api.listAssets(id).then((dbAssets) => {
        const metadataById = new Map(dbAssets.map((asset) => [asset.asset_id, asset]));
        setAssetMetadataById(metadataById);
        setUploadedAssetIds(dbAssets.filter((asset) => asset.file_exists !== false).map((asset) => asset.asset_id));
        setCourse((current) => {
          if (!current) return current;
          return {
            ...current,
            course_json: {
              ...current.course_json,
              assets: (current.course_json.assets || []).map((asset) => {
                const dbAsset = metadataById.get(asset.asset_id);
                if (!dbAsset) return asset;
                return {
                  ...asset,
                  ...(dbAsset.caption_status ? { caption_status: dbAsset.caption_status } : {}),
                  ...(dbAsset.caption_review_status ? { caption_review_status: dbAsset.caption_review_status } : {}),
                  ...(dbAsset.transcript_status ? { transcript_status: dbAsset.transcript_status } : {}),
                  ...(dbAsset.automatic_transcription_enabled !== undefined
                    ? { automatic_transcription_enabled: dbAsset.automatic_transcription_enabled }
                    : {}),
                };
              }),
            },
          };
        });
      }).catch((error) => console.warn('[course-editor] could not load media metadata:', error));
      api.listCourseResources(id).then((resources) => {
        setUploadedResourceIds(resources.filter((resource) => resource.file_exists !== false).map((resource) => resource.resource_id));
      }).catch((error) => console.warn('[course-editor] could not load resource metadata:', error));
    });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setCommentsLoading(true);
    setCommentsError(null);
    api.listComments(id).then((result) => {
      if (!cancelled) setComments(result);
    }).catch((error) => {
      if (!cancelled) setCommentsError(error?.response?.data?.error || error.message || 'Comments could not be loaded.');
    }).finally(() => {
      if (!cancelled) setCommentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    courseRef.current = course;
  }, [course]);

  useEffect(() => {
    if (!course || !activePageId || previewMode) return undefined;
    const scrollPanel = document.querySelector('.course-editor__center-panel');
    return installEmbedFocusGuard({ documentRef: document, scrollTarget: scrollPanel });
  }, [course, activePageId, previewMode]);

  useEffect(() => {
    if (!publishNotice) return;
    const timer = setTimeout(() => setPublishNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [publishNotice]);

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (saveStatus !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    function handleKeyDown(e) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== 'z') return;
      // While actively focused inside a text field, let the browser's own
      // native undo (in-progress keystrokes not yet committed to React
      // state -- see the 2026-07-12 contentEditable decision in
      // DECISIONS.md) handle Cmd+Z instead of intercepting it here. Once
      // focus leaves the field (on blur, the field's own value is already
      // committed via updateCourseJson), app-level undo/redo takes over.
      if (isEditableElement(document.activeElement)) return;
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  async function doSave() {
    const current = courseRef.current;
    if (!current) return;
    setSaveStatus('saving');
    try {
      await api.updateCourse(current.id, { title: current.title, course_json: current.course_json });
      setSaveStatus('saved');
      return true;
    } catch (err) {
      console.error('[course-editor] autosave failed:', err);
      setSaveStatus('unsaved');
      return false;
    }
  }

  function scheduleSave() {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, AUTOSAVE_DELAY_MS);
  }

  function saveNow() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    return doSave();
  }

  async function refreshCourseVersions() {
    setVersionHistoryLoading(true);
    setVersionHistoryError(null);
    try {
      setCourseVersions(await api.listCourseVersions(course.id));
    } catch (error) {
      setVersionHistoryError(error);
    } finally {
      setVersionHistoryLoading(false);
    }
  }

  async function openVersionHistory() {
    if (!featureFlags.versionHistory) return;
    setShowVersionHistory(true);
    const saved = await saveNow();
    if (!saved) {
      setVersionHistoryError(new Error('The current course could not be saved. Version history was not opened.'));
      return;
    }
    await refreshCourseVersions();
  }

  async function handleSaveVersion(name) {
    if (!featureFlags.versionHistory) return;
    const saved = await saveNow();
    if (!saved) throw new Error('The current course could not be saved, so no snapshot was created.');
    const version = await api.createCourseVersion(course.id, { name });
    setCourseVersions((previous) => [version, ...previous]);
  }

  async function handleRestoreVersion(version) {
    if (!featureFlags.versionHistory) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const result = await api.restoreCourseVersion(course.id, version.version_id);
    courseRef.current = result.course;
    setCourse(result.course);
    setActivePageId(result.course.course_json.pages?.[0]?.page_id || null);
    clearContextualSelection();
    setActiveRailItem(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setSaveStatus('saved');
    setCourseVersions((previous) => [result.version, ...previous]);
  }

  async function handleExportWord() {
    // The export endpoint reads course_json straight from the DB. Word
    // export used to be a plain <a href>, which navigated immediately --
    // any edit still sitting in the 5s autosave debounce would be missing
    // from the exported doc. Force a save first so the export always
    // reflects what's on screen right now.
    const savingIndicatorTimer = setTimeout(() => setShowExportSaving(true), 500);
    try {
      await saveNow();
    } finally {
      clearTimeout(savingIndicatorTimer);
      setShowExportSaving(false);
    }
    window.location.href = `/api/templates/${course.id}/export-word`;
  }

  // Phase 4.5c Step 5: pre-publish gating. There is no dedicated "publish"
  // flow anywhere in this codebase yet (ARCHITECTURE.md 15's
  // course_versions/push_all/lock_existing machinery is schema-only,
  // built ahead of its UI same as several other Phase 3.5/4 fields; the
  // one thing that already exists is `courses.status`, defaulting to
  // 'draft' and already accepted generically by PATCH /courses/:id). This
  // is deliberately the minimal "mark a course as published" the task's
  // own Step 5 wording allows, not a build-out of the full dynamic-SCORM
  // version-control flow -- that's Phase 6 work. See DECISIONS.md.
  //
  // Re-runs the analyzer against a freshly-saved course rather than
  // trusting the `findings` computed for the currently-rendered state --
  // an author could click Publish a moment after a change that hasn't
  // finished its own re-render yet, and this is the one place "was it
  // actually safe to publish" must be authoritative, not just displayed.
  async function handlePublish() {
    const saved = await saveNow();
    if (!saved) {
      setPublishNotice({ type: 'error', message: 'Cannot publish: the latest changes could not be saved. Please try again.' });
      return;
    }
    const freshFindings = analyzeCourse(materializeLinkedEntities(courseRef.current.course_json), {
      assetMetadataById,
      uploadedAssetIds,
      uploadedResourceIds,
    });
    const errorFindings = getBlockingFindings(freshFindings);
    if (errorFindings.length > 0) {
      clearContextualSelection();
      setActiveRailItem(null);
      setActiveRailItem('course-health');
      setPublishNotice({
        type: 'error',
        message: `Cannot publish: ${errorFindings.length} error${errorFindings.length === 1 ? '' : 's'} must be fixed first.`,
      });
      return;
    }
    setPublishing(true);
    try {
      const updated = await api.updateCourse(course.id, { status: 'published' });
      api.generatePublishArtifacts(course.id).catch((err) => console.error('[course-editor] PDF generation could not be queued:', err));
      setCourse((prev) => ({ ...prev, status: updated.status }));
      const warningCount = freshFindings.length;
      setPublishNotice({
        type: 'success',
        message: warningCount > 0 ? `Published with ${warningCount} warning${warningCount === 1 ? '' : 's'}.` : 'Published.',
      });
    } catch (err) {
      console.error('[course-editor] publish failed:', err);
      setPublishNotice({ type: 'error', message: 'Publish failed. Please try again.' });
    } finally {
      setPublishing(false);
    }
  }

  async function handleExportWorksheet() {
    await saveNow();
    await api.exportWorksheet(course.id);
    setPublishNotice({ type: 'success', message: 'Worksheet generation started. It will appear in Resources when ready.' });
  }

  function pushUndoSnapshot(previousJson) {
    undoStackRef.current.push(previousJson);
    if (undoStackRef.current.length > MAX_UNDO_STACK) undoStackRef.current.shift();
    // Standard undo/redo behavior: any new change clears the redo stack --
    // you cannot redo after making a new change.
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  // Single choke point for every document mutation (block/page/settings
  // changes all route through this). The undo-snapshot push happens here,
  // outside the setCourse updater -- React 18 StrictMode double-invokes
  // updater functions in dev to surface side effects, so a side effect
  // (mutating undoStackRef, starting a timer) inside the updater would push
  // two snapshots per change. Reading courseRef.current (kept in sync by the
  // effect above) instead of the updater's own `prev` avoids that entirely.
  //
  // Burst debouncing: if a mutation arrives while a burst is already active
  // (another mutation happened within the last TYPING_BURST_MS), no new
  // snapshot is pushed -- the whole burst reverts as one undo step. A pause
  // of TYPING_BURST_MS ends the burst, so the next mutation (whenever it
  // comes) starts a fresh one. This gives one snapshot per rapid typing
  // session (e.g. the course title input, which fires onChange on every
  // keystroke).
  //
  // forceSnapshot: true bypasses the burst check entirely and always pushes
  // its own snapshot, then resets the burst so it can't merge into whatever
  // comes next either. Block add/delete/duplicate/reorder and page add/
  // delete/rename pass this -- ARCHITECTURE.md 3.9 lists these as their own
  // undo steps unconditionally, unlike text edits, and two such actions
  // firing within the same TYPING_BURST_MS window (e.g. a fast double-click,
  // or scripted/automated actions) must not silently coalesce into one undo
  // step the way a burst of keystrokes should.
  function updateCourseJson(updater, { forceSnapshot = false } = {}) {
    const prevJson = courseRef.current.course_json;
    if (forceSnapshot || !burstActiveRef.current) {
      pushUndoSnapshot(prevJson);
    }
    if (forceSnapshot) {
      burstActiveRef.current = false;
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    } else {
      burstActiveRef.current = true;
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      burstTimerRef.current = setTimeout(() => {
        burstActiveRef.current = false;
      }, TYPING_BURST_MS);
    }

    setCourse((prev) => {
      const nextJson = updater(prev.course_json);
      return { ...prev, course_json: nextJson, title: nextJson.meta?.title ?? prev.title };
    });
    scheduleSave();
  }

  // Applies a restored (undo/redo) document. Deliberately bypasses
  // updateCourseJson -- restoring history must never itself push a new undo
  // snapshot, or undo/redo would corrupt their own stacks. Still schedules
  // autosave, per spec: an undo is itself a change to the current document.
  function applyRestoredJson(restoredJson) {
    burstActiveRef.current = false;
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    setCourse((prev) => ({ ...prev, course_json: restoredJson, title: restoredJson.meta?.title ?? prev.title }));
    if (!restoredJson.pages.some((p) => p.page_id === activePageId)) {
      setActivePageId(restoredJson.pages[0]?.page_id || null);
    }
    scheduleSave();
  }

  function handleUndo() {
    if (undoStackRef.current.length === 0) return;
    const currentJson = courseRef.current.course_json;
    const restoredJson = undoStackRef.current.pop();
    redoStackRef.current.push(currentJson);
    applyRestoredJson(restoredJson);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }

  function handleRedo() {
    if (redoStackRef.current.length === 0) return;
    const currentJson = courseRef.current.course_json;
    const restoredJson = redoStackRef.current.pop();
    undoStackRef.current.push(currentJson);
    if (undoStackRef.current.length > MAX_UNDO_STACK) undoStackRef.current.shift();
    applyRestoredJson(restoredJson);
    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(true);
  }

  // options forwarded through (Phase 4.6 Step 5): PageList's module
  // create/rename/delete/assign actions pass { forceSnapshot: true }, the
  // same "this is a discrete structural action, not a keystroke burst"
  // signal every other structural mutation in this file already uses --
  // previously dropped here since this function only ever took one
  // argument, silently downgrading module edits to the default
  // burst-coalescing snapshot behavior meant for continuous typing.
  function handleChangeMeta(newMeta, options) {
    updateCourseJson((json) => ({ ...json, meta: newMeta }), options);
  }

  function handleChangeVariables(newVariables, options) {
    updateCourseJson((json) => ({ ...json, variables: newVariables }), options);
  }

  function handleChangeQuestionBanks(newQuestionBanks, options) {
    updateCourseJson((json) => ({ ...json, question_banks: mergeQuestionBanksPreservingLinked(json, newQuestionBanks) }), options);
  }

  function handleChangeGlossaryTerms(newTerms, options = { forceSnapshot: false }) {
    if (!featureFlags.glossary) return;
    updateCourseJson((json) => ({ ...json, glossary_terms: newTerms }), options);
  }

  async function handleCreateGlossary(name) {
    if (!featureFlags.glossary) return null;
    const glossary = await api.createGlossary({ name });
    setLibraryGlossaries((current) => [...current, glossary].sort((a, b) => a.name.localeCompare(b.name)));
    return glossary;
  }

  async function handlePublishGlossaryTerm(term) {
    if (!featureFlags.glossary) return;
    const glossaryId = courseRef.current.course_json.meta?.glossary_id;
    if (!glossaryId) throw new Error('Attach a library glossary before publishing a term.');
    const libraryTerm = await api.publishGlossaryTerm(glossaryId, { term: term.term, definition: term.definition });
    handleChangeGlossaryTerms(
      (courseRef.current.course_json.glossary_terms || []).map((candidate) => (
        candidate.term_id === term.term_id
          ? { ...candidate, source: 'course', shared_library_term_id: libraryTerm.term_id }
          : candidate
      )),
      { forceSnapshot: true }
    );
    setLibraryGlossaryTerms((current) => {
      const withoutExisting = current.filter((candidate) => candidate.term_id !== libraryTerm.term_id && candidate.term.toLocaleLowerCase() !== libraryTerm.term.toLocaleLowerCase());
      return [...withoutExisting, libraryTerm];
    });
  }

  function handleApplyGlossarySuggestion(suggestion) {
    if (!featureFlags.glossary) return;
    updateCourseJson((json) => applyGlossarySuggestion(json, suggestion), { forceSnapshot: true });
  }

  function handleImportBank({ payload, mode, targetBankId }) {
    if (!featureFlags.bankImportExport) return;
    updateCourseJson((json) => importNativeQuestionBank(json, payload, { mode, targetBankId }).course, { forceSnapshot: true });
  }

  function requestLinkedEdit({ entityId, usage, updated }) {
    if (!featureFlags.linkedQuestions) return;
    const usages = findLinkedUsages(courseRef.current.course_json, entityId);
    setPendingLinkedEdit({ entityId, usage, updated, usages });
  }

  function requestLinkedBlockEdit(usage, updated) {
    requestLinkedEdit({ entityId: usage.entityId, usage, updated });
  }

  function handleRequestLinkedQuestionEdit({ entityId, usage, question }) {
    requestLinkedEdit({ entityId, usage, updated: question });
  }

  function confirmLinkedEdit() {
    const pending = pendingLinkedEdit;
    if (!pending) return;
    updateCourseJson((json) => (
      pending.usage.kind === 'page'
        ? updateLinkedEntityFromBlock(json, pending.entityId, pending.updated)
        : updateLinkedEntityFromBankQuestion(json, pending.entityId, pending.updated)
    ), { forceSnapshot: true });
    setPendingLinkedEdit(null);
  }

  function detachLinkedEdit() {
    const pending = pendingLinkedEdit;
    if (!pending) return;
    updateCourseJson((json) => detachUsageWithUpdate(json, pending.usage, pending.updated), { forceSnapshot: true });
    setPendingLinkedEdit(null);
  }

  function requestLinkedDelete({ entityId, usage }) {
    setPendingLinkedDelete({ entityId, usage, usages: findLinkedUsages(courseRef.current.course_json, entityId) });
  }

  function handleRequestLinkedQuestionDelete({ entityId, usage }) {
    if (!featureFlags.linkedQuestions) return;
    requestLinkedDelete({ entityId, usage });
  }

  function unlinkDeletedUsage() {
    const pending = pendingLinkedDelete;
    if (!pending) return;
    updateCourseJson((json) => unlinkUsage(json, pending.usage), { forceSnapshot: true });
    if (pending.usage.kind === 'page') clearContextualSelection();
    setPendingLinkedDelete(null);
  }

  function deleteLinkedEntityEverywhere() {
    const pending = pendingLinkedDelete;
    if (!pending) return;
    updateCourseJson((json) => deleteEntityEverywhere(json, pending.entityId), { forceSnapshot: true });
    if (pending.usage.kind === 'page') clearContextualSelection();
    setPendingLinkedDelete(null);
  }

  function handleLinkBlockToBank(pageId, blockId, bankId) {
    if (!featureFlags.linkedQuestions) return;
    updateCourseJson((json) => linkBlockToBank(json, pageId, blockId, bankId).course, { forceSnapshot: true });
  }

  function handleReorderPages(pages, pageGroups) {
    updateCourseJson((json) => ({ ...json, pages: mergePagesPreservingLinked(json, pages), ...(pageGroups ? { meta: { ...json.meta, page_groups: pageGroups } } : {}) }), { forceSnapshot: true });
  }

  function handleReorderGroups(pageGroups) {
    updateCourseJson((json) => ({ ...json, meta: { ...json.meta, page_groups: pageGroups } }), { forceSnapshot: true });
  }

  function renameVariable(oldName, nextVariable) {
    function renameCondition(condition) {
      if (!condition) return condition;
      if (condition.all) return { all: condition.all.map(renameCondition) };
      if (condition.any) return { any: condition.any.map(renameCondition) };
      return condition.var === oldName ? { ...condition, var: nextVariable.name } : condition;
    }
    function renameBlocks(blocks) {
      return (blocks || []).map((block) => ({
        ...block,
        visibility_condition: block.visibility_condition ? renameCondition(block.visibility_condition) : block.visibility_condition,
        triggers: (block.triggers || []).map((trigger) => ({ ...trigger, condition: renameCondition(trigger.condition), actions: (trigger.actions || []).map((action) => (action.var === oldName ? { ...action, var: nextVariable.name } : action)) })),
        content: block.content?.items ? { ...block.content, items: block.content.items.map((item) => ({ ...item, body_blocks: renameBlocks(item.body_blocks) })) } : block.content,
        ...(block.left ? { left: renameBlocks([block.left])[0] } : {}),
        ...(block.right ? { right: renameBlocks([block.right])[0] } : {}),
      }));
    }
    updateCourseJson((json) => ({
      ...json,
      variables: (json.variables || []).map((variable) => (variable.name === oldName ? nextVariable : variable)),
      pages: (json.pages || []).map((page) => ({ ...page, continue_gate: renameCondition(page.continue_gate), triggers: (page.triggers || []).map((trigger) => ({ ...trigger, condition: renameCondition(trigger.condition), actions: (trigger.actions || []).map((action) => (action.var === oldName ? { ...action, var: nextVariable.name } : action)) })), blocks: renameBlocks(page.blocks) })),
    }), { forceSnapshot: true });
  }

  function handleChangePage(updatedPage, options) {
    updateCourseJson(
      (json) => ({
        ...json,
        pages: mergePagesPreservingLinked(json, json.pages.map((p) => (p.page_id === updatedPage.page_id ? updatedPage : p))),
      }),
      options
    );
  }

  // Deselects any selected block and jumps to the Variables tab -- used by
  // the "Open Variable Manager" shortcut link shown wherever a condition or
  // SET_VAR/ADJUST_VAR action has no variables to offer yet (Step 4).
  function openVariableManager() {
    clearContextualSelection();
    setActiveRailItem('variables');
  }

  // Course Health "click a finding, go to what it's about" (Phase 4.5c
  // Step 4). Variable/asset findings have no page/block location -- they
  // navigate to the Variables tab or Media Library instead, the same way
  // an author would go find that entity themselves. Block-scoped findings
  // switch to the block's own page, select it (which switches
  // drawer settings out of the course-level view into that block's
  // settings, same as clicking the block in the canvas would), and
  // scroll it into view -- selection alone doesn't guarantee visibility
  // if the block is below the fold or on a page that wasn't open yet.
  function handleNavigateToFinding(finding) {
    if (finding.entityType === 'variable') {
      clearContextualSelection();
      setActiveRailItem('variables');
      return;
    }
    if (finding.entityType === 'question_bank') {
      clearContextualSelection();
      setActiveRailItem('question-banks');
      return;
    }
    if (finding.entityType === 'asset') {
      clearContextualSelection();
      setShowMediaLibrary(true);
      return;
    }
    if (finding.entityType === 'resource') {
      clearContextualSelection();
      setActiveRailItem('player');
      return;
    }
    if (finding.entityType === 'module') {
      setSelectedBlockId(null);
      setActiveRailItem(null);
      setActivePageId((courseRef.current?.course_json?.pages || []).find((page) => page.page_id === finding.location?.page_id)?.page_id || activePageId);
      setContextualDrawer({ kind: 'module', id: finding.entityId });
      return;
    }
    if (finding.entityType === 'course') {
      clearContextualSelection();
      setActiveRailItem('course');
      return;
    }
    if (finding.location?.page_id) {
      setActivePageId(finding.location.page_id);
    }
    if (finding.location?.block_id) {
      handleSelectBlock(finding.location.block_id);
      // A timeout, not requestAnimationFrame, deliberately -- this only
      // needs to run after the selection re-render commits, and rAF
      // callbacks can be starved in some automated/headless browser
      // contexts (confirmed while testing this feature) where a timeout
      // still fires reliably.
      setTimeout(() => {
        document
          .querySelector(`[data-block-id="${finding.location.block_id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    } else if (finding.location?.page_id) {
      setSelectedBlockId(null);
      setActiveRailItem(null);
      setContextualDrawer({ kind: 'page', id: finding.location.page_id });
    } else {
      clearContextualSelection();
    }
  }

  function handleAddCourseAsset(assetEntry) {
    setUploadedAssetIds((current) => current ? [...new Set([...current, assetEntry.asset_id])] : current);
    updateCourseJson((json) => ({ ...json, assets: [...(json.assets || []), assetEntry] }));
  }

  function handleAddCourseAssets(assetEntries) {
    setUploadedAssetIds((current) => current ? [...new Set([...current, ...assetEntries.map((asset) => asset.asset_id)])] : current);
    updateCourseJson((json) => ({ ...json, assets: [...(json.assets || []), ...assetEntries] }));
  }

  function handleUpdateCourseAsset(assetId, patch) {
    updateCourseJson((json) => ({
      ...json,
      assets: (json.assets || []).map((a) => (a.asset_id === assetId ? { ...a, ...patch } : a)),
    }));
  }

  // Manually-attached course resources (Step 2, Phase 4 usability-fix
  // session) -- distinct from `assets` and stored under `meta.resources`,
  // not top-level, matching the schema shape the task specified. Each is a
  // discrete, deliberate author action (not a keystroke stream), so all
  // three get an explicit forceSnapshot the same way block/page-structure
  // actions do (ARCHITECTURE.md 3.9), guaranteeing attach/remove are each
  // their own undo step.
  async function handleAddCourseResource(file) {
    const formData = new FormData();
    formData.append('course_id', course.id);
    formData.append('file', file);
    const dbResource = await api.uploadResource(formData);
    const resourceEntry = {
      resource_id: dbResource.resource_id,
      filename: dbResource.filename,
      file_path: dbResource.file_path,
      label: dbResource.label,
      size_bytes: dbResource.size_bytes,
      uploaded_at: dbResource.created_at,
    };
    setUploadedResourceIds((current) => current ? [...new Set([...current, resourceEntry.resource_id])] : current);
    updateCourseJson(
      (json) => ({
        ...json,
        meta: { ...json.meta, resources: [...(json.meta.resources || []), resourceEntry] },
      }),
      { forceSnapshot: true }
    );
  }

  async function handleUpdateCourseResource(resourceId, label) {
    await api.updateResource(resourceId, { label });
    updateCourseJson(
      (json) => ({
        ...json,
        meta: {
          ...json.meta,
          resources: (json.meta.resources || []).map((r) => (r.resource_id === resourceId ? { ...r, label } : r)),
        },
      }),
      { forceSnapshot: true }
    );
  }

  async function handleRemoveCourseResource(resourceId) {
    await api.deleteResource(resourceId);
    updateCourseJson(
      (json) => ({
        ...json,
        meta: { ...json.meta, resources: (json.meta.resources || []).filter((r) => r.resource_id !== resourceId) },
      }),
      { forceSnapshot: true }
    );
  }

  async function handleTourComplete() {
    setShowTour(false);
    await api.updateMe({ onboarding_completed: true });
  }

  function handleBack() {
    if (saveStatus !== 'saved' && !window.confirm('You have unsaved changes. Leave anyway?')) {
      return;
    }
    navigate('/');
  }

  function activePage(json) {
    return json.pages.find((p) => p.page_id === activePageId);
  }

  function handleSelectPage(pageId) {
    dismissBlockSettingsHint();
    setActivePageId(pageId);
    clearContextualSelection();
    setActiveRailItem(null);
    setContextualDrawer({ kind: 'page', id: pageId });
  }

  async function refreshComments() {
    setComments(await api.listComments(courseRef.current?.id || course.id));
  }

  async function handleCreateComment(payload) {
    setCommentsError(null);
    try {
      await api.createComment(course.id, payload);
      await refreshComments();
    } catch (error) {
      setCommentsError(error?.response?.data?.error || error.message || 'Comment could not be created.');
      throw error;
    }
  }

  async function handleReplyComment(commentId, body) {
    setCommentsError(null);
    try {
      await api.createCommentReply(course.id, commentId, { body });
      await refreshComments();
    } catch (error) {
      setCommentsError(error?.response?.data?.error || error.message || 'Reply could not be created.');
      throw error;
    }
  }

  async function handleUpdateCommentStatus(commentId, status) {
    setCommentsError(null);
    try {
      await api.updateCommentStatus(course.id, commentId, status);
      await refreshComments();
    } catch (error) {
      setCommentsError(error?.response?.data?.error || error.message || 'Comment status could not be updated.');
    }
  }

  async function handleEditComment(commentId, body) {
    setCommentsError(null);
    try {
      await api.updateComment(course.id, commentId, { body });
      await refreshComments();
    } catch (error) {
      setCommentsError(error?.response?.data?.error || error.message || 'Comment could not be updated.');
      throw error;
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('Delete this comment and its replies?')) return;
    setCommentsError(null);
    try {
      await api.deleteComment(course.id, commentId);
      await refreshComments();
    } catch (error) {
      setCommentsError(error?.response?.data?.error || error.message || 'Comment could not be deleted.');
    }
  }

  function handleOpenCommentsForBlock(blockId) {
    const currentPage = courseRef.current?.course_json?.pages?.find((candidate) => candidate.page_id === activePageId);
    const block = currentPage?.blocks?.find((candidate) => candidate.block_id === blockId);
    setCommentAnchor({ blockId, pageId: activePageId, fallbackLabel: block?.label || `${block?.type || 'Block'} block` });
    setSelectedBlockId(null);
    setContextualDrawer(null);
    setActiveRailItem('comments');
  }

  function handleNavigateToComment(comment) {
    setCommentAnchor(null);
    setActiveRailItem(null);
    if (comment.page_id) setActivePageId(comment.page_id);
    if (comment.block_id) {
      handleSelectBlock(comment.block_id);
      setTimeout(() => {
        document.querySelector(`[data-block-id="${comment.block_id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }
    if (comment.page_id) {
      setSelectedBlockId(null);
      setContextualDrawer({ kind: 'page', id: comment.page_id });
    }
  }

  function handleSelectGroup(groupId) {
    dismissBlockSettingsHint();
    setSelectedBlockId(null);
    setActiveRailItem(null);
    setContextualDrawer({ kind: 'module', id: groupId });
  }

  function handleAddPage() {
    const newPage = { page_id: genPageId(), title: `Page ${course.course_json.pages.length + 1}`, blocks: [] };
    updateCourseJson((json) => ({ ...json, pages: [...json.pages, newPage] }), { forceSnapshot: true });
    setActivePageId(newPage.page_id);
  }

  function handleRenamePage(pageId, title) {
    updateCourseJson(
      (json) => ({
        ...json,
        pages: json.pages.map((p) => (p.page_id === pageId ? { ...p, title } : p)),
      }),
      { forceSnapshot: true }
    );
  }

  function handleDuplicatePage(pageId) {
    let duplicatedPageId = null;
    updateCourseJson(
      (json) => {
        const sourceIndex = json.pages.findIndex((page) => page.page_id === pageId);
        if (sourceIndex === -1) return json;
        const sourcePage = json.pages[sourceIndex];
        const duplicatedPage = regeneratePageIds({ ...sourcePage, title: `${sourcePage.title} (Copy)` });
        duplicatedPageId = duplicatedPage.page_id;
        const pages = [...json.pages];
        pages.splice(sourceIndex + 1, 0, duplicatedPage);
        const sourceGroup = (json.meta?.page_groups || []).find((group) => (group.page_ids || []).includes(pageId));
        const meta = sourceGroup
          ? {
            ...json.meta,
            page_groups: json.meta.page_groups.map((group) => (
              group.group_id === sourceGroup.group_id
                ? { ...group, page_ids: [...(group.page_ids || []), duplicatedPageId] }
                : group
            )),
          }
          : json.meta;
        return { ...json, pages, meta };
      },
      { forceSnapshot: true }
    );
    if (duplicatedPageId) setActivePageId(duplicatedPageId);
  }

  // Inserts a copy of a saved page template right after the current page.
  // Structural, so it forces its own undo/redo snapshot like Add Page does.
  function handleInsertPageFromTemplate(template) {
    const newPage = regeneratePageIds(template.page_json);
    updateCourseJson(
      (json) => {
        const index = json.pages.findIndex((p) => p.page_id === activePageId);
        const pages = [...json.pages];
        pages.splice(index === -1 ? pages.length : index + 1, 0, newPage);
        return { ...json, pages };
      },
      { forceSnapshot: true }
    );
    setActivePageId(newPage.page_id);
    setShowInsertFromTemplate(false);
  }

  function handleDeletePage(pageId) {
    if (!window.confirm('Delete this page and all its blocks?')) return;
    updateCourseJson(
      (json) => {
        const pages = json.pages.filter((p) => p.page_id !== pageId);
        if (activePageId === pageId) setActivePageId(pages[0]?.page_id || null);
        return { ...json, pages };
      },
      { forceSnapshot: true }
    );
  }

  function handleChangeBlock(blockId, updatedBlock, options) {
    const currentPage = courseRef.current.course_json.pages.find((candidate) => candidate.page_id === activePageId);
    const currentBlock = currentPage?.blocks.find((block) => block.block_id === blockId);
    if (currentBlock?.linked_entity_id) {
      requestLinkedBlockEdit({ kind: 'page', page_id: activePageId, block_id: blockId, entityId: currentBlock.linked_entity_id }, updatedBlock);
      return;
    }
    updateCourseJson(
      (json) => ({
        ...json,
        pages: mergePagesPreservingLinked(json, json.pages.map((p) =>
          p.page_id !== activePageId ? p : { ...p, blocks: p.blocks.map((b) => (b.block_id === blockId ? updatedBlock : b)) }
        )),
      }),
      options
    );
  }

  function genId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Shared by "Copy to page" (single block) and "Insert from template"
  // (a whole page's worth of blocks): walks one block's own subtree,
  // minting a new block_id for everything found (two-column slots keep the
  // parent-namespaced convention, e.g. "blk_xyz_left" -- see DECISIONS.md).
  // Kept separate from rebuildBlockWithIds below so a whole-page insert can
  // assign ids for every block on the page into ONE shared map before
  // rebuilding any of them -- necessary because a trigger on one block can
  // target another block on the same page, not just itself.
  function assignBlockIds(b, idMap) {
    const newId = genId('blk');
    idMap.set(b.block_id, newId);
    if (b.type === 'two_column') {
      if (b.left) idMap.set(b.left.block_id, `${newId}_left`);
      if (b.right) idMap.set(b.right.block_id, `${newId}_right`);
    }
    if (b.content?.items) {
      b.content.items.forEach((item) => {
        if (item && typeof item === 'object' && item.body_blocks) {
          item.body_blocks.forEach((child) => assignBlockIds(child, idMap));
        }
      });
    }
  }

  // A copied block is a new authoring entity. Remint every repeated nested
  // entity alongside block_id/trigger_id so copied questions/cards/items do
  // not share answer-state or future dependency references with the source.
  function rebuildNestedContentWithIds(content, type, rebuildChild) {
    if (!content || typeof content !== 'object') return content;
    let next = { ...content };
    if (Array.isArray(content.options) && type === 'knowledge-check') {
      const optionIds = new Map();
      next.options = content.options.map((option) => {
        const nextId = genOptionId();
        optionIds.set(option.id, nextId);
        return {
          ...option,
          id: nextId,
          ...(option.feedback ? { feedback: { ...option.feedback, feedback_id: genFeedbackId() } } : {}),
        };
      });
      if (typeof content.correct_option_id === 'string') next.correct_option_id = optionIds.get(content.correct_option_id) || content.correct_option_id;
      if (Array.isArray(content.correct_option_ids)) next.correct_option_ids = content.correct_option_ids.map((id) => optionIds.get(id) || id);
    }
    if (Array.isArray(content.items) && (type === 'accordion' || type === 'tabs' || type === 'ordering')) {
      next.items = content.items.map((item) => ({
        ...item,
        item_id: type === 'ordering' ? genOrderingItemId() : genItemId(),
        ...(Array.isArray(item.body_blocks) ? { body_blocks: item.body_blocks.map(rebuildChild) } : {}),
      }));
    }
    if (Array.isArray(content.cards) && type === 'flashcards') {
      next.cards = content.cards.map((card) => ({ ...card, card_id: genCardId() }));
    }
    if (Array.isArray(content.prompts) && type === 'matching') {
      const optionIds = new Map((content.options || []).map((option) => [option.option_id, genMatchingOptionId()]));
      next.prompts = content.prompts.map((prompt) => ({
        ...prompt,
        prompt_id: genMatchingPromptId(),
        correct_option_id: optionIds.get(prompt.correct_option_id) || prompt.correct_option_id,
      }));
      next.options = (content.options || []).map((option) => ({ ...option, option_id: optionIds.get(option.option_id) || genMatchingOptionId() }));
    }
    if (Array.isArray(content.regions) && type === 'hotspot') {
      next.regions = content.regions.map((region) => ({ ...region, region_id: genHotspotRegionId() }));
    }
    return next;
  }

  // Rebuilds a block using a previously-populated idMap: applies the new
  // block_id, regenerates trigger_ids, and rewrites any action target that
  // matches an old id in idMap. Targets not in idMap (another block that
  // isn't part of this copy) are left alone -- there is no copy of that
  // block to point to instead.
  function rebuildBlockWithIds(b, idMap) {
    const next = { ...b, block_id: idMap.get(b.block_id) };
    if (next.triggers) {
      next.triggers = next.triggers.map((t) => ({
        ...t,
        trigger_id: genId('trg'),
        actions: t.actions.map((a) => (a.target && idMap.has(a.target) ? { ...a, target: idMap.get(a.target) } : a)),
      }));
    }
    if (next.left) next.left = rebuildBlockWithIds(next.left, idMap);
    if (next.right) next.right = rebuildBlockWithIds(next.right, idMap);
    if (Object.prototype.hasOwnProperty.call(next, 'content')) {
      next.content = rebuildNestedContentWithIds(next.content, next.type, (child) => rebuildBlockWithIds(child, idMap));
    }
    return next;
  }

  function deepCopyBlock(block) {
    const idMap = new Map();
    assignBlockIds(block, idMap);
    return rebuildBlockWithIds(block, idMap);
  }

  // Regenerates every block_id (and trigger_id) on a page-template's
  // blocks in one shared idMap, plus a fresh page_id -- used by "Insert
  // from template" so an inserted copy never collides with ids already
  // present in the course (including a second insert of the same
  // template).
  function regeneratePageIds(pageShape) {
    const idMap = new Map();
    pageShape.blocks.forEach((b) => assignBlockIds(b, idMap));
    const newPageId = genPageId();
    const targetMap = new Map([...idMap, [pageShape.page_id, newPageId]]);
    return {
      ...pageShape,
      page_id: newPageId,
      triggers: (pageShape.triggers || []).map((trigger) => ({
        ...trigger,
        trigger_id: genId('trg'),
        actions: (trigger.actions || []).map((action) => (
          action.target && targetMap.has(action.target) ? { ...action, target: targetMap.get(action.target) } : action
        )),
      })),
      blocks: pageShape.blocks.map((b) => rebuildBlockWithIds(b, idMap)),
    };
  }

  function handleMoveBlockToPage(blockId, targetPageId) {
    updateCourseJson(
      (json) => {
        let movedBlock = null;
        const pages = json.pages.map((p) => {
          if (p.page_id !== activePageId) return p;
          movedBlock = p.blocks.find((b) => b.block_id === blockId);
          return { ...p, blocks: p.blocks.filter((b) => b.block_id !== blockId) };
        });
        if (!movedBlock) return json;
        return {
          ...json,
          pages: pages.map((p) => (p.page_id !== targetPageId ? p : { ...p, blocks: [...p.blocks, movedBlock] })),
        };
      },
      { forceSnapshot: true }
    );
    clearContextualSelection();
    setActiveRailItem(null);
  }

  function handleCopyBlockToPage(blockId, targetPageId) {
    updateCourseJson(
      (json) => {
        const sourcePage = json.pages.find((p) => p.page_id === activePageId);
        const original = sourcePage?.blocks.find((b) => b.block_id === blockId);
        if (!original) return json;
        const copy = deepCopyBlock(original);
        return {
          ...json,
          pages: json.pages.map((p) => (p.page_id !== targetPageId ? p : { ...p, blocks: [...p.blocks, copy] })),
        };
      },
      { forceSnapshot: true }
    );
  }

  function regenerateIds(block) {
    const newBlock = { ...block, block_id: `blk_${Math.random().toString(36).slice(2, 8)}` };
    if (newBlock.triggers) {
      newBlock.triggers = newBlock.triggers.map((t) => ({ ...t, trigger_id: `trg_${Math.random().toString(36).slice(2, 8)}` }));
    }
    if (Object.prototype.hasOwnProperty.call(newBlock, 'content')) {
      newBlock.content = rebuildNestedContentWithIds(newBlock.content, newBlock.type, regenerateIds);
    }
    return newBlock;
  }

  function handleDuplicateBlock(blockId) {
    updateCourseJson(
      (json) => ({
        ...json,
        pages: json.pages.map((p) => {
          if (p.page_id !== activePageId) return p;
          const index = p.blocks.findIndex((b) => b.block_id === blockId);
          const clone = regenerateIds(p.blocks[index]);
          const blocks = [...p.blocks];
          blocks.splice(index + 1, 0, clone);
          return { ...p, blocks };
        }),
      }),
      { forceSnapshot: true }
    );
  }

  function handleDeleteBlock(blockId) {
    const currentPage = courseRef.current.course_json.pages.find((candidate) => candidate.page_id === activePageId);
    const currentBlock = currentPage?.blocks.find((block) => block.block_id === blockId);
    if (currentBlock?.linked_entity_id) {
      requestLinkedDelete({
        entityId: currentBlock.linked_entity_id,
        usage: { kind: 'page', page_id: activePageId, block_id: blockId, entityId: currentBlock.linked_entity_id },
      });
      return;
    }
    updateCourseJson(
      (json) => ({
        ...json,
        pages: json.pages.map((p) => (p.page_id !== activePageId ? p : { ...p, blocks: p.blocks.filter((b) => b.block_id !== blockId) })),
      }),
      { forceSnapshot: true }
    );
    if (selectedBlockId === blockId) clearContextualSelection();
  }

  // insertIndex (Phase 4.6 Step 3): omitted/undefined appends at the end,
  // exactly like before -- the bottom "+ Add Block" control still calls
  // this with no index. A between-block "+" passes the exact position to
  // splice into, so the new block lands where the author clicked, not at
  // the bottom of the page.
  function handleAddBlock(newBlock, insertIndex) {
    updateCourseJson(
      (json) => ({
        ...json,
        pages: json.pages.map((p) => {
          if (p.page_id !== activePageId) return p;
          const blocks = [...p.blocks];
          const index = insertIndex == null ? blocks.length : insertIndex;
          blocks.splice(index, 0, newBlock);
          return { ...p, blocks };
        }),
      }),
      { forceSnapshot: true }
    );
    handleSelectBlock(newBlock.block_id);
    // Focus the new block's primary editable field once it's rendered --
    // a generic "first focusable thing inside this block" query rather
    // than per-block-type wiring, since it correctly reaches the common
    // case (a contentEditable field) for most types and a sensible
    // fallback (the upload zone) for media types. Same deferred-timeout
    // pattern as handleNavigateToFinding's scroll-into-view, for the same
    // reason: needs to run after the selection/insertion re-render commits.
    setTimeout(() => {
      const wrapper = document.querySelector(`[data-block-id="${newBlock.block_id}"]`);
      wrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Scoped to .block-wrapper__content specifically, not the whole
      // wrapper -- the wrapper also contains the block's own toolbar
      // (drag handle, move/copy/duplicate/delete buttons), which sits
      // earlier in DOM order than the actual content and would otherwise
      // win a document-order querySelector, focusing "Delete" instead of
      // the block's own editable field. contentEditable is tried first and
      // separately from the input/textarea/button/select fallback -- a
      // rich-text block's own formatting toolbar (B/I/U buttons) also
      // sits before its EditableRichField in DOM order, so a single
      // combined selector would win on the wrong element the same way.
      const content = wrapper?.querySelector('.block-wrapper__content');
      const primaryField =
        content?.querySelector('[contenteditable="true"]') ||
        content?.querySelector('input, textarea, button, select');
      primaryField?.focus();
    }, 0);
  }

  function handleReorderBlocks(newBlocks) {
    updateCourseJson(
      (json) => ({
        ...json,
        pages: mergePagesPreservingLinked(json, json.pages.map((p) => (p.page_id !== activePageId ? p : { ...p, blocks: newBlocks }))),
      }),
      { forceSnapshot: true }
    );
    saveNow();
  }

  // Phase 4.5c: recomputed on every course_json change rather than
  // debounced to save or gated behind opening the panel -- analyzeCourse
  // is a handful of array walks over a small in-memory document, cheap
  // enough that "always accurate" costs nothing noticeable, and it's what
  // lets the top-bar issue badge stay correct without its own separate
  // trigger. See DECISIONS.md.
  const findings = useMemo(
    () => analyzeCourse(materializeLinkedEntities(course?.course_json), { assetMetadataById, uploadedAssetIds, uploadedResourceIds }),
    [course?.course_json, assetMetadataById, uploadedAssetIds, uploadedResourceIds]
  );

  if (!course) return null;

  const json = materializeLinkedEntities(course.course_json);
  const page = activePage(json);
  const selectedBlock = page?.blocks.find((b) => b.block_id === selectedBlockId) || null;

  const saveLabel = { saved: 'Saved ✓', saving: 'Saving...', unsaved: 'Unsaved changes' }[saveStatus];
  const errorFindingCount = findings.filter((f) => f.severity === 'error').length;
  const warningFindingCount = findings.filter((f) => f.severity === 'warning').length;
  const commentCounts = comments.reduce((counts, comment) => {
    if (comment.block_id) counts[comment.block_id] = (counts[comment.block_id] || 0) + 1;
    return counts;
  }, {});
  const defaultCommentAnchor = page ? { pageId: page.page_id, fallbackLabel: page.title || 'Untitled page' } : null;
  const healthBadgeLabel = [
    errorFindingCount ? `${errorFindingCount} error${errorFindingCount === 1 ? '' : 's'}` : '',
    warningFindingCount ? `${warningFindingCount} warning${warningFindingCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(', ');

  return (
    <div className={isReviewer ? 'course-editor course-editor--read-only' : 'course-editor'}>
      <header className="top-bar course-editor__top-bar">
        <div className="course-editor__top-bar-left">
          <button className="btn-text course-editor__back-button" onClick={handleBack} aria-label="Back to course library" title="Back to course library">
          ←
          </button>
        {editingTitle ? (
          <input
            className="input course-editor__title-input"
            autoFocus
            value={json.meta?.title || ''}
            onChange={(e) => handleChangeMeta({ ...json.meta, title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
          />
        ) : (
          <h1
            className="course-editor__title"
            title={json.meta?.title || 'Untitled Course'}
            onClick={() => canEdit && setEditingTitle(true)}
          >
            {json.meta?.title || 'Untitled Course'}
          </h1>
        )}
        <TopBarDivider />
        {canEdit && <div className="course-editor__history-controls">
          <button
            className="btn-text"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Cmd+Z)"
          >
            <UndoIcon />
          </button>
          <button
            className="btn-text"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Cmd+Shift+Z)"
          >
            <RedoIcon />
          </button>
        </div>}
        <TopBarDivider />
        </div>

        <div className="course-editor__top-bar-tools">
        <button
          type="button"
          className="btn course-editor__preview-button"
          data-tour="preview-toggle"
          onClick={() => {
            saveNow();
            setPreviewMode((current) => current || 'desktop');
          }}
        >
          <EyeIcon />
          Preview
        </button>

        <button
          type="button"
          className={focusMode ? 'btn-text course-editor__icon-button course-editor__icon-button--active' : 'btn-text course-editor__icon-button'}
          onClick={() => setFocusMode((v) => !v)}
          aria-pressed={focusMode}
          aria-label="Focus mode"
          title="Focus mode"
        >
          <FocusIcon />
        </button>

        <MoreToolsMenu
          dataTour="more-tools"
          iconOnly
          ariaLabel="More tools"
          icon={<MoreIcon />}
          items={[
            { label: 'Image Library', onClick: () => setShowMediaLibrary(true) },
            canEdit && { label: 'Save as Template', onClick: () => setShowSaveTemplate(true) },
            canEdit && { label: 'Export Worksheet', onClick: handleExportWorksheet },
            canEdit && featureFlags.versionHistory && { label: 'Version History', onClick: openVersionHistory },
            course.is_template && {
              label: showExportSaving ? 'Saving before export...' : 'Export Word',
              onClick: handleExportWord,
              disabled: showExportSaving,
            },
          ]}
        />
        </div>

        <div className="course-editor__top-bar-right">
        {findings.length > 0 && (
          <button
            type="button"
            className={
              errorFindingCount > 0
                ? 'course-editor__health-badge course-editor__health-badge--error'
                : 'course-editor__health-badge course-editor__health-badge--warning'
            }
            onClick={() => {
              clearContextualSelection();
              setActiveRailItem(null);
              setActiveRailItem('course-health');
            }}
            title="Open Course Health"
          >
            ⚠ {healthBadgeLabel}
          </button>
        )}

        <span className="course-editor__save-status" data-status={saveStatus} data-tour="save-status">
          {saveLabel}
        </span>
        <TopBarDivider />
        {canEdit && <button className="btn btn-primary course-editor__publish-button" onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish'}
        </button>}
        </div>
      </header>

      {publishNotice && (
        <div className={`course-editor__publish-notice course-editor__publish-notice--${publishNotice.type}`}>
          {publishNotice.message}
        </div>
      )}

      {showTour && <OnboardingTour onComplete={handleTourComplete} />}

      {featureFlags.versionHistory && showVersionHistory && (
        <VersionHistoryModal
          versions={courseVersions}
          loading={versionHistoryLoading}
          error={versionHistoryError}
          onSave={handleSaveVersion}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {showSaveTemplate && (
        <SaveAsTemplateModal courseTitle={json.meta?.title || course.title} courseId={course.id} onClose={() => setShowSaveTemplate(false)} />
      )}

      {pageToSaveAsTemplate && (
        <SavePageAsTemplateModal page={pageToSaveAsTemplate} onClose={() => setPageToSaveAsTemplate(null)} />
      )}

      {showInsertFromTemplate && (
        <PageTemplateGalleryModal
          onInsert={handleInsertPageFromTemplate}
          onClose={() => setShowInsertFromTemplate(false)}
        />
      )}

      {showMediaLibrary && (
        <MediaLibraryPanel
          courseId={course.id}
          courseAssets={json.assets}
          onAddCourseAssets={handleAddCourseAssets}
          onUpdateCourseAsset={handleUpdateCourseAsset}
          onClose={() => setShowMediaLibrary(false)}
          getAssetDependents={(assetId) => getDependents(assetId, json)}
        />
      )}

      {showAltTextReview && (
        <BulkAltTextReview
          assets={json.assets}
          onUpdateCourseAsset={handleUpdateCourseAsset}
          onClose={() => setShowAltTextReview(false)}
        />
      )}

      {featureFlags.linkedQuestions && pendingLinkedEdit && (
        <LinkedEntityPrompt
          mode="edit"
          usages={pendingLinkedEdit.usages}
          onConfirm={confirmLinkedEdit}
          onDetach={detachLinkedEdit}
          onCancel={() => setPendingLinkedEdit(null)}
          featureFlags={featureFlags}
        />
      )}

      {featureFlags.linkedQuestions && pendingLinkedDelete && (
        <LinkedEntityPrompt
          mode="delete"
          usages={pendingLinkedDelete.usages}
          onConfirm={deleteLinkedEntityEverywhere}
          onDetach={unlinkDeletedUsage}
          onCancel={() => setPendingLinkedDelete(null)}
          featureFlags={featureFlags}
        />
      )}

      <div
        className={
          'course-editor__body' +
          (effectiveLeftCollapsed ? ' course-editor__body--left-collapsed' : '')
        }
      >
        <nav className="course-editor__left-panel" data-tour="page-list">
          <button
            type="button"
            className="course-editor__panel-toggle course-editor__panel-toggle--left"
            onClick={() => setLeftPanelCollapsed((v) => !v)}
            disabled={focusMode}
            aria-expanded={!effectiveLeftCollapsed}
            aria-label={effectiveLeftCollapsed ? 'Expand page list panel' : 'Collapse page list panel'}
            title={effectiveLeftCollapsed ? 'Expand page list' : 'Collapse page list'}
          >
            {effectiveLeftCollapsed ? '▶' : '◀'}
          </button>
          {!effectiveLeftCollapsed && (
            <PageList
              pages={json.pages}
              meta={json.meta}
              courseJson={course.course_json}
              onChangeMeta={handleChangeMeta}
              activePageId={activePageId}
              onSelectPage={handleSelectPage}
              onSelectGroup={handleSelectGroup}
              onAddPage={handleAddPage}
              onRenamePage={handleRenamePage}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              onSaveAsPageTemplate={setPageToSaveAsTemplate}
              onInsertFromTemplate={() => setShowInsertFromTemplate(true)}
              onReorderPages={handleReorderPages}
              onReorderGroups={handleReorderGroups}
            />
          )}
        </nav>

        <main className="course-editor__center-panel">
          {previewMode ? (
            <div className="preview-frame-container">
              <div className="preview-frame-container__toolbar">
                <div className="preview-frame-container__widths">
                  {['phone', 'tablet', 'desktop'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={previewMode === m ? 'btn btn-primary' : 'btn'}
                      onClick={() => setPreviewMode(m)}
                      aria-pressed={previewMode === m}
                    >
                      {m[0].toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
                <button className="btn preview-frame-container__close" onClick={() => setPreviewMode(null)}>
                  Close Preview
                </button>
              </div>
              <iframe
                key={previewMode}
                title="Course preview"
                className="preview-frame-container__iframe"
                style={{ width: PREVIEW_WIDTHS[previewMode] }}
                src={`/player?courseId=${course.id}&preview=true`}
              />
            </div>
          ) : (
            page && (
              <BlockCanvas
                page={page}
                pages={json.pages}
                variables={json.variables || []}
                assets={json.assets}
                courseId={course.id}
                onAddCourseAsset={handleAddCourseAsset}
                onAddCourseAssets={handleAddCourseAssets}
                onUpdateCourseAsset={handleUpdateCourseAsset}
                selectedBlockId={selectedBlockId}
                onSelectBlock={handleSelectBlock}
                onOpenBlockSettings={handleOpenBlockSettings}
                showSettingsHint={showBlockSettingsHint}
                onDismissSettingsHint={dismissBlockSettingsHint}
                onChangeBlock={handleChangeBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleDeleteBlock}
                onAddBlock={handleAddBlock}
                onReorderBlocks={handleReorderBlocks}
                onMoveBlockToPage={handleMoveBlockToPage}
                onCopyBlockToPage={handleCopyBlockToPage}
                questionBanks={json.question_banks || []}
                onLinkBlockToBank={handleLinkBlockToBank}
                commentCounts={commentCounts}
                onOpenComments={handleOpenCommentsForBlock}
                featureFlags={featureFlags}
              />
            )
          )}
        </main>

      </div>

      <EditorDrawerShell
        activeRailItem={activeRailItem}
        contextualDrawer={contextualDrawer}
        featureFlags={featureFlags}
        onRailItemClick={handleRailItemClick}
        onCloseDrawer={handleCloseDrawer}
        drawerContent={(
          <DrawerSettingsContent
            drawer={activeRailItem || contextualDrawer?.kind}
            contextId={contextualDrawer?.id}
            courseId={course.id}
            canManageShareLinks={canEdit}
            published={course.status === 'published'}
            meta={json.meta}
            page={page}
            pages={json.pages}
            variables={json.variables || []}
            questionBanks={json.question_banks || []}
            courseJson={course.course_json}
            onChangeMeta={handleChangeMeta}
            onChangePage={handleChangePage}
            onChangeVariables={handleChangeVariables}
            onRenameVariable={renameVariable}
            onChangeQuestionBanks={handleChangeQuestionBanks}
            onImportBank={handleImportBank}
            onLinkBlockToBank={handleLinkBlockToBank}
            onRequestLinkedQuestionEdit={handleRequestLinkedQuestionEdit}
            onRequestLinkedQuestionDelete={handleRequestLinkedQuestionDelete}
            selectedBlock={selectedBlock}
            onChangeBlock={selectedBlock ? (updated, options) => handleChangeBlock(selectedBlock.block_id, updated, options) : undefined}
            assets={json.assets}
            onUpdateCourseAsset={handleUpdateCourseAsset}
            onAddCourseAssets={handleAddCourseAssets}
            onAddCourseResource={handleAddCourseResource}
            onRemoveCourseResource={handleRemoveCourseResource}
            onUpdateCourseResource={handleUpdateCourseResource}
            onOpenVariableManager={openVariableManager}
            findings={findings}
            onNavigateToFinding={handleNavigateToFinding}
            onOpenAltTextReview={() => setShowAltTextReview(true)}
            comments={comments}
            commentAnchor={commentAnchor}
            defaultCommentAnchor={defaultCommentAnchor}
            currentUserId={user?.id}
            currentRole={role}
            commentsLoading={commentsLoading}
            commentsError={commentsError}
            onCreateComment={handleCreateComment}
            onReplyComment={handleReplyComment}
            onUpdateCommentStatus={handleUpdateCommentStatus}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onNavigateToComment={handleNavigateToComment}
            libraryGlossaries={libraryGlossaries}
            libraryGlossaryTerms={libraryGlossaryTerms}
            onChangeGlossaryTerms={handleChangeGlossaryTerms}
            onCreateGlossary={handleCreateGlossary}
            onPublishGlossaryTerm={handlePublishGlossaryTerm}
            onApplyGlossarySuggestion={handleApplyGlossarySuggestion}
            featureFlags={featureFlags}
          />
        )}
      />
    </div>
  );
}

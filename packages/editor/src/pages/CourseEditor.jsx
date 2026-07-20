import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import { genPageId } from '../lib/idGen.js';
import PageList from '../components/PageList.jsx';
import BlockCanvas from '../components/BlockCanvas.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import SaveAsTemplateModal from '../components/SaveAsTemplateModal.jsx';
import SavePageAsTemplateModal from '../components/SavePageAsTemplateModal.jsx';
import PageTemplateGalleryModal from '../components/PageTemplateGalleryModal.jsx';
import MediaLibraryPanel from '../components/MediaLibraryPanel.jsx';
import BulkAltTextReview from '../components/BulkAltTextReview.jsx';
import OnboardingTour from '../components/OnboardingTour.jsx';
import MoreToolsMenu from '../components/MoreToolsMenu.jsx';
import { getDependents } from '@mnemonify/schema/dependency-index.js';
import { analyzeCourse } from '@mnemonify/schema/analyzer/index.js';
import '../styles/courseEditor.css';

const AUTOSAVE_DELAY_MS = 5000;
const PREVIEW_WIDTHS = { phone: '375px', tablet: '768px', desktop: '100%' };

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

export default function CourseEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [activePageId, setActivePageId] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
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
  const [settingsTab, setSettingsTab] = useState('Course');
  const [publishing, setPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState(null);

  // Phase 4.6 Step 2: panel collapse + Focus Mode. Deliberately plain
  // useState, entirely separate from the undo/redo system below -- this is
  // view state (what the author is currently looking at), not document
  // state (what the course contains). Toggling a panel or Focus Mode must
  // never push an undo snapshot and must never itself be undoable; see
  // DECISIONS.md. Session-level only (resets on reload), per this step's
  // own "doesn't need to persist across sessions" allowance.
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const effectiveLeftCollapsed = leftPanelCollapsed || focusMode;
  const effectiveRightCollapsed = rightPanelCollapsed || focusMode;

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
    api.getCourse(id).then((c) => {
      setCourse(c);
      setActivePageId(c.course_json.pages?.[0]?.page_id || null);
    });
  }, [id]);

  useEffect(() => {
    courseRef.current = course;
  }, [course]);

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
    } catch (err) {
      console.error('[course-editor] autosave failed:', err);
      setSaveStatus('unsaved');
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
    await saveNow();
    const freshFindings = analyzeCourse(courseRef.current.course_json);
    const errorFindings = freshFindings.filter((f) => f.severity === 'error');
    if (errorFindings.length > 0) {
      setSelectedBlockId(null);
      setSettingsTab('Course Health');
      setPublishNotice({
        type: 'error',
        message: `Cannot publish: ${errorFindings.length} error${errorFindings.length === 1 ? '' : 's'} must be fixed first.`,
      });
      return;
    }
    setPublishing(true);
    try {
      const updated = await api.updateCourse(course.id, { status: 'published' });
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

  function handleChangePage(updatedPage, options) {
    updateCourseJson(
      (json) => ({
        ...json,
        pages: json.pages.map((p) => (p.page_id === updatedPage.page_id ? updatedPage : p)),
      }),
      options
    );
  }

  // Deselects any selected block and jumps to the Variables tab -- used by
  // the "Open Variable Manager" shortcut link shown wherever a condition or
  // SET_VAR/ADJUST_VAR action has no variables to offer yet (Step 4).
  function openVariableManager() {
    setSelectedBlockId(null);
    setSettingsTab('Variables');
  }

  // Course Health "click a finding, go to what it's about" (Phase 4.5c
  // Step 4). Variable/asset findings have no page/block location -- they
  // navigate to the Variables tab or Media Library instead, the same way
  // an author would go find that entity themselves. Block-scoped findings
  // switch to the block's own page, select it (which switches
  // SettingsPanel out of the tabbed course-level view into that block's
  // settings, same as clicking the block in the canvas would), and
  // scroll it into view -- selection alone doesn't guarantee visibility
  // if the block is below the fold or on a page that wasn't open yet.
  function handleNavigateToFinding(finding) {
    if (finding.entityType === 'variable') {
      setSelectedBlockId(null);
      setSettingsTab('Variables');
      return;
    }
    if (finding.entityType === 'asset') {
      setShowMediaLibrary(true);
      return;
    }
    if (finding.location?.page_id) {
      setActivePageId(finding.location.page_id);
    }
    if (finding.location?.block_id) {
      setSelectedBlockId(finding.location.block_id);
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
    } else {
      setSelectedBlockId(null);
    }
  }

  function handleAddCourseAsset(assetEntry) {
    updateCourseJson((json) => ({ ...json, assets: [...(json.assets || []), assetEntry] }));
  }

  function handleAddCourseAssets(assetEntries) {
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
    setActivePageId(pageId);
    setSelectedBlockId(null);
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
    updateCourseJson(
      (json) => ({
        ...json,
        pages: json.pages.map((p) =>
          p.page_id !== activePageId ? p : { ...p, blocks: p.blocks.map((b) => (b.block_id === blockId ? updatedBlock : b)) }
        ),
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
    if (next.content?.items) {
      next.content = {
        ...next.content,
        items: next.content.items.map((item) =>
          item && typeof item === 'object' && item.body_blocks
            ? {
                ...item,
                // Fresh item_id on every copy (never carried over), same as
                // block_id/trigger_id above -- keeps item_id globally unique
                // per DATA-MODEL.md 19. Items copied from pre-migration data
                // with no item_id yet stay unset; the migration assigns one.
                ...(item.item_id ? { item_id: genId('itm') } : {}),
                body_blocks: item.body_blocks.map((child) => rebuildBlockWithIds(child, idMap)),
              }
            : item
        ),
      };
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
    return {
      ...pageShape,
      page_id: genPageId(),
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
    setSelectedBlockId(null);
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
    if (newBlock.content?.items) {
      newBlock.content = {
        ...newBlock.content,
        items: newBlock.content.items.map((item) =>
          item && typeof item === 'object' && item.body_blocks
            ? {
                ...item,
                ...(item.item_id ? { item_id: `itm_${Math.random().toString(36).slice(2, 8)}` } : {}),
                body_blocks: item.body_blocks.map(regenerateIds),
              }
            : item
        ),
      };
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
    updateCourseJson(
      (json) => ({
        ...json,
        pages: json.pages.map((p) => (p.page_id !== activePageId ? p : { ...p, blocks: p.blocks.filter((b) => b.block_id !== blockId) })),
      }),
      { forceSnapshot: true }
    );
    if (selectedBlockId === blockId) setSelectedBlockId(null);
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
    setSelectedBlockId(newBlock.block_id);
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
        pages: json.pages.map((p) => (p.page_id !== activePageId ? p : { ...p, blocks: newBlocks })),
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
  const findings = useMemo(() => analyzeCourse(course?.course_json), [course?.course_json]);

  if (!course) return null;

  const json = course.course_json;
  const page = activePage(json);
  const selectedBlock = page?.blocks.find((b) => b.block_id === selectedBlockId) || null;

  const saveLabel = { saved: 'Saved ✓', saving: 'Saving...', unsaved: 'Unsaved changes' }[saveStatus];
  const errorFindingCount = findings.filter((f) => f.severity === 'error').length;

  return (
    <div className="course-editor">
      <header className="top-bar course-editor__top-bar">
        <button className="btn-text" onClick={handleBack} aria-label="Back to course library">
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
            onClick={() => setEditingTitle(true)}
          >
            {json.meta?.title || 'Untitled Course'}
          </h1>
        )}

        <div className="course-editor__history-controls">
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
        </div>

        <button
          type="button"
          className="btn"
          data-tour="preview-toggle"
          onClick={() => {
            saveNow();
            setPreviewMode((current) => current || 'desktop');
          }}
        >
          Preview
        </button>

        <button
          type="button"
          className={focusMode ? 'btn btn-primary' : 'btn'}
          onClick={() => setFocusMode((v) => !v)}
          aria-pressed={focusMode}
          title="Hide both side panels to focus on the canvas"
        >
          {focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
        </button>

        <MoreToolsMenu
          dataTour="more-tools"
          items={[
            { label: 'Media Library', onClick: () => setShowMediaLibrary(true) },
            { label: 'Save as Template', onClick: () => setShowSaveTemplate(true) },
            course.is_template && {
              label: showExportSaving ? 'Saving before export...' : 'Export Word',
              onClick: handleExportWord,
              disabled: showExportSaving,
            },
          ]}
        />

        {findings.length > 0 && (
          <button
            type="button"
            className={
              errorFindingCount > 0
                ? 'course-editor__health-badge course-editor__health-badge--error'
                : 'course-editor__health-badge course-editor__health-badge--warning'
            }
            onClick={() => {
              setSelectedBlockId(null);
              setSettingsTab('Course Health');
            }}
            title="Open Course Health"
          >
            {errorFindingCount > 0 ? `⚠ ${errorFindingCount} error${errorFindingCount === 1 ? '' : 's'}` : `${findings.length} warning${findings.length === 1 ? '' : 's'}`}
          </button>
        )}

        <button className="btn btn-primary" onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish'}
        </button>

        <span className="course-editor__save-status" data-status={saveStatus} data-tour="save-status">
          {saveLabel}
        </span>
      </header>

      {publishNotice && (
        <div className={`course-editor__publish-notice course-editor__publish-notice--${publishNotice.type}`}>
          {publishNotice.message}
        </div>
      )}

      {showTour && <OnboardingTour onComplete={handleTourComplete} />}

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

      <div
        className={
          'course-editor__body' +
          (effectiveLeftCollapsed ? ' course-editor__body--left-collapsed' : '') +
          (effectiveRightCollapsed ? ' course-editor__body--right-collapsed' : '')
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
              onChangeMeta={handleChangeMeta}
              activePageId={activePageId}
              onSelectPage={handleSelectPage}
              onAddPage={handleAddPage}
              onRenamePage={handleRenamePage}
              onDeletePage={handleDeletePage}
              onSaveAsPageTemplate={setPageToSaveAsTemplate}
              onInsertFromTemplate={() => setShowInsertFromTemplate(true)}
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
                assets={json.assets}
                courseId={course.id}
                onAddCourseAsset={handleAddCourseAsset}
                onAddCourseAssets={handleAddCourseAssets}
                onUpdateCourseAsset={handleUpdateCourseAsset}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onChangeBlock={handleChangeBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleDeleteBlock}
                onAddBlock={handleAddBlock}
                onReorderBlocks={handleReorderBlocks}
                onMoveBlockToPage={handleMoveBlockToPage}
                onCopyBlockToPage={handleCopyBlockToPage}
              />
            )
          )}
        </main>

        <div className="course-editor__right-panel">
          <button
            type="button"
            className="course-editor__panel-toggle course-editor__panel-toggle--right"
            onClick={() => setRightPanelCollapsed((v) => !v)}
            disabled={focusMode}
            aria-expanded={!effectiveRightCollapsed}
            aria-label={effectiveRightCollapsed ? 'Expand settings panel' : 'Collapse settings panel'}
            title={effectiveRightCollapsed ? 'Expand settings' : 'Collapse settings'}
          >
            {effectiveRightCollapsed ? '◀' : '▶'}
          </button>
          {!effectiveRightCollapsed && (
            <SettingsPanel
              selectedBlock={selectedBlock}
              meta={json.meta}
              page={page}
              pages={json.pages}
              variables={json.variables || []}
              assets={json.assets}
              onChangeMeta={handleChangeMeta}
              onChangePage={handleChangePage}
              onChangeVariables={handleChangeVariables}
              onUpdateCourseAsset={handleUpdateCourseAsset}
              onAddCourseResource={handleAddCourseResource}
              onRemoveCourseResource={handleRemoveCourseResource}
              onUpdateCourseResource={handleUpdateCourseResource}
              onChangeBlock={(updated, options) => handleChangeBlock(selectedBlock.block_id, updated, options)}
              activeTab={settingsTab}
              onChangeTab={setSettingsTab}
              onOpenVariableManager={openVariableManager}
              findings={findings}
              onNavigateToFinding={handleNavigateToFinding}
              onOpenAltTextReview={() => setShowAltTextReview(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

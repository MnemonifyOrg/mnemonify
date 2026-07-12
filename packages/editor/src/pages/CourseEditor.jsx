import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import { genPageId } from '../lib/idGen.js';
import PageList from '../components/PageList.jsx';
import BlockCanvas from '../components/BlockCanvas.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import SaveAsTemplateModal from '../components/SaveAsTemplateModal.jsx';
import MediaLibraryPanel from '../components/MediaLibraryPanel.jsx';
import OnboardingTour from '../components/OnboardingTour.jsx';
import '../styles/courseEditor.css';

const AUTOSAVE_DELAY_MS = 5000;
const PREVIEW_WIDTHS = { phone: '375px', tablet: '768px', desktop: '100%' };

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
  const [showTour, setShowTour] = useState(searchParams.get('tour') === '1');

  const courseRef = useRef(null);
  const saveTimerRef = useRef(null);

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
    function handleBeforeUnload(e) {
      if (saveStatus !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  async function doSave() {
    const current = courseRef.current;
    if (!current) return;
    setSaveStatus('saving');
    await api.updateCourse(current.id, { title: current.title, course_json: current.course_json });
    setSaveStatus('saved');
  }

  function scheduleSave() {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, AUTOSAVE_DELAY_MS);
  }

  function saveNow() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave();
  }

  function updateCourseJson(updater) {
    setCourse((prev) => {
      const nextJson = updater(prev.course_json);
      return { ...prev, course_json: nextJson, title: nextJson.meta?.title ?? prev.title };
    });
    scheduleSave();
  }

  function handleChangeMeta(newMeta) {
    updateCourseJson((json) => ({ ...json, meta: newMeta }));
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
    updateCourseJson((json) => ({ ...json, pages: [...json.pages, newPage] }));
    setActivePageId(newPage.page_id);
  }

  function handleRenamePage(pageId, title) {
    updateCourseJson((json) => ({
      ...json,
      pages: json.pages.map((p) => (p.page_id === pageId ? { ...p, title } : p)),
    }));
  }

  function handleDeletePage(pageId) {
    if (!window.confirm('Delete this page and all its blocks?')) return;
    updateCourseJson((json) => {
      const pages = json.pages.filter((p) => p.page_id !== pageId);
      if (activePageId === pageId) setActivePageId(pages[0]?.page_id || null);
      return { ...json, pages };
    });
  }

  function handleChangeBlock(blockId, updatedBlock) {
    updateCourseJson((json) => ({
      ...json,
      pages: json.pages.map((p) =>
        p.page_id !== activePageId ? p : { ...p, blocks: p.blocks.map((b) => (b.block_id === blockId ? updatedBlock : b)) }
      ),
    }));
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
            ? { ...item, body_blocks: item.body_blocks.map(regenerateIds) }
            : item
        ),
      };
    }
    return newBlock;
  }

  function handleDuplicateBlock(blockId) {
    updateCourseJson((json) => ({
      ...json,
      pages: json.pages.map((p) => {
        if (p.page_id !== activePageId) return p;
        const index = p.blocks.findIndex((b) => b.block_id === blockId);
        const clone = regenerateIds(p.blocks[index]);
        const blocks = [...p.blocks];
        blocks.splice(index + 1, 0, clone);
        return { ...p, blocks };
      }),
    }));
  }

  function handleDeleteBlock(blockId) {
    updateCourseJson((json) => ({
      ...json,
      pages: json.pages.map((p) => (p.page_id !== activePageId ? p : { ...p, blocks: p.blocks.filter((b) => b.block_id !== blockId) })),
    }));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }

  function handleAddBlock(newBlock) {
    updateCourseJson((json) => ({
      ...json,
      pages: json.pages.map((p) => (p.page_id !== activePageId ? p : { ...p, blocks: [...p.blocks, newBlock] })),
    }));
    setSelectedBlockId(newBlock.block_id);
  }

  function handleReorderBlocks(newBlocks) {
    updateCourseJson((json) => ({
      ...json,
      pages: json.pages.map((p) => (p.page_id !== activePageId ? p : { ...p, blocks: newBlocks })),
    }));
    saveNow();
  }

  if (!course) return null;

  const json = course.course_json;
  const page = activePage(json);
  const selectedBlock = page?.blocks.find((b) => b.block_id === selectedBlockId) || null;

  const saveLabel = { saved: 'Saved ✓', saving: 'Saving...', unsaved: 'Unsaved changes' }[saveStatus];

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
          <h1 className="course-editor__title" onClick={() => setEditingTitle(true)}>
            {json.meta?.title || 'Untitled Course'}
          </h1>
        )}

        <div className="course-editor__preview-toggle" data-tour="preview-toggle">
          {['phone', 'tablet', 'desktop'].map((m) => (
            <button
              key={m}
              className={previewMode === m ? 'btn btn-primary' : 'btn'}
              onClick={() => {
                const turningOn = previewMode !== m;
                if (turningOn) saveNow();
                setPreviewMode(turningOn ? m : null);
              }}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <button className="btn" data-tour="media-library" onClick={() => setShowMediaLibrary(true)}>
          Media Library
        </button>
        <button className="btn" data-tour="save-template" onClick={() => setShowSaveTemplate(true)}>
          Save as Template
        </button>
        {course.is_template && (
          <a className="btn" href={`/api/templates/${course.id}/export-word`}>
            Export Word
          </a>
        )}

        <span className="course-editor__save-status" data-status={saveStatus} data-tour="save-status">
          {saveLabel}
        </span>
      </header>

      {showTour && <OnboardingTour onComplete={handleTourComplete} />}

      {showSaveTemplate && (
        <SaveAsTemplateModal courseTitle={json.meta?.title || course.title} courseId={course.id} onClose={() => setShowSaveTemplate(false)} />
      )}

      {showMediaLibrary && (
        <MediaLibraryPanel
          courseId={course.id}
          courseAssets={json.assets}
          onAddCourseAssets={handleAddCourseAssets}
          onUpdateCourseAsset={handleUpdateCourseAsset}
          onClose={() => setShowMediaLibrary(false)}
        />
      )}

      <div className="course-editor__body">
        <nav className="course-editor__left-panel" data-tour="page-list">
          <PageList
            pages={json.pages}
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
            onAddPage={handleAddPage}
            onRenamePage={handleRenamePage}
            onDeletePage={handleDeletePage}
          />
        </nav>

        <main className="course-editor__center-panel">
          {previewMode ? (
            <div className="preview-frame-container">
              <button className="btn preview-frame-container__close" onClick={() => setPreviewMode(null)}>
                Close Preview
              </button>
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
                assets={json.assets}
                courseId={course.id}
                onAddCourseAsset={handleAddCourseAsset}
                onAddCourseAssets={handleAddCourseAssets}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onChangeBlock={handleChangeBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleDeleteBlock}
                onAddBlock={handleAddBlock}
                onReorderBlocks={handleReorderBlocks}
              />
            )
          )}
        </main>

        <SettingsPanel
          selectedBlock={selectedBlock}
          meta={json.meta}
          assets={json.assets}
          onChangeMeta={handleChangeMeta}
          onUpdateCourseAsset={handleUpdateCourseAsset}
          onChangeBlock={(updated) => handleChangeBlock(selectedBlock.block_id, updated)}
        />
      </div>
    </div>
  );
}

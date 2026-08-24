import { useEffect } from 'react';
import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';
import { findTool } from '../lib/editorDrawer.js';

function InspectorPlaceholder({ title, description }) {
  return (
    <div className="editor-drawer__placeholder">
      <div className="editor-drawer__placeholder-icon" aria-hidden="true">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <p className="editor-drawer__hint">Choose another tool or select content to open its settings here.</p>
    </div>
  );
}

function InspectorContent({ activeTool, contextualDrawer, featureFlags }) {
  if (activeTool) {
    const item = findTool(activeTool, featureFlags);
    return <InspectorPlaceholder title={item?.label || 'Editor tools'} description={`${item?.label || 'Editor'} is ready to configure.`} />;
  }
  if (contextualDrawer?.kind === 'block') return <InspectorPlaceholder title="Block Settings" description="Select a block setting to edit it." />;
  if (contextualDrawer?.kind === 'module') return <InspectorPlaceholder title="Module Settings" description="Select a module setting to edit it." />;
  return <InspectorPlaceholder title="Page Settings" description="Select a page setting to edit it." />;
}

export default function EditorDrawerShell({
  activeTool = null,
  contextualDrawer = null,
  featureFlags = FEATURE_FLAGS,
  onCloseDrawer,
  drawerContent = null,
}) {
  const inspectorOpen = !!activeTool || !!contextualDrawer;

  useEffect(() => {
    if (!inspectorOpen) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') onCloseDrawer();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [inspectorOpen, onCloseDrawer]);

  const activeLabel = activeTool
    ? findTool(activeTool, featureFlags)?.label || 'Editor tools'
    : contextualDrawer?.kind === 'block'
      ? 'Block Settings'
      : contextualDrawer?.kind === 'module'
        ? 'Module Settings'
        : 'Page Settings';

  if (!inspectorOpen) return null;

  return (
    <>
      <button type="button" className="editor-inspector__backdrop" aria-label="Close inspector" onClick={onCloseDrawer} />
      <aside className="editor-inspector" role="dialog" aria-modal="false" aria-label={activeLabel}>
        <header className="editor-drawer__header">
          <h2>{activeLabel}</h2>
          <button type="button" className="btn-text editor-drawer__close" aria-label="Close inspector" onClick={onCloseDrawer}>×</button>
        </header>
        <div className="editor-drawer__body">
          {drawerContent || <InspectorContent activeTool={activeTool} contextualDrawer={contextualDrawer} featureFlags={featureFlags} />}
        </div>
      </aside>
    </>
  );
}

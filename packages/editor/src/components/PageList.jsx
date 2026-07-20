import { useState } from 'react';
import { genGroupId } from '../lib/idGen.js';

// Phase 4.6 Step 5: inline rename shared by both a page row and a group
// header -- same click-to-edit-in-place interaction, just parameterized by
// which onCommit/onCancel to call.
function InlineRenameField({ value, onCommit, className, autoFocus }) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className={className || 'input'}
      autoFocus={autoFocus}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => draft.trim() && onCommit(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function PageRow({ page, isActive, groups, currentGroupId, onSelect, onRename, onDelete, onSaveAsPageTemplate, onAssignGroup, showGroupPicker, canDelete }) {
  const [renaming, setRenaming] = useState(false);

  return (
    <li className={isActive ? 'page-list__item page-list__item--active' : 'page-list__item'}>
      {renaming ? (
        <InlineRenameField
          value={page.title}
          autoFocus
          onCommit={(title) => {
            onRename(page.page_id, title);
            setRenaming(false);
          }}
        />
      ) : (
        <button className="page-list__title" onClick={() => onSelect(page.page_id)} onDoubleClick={() => setRenaming(true)}>
          {page.title}
        </button>
      )}
      <div className="page-list__actions">
        {showGroupPicker && (
          <select
            className="page-list__group-picker"
            value={currentGroupId || ''}
            onChange={(e) => onAssignGroup(page.page_id, e.target.value || null)}
            onClick={(e) => e.stopPropagation()}
            title="Move to module"
          >
            <option value="">No module</option>
            {groups.map((g) => (
              <option key={g.group_id} value={g.group_id}>
                {g.title}
              </option>
            ))}
          </select>
        )}
        <button className="btn-text" title="Rename" onClick={() => setRenaming(true)}>
          ✎
        </button>
        <button className="btn-text" title="Save as Page Template" onClick={() => onSaveAsPageTemplate(page)}>
          ▤
        </button>
        {canDelete && (
          <button className="btn-text" title="Delete page" onClick={() => onDelete(page.page_id)}>
            ✕
          </button>
        )}
      </div>
    </li>
  );
}

function GroupHeader({ group, collapsed, onToggleCollapse, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="page-list__group-header">
      <button
        type="button"
        className="page-list__group-collapse"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand ${group.title}` : `Collapse ${group.title}`}
      >
        {collapsed ? '▶' : '▼'}
      </button>
      {renaming ? (
        <InlineRenameField
          value={group.title}
          className="input page-list__group-rename-input"
          autoFocus
          onCommit={(title) => {
            onRename(group.group_id, title);
            setRenaming(false);
          }}
        />
      ) : (
        <span className="page-list__group-title" onDoubleClick={() => setRenaming(true)}>
          {group.title}
        </span>
      )}
      <div className="page-list__actions">
        <button className="btn-text" title="Rename module" onClick={() => setRenaming(true)}>
          ✎
        </button>
        <button className="btn-text" title="Delete module (pages are kept, just ungrouped)" onClick={() => onDelete(group.group_id)}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default function PageList({
  pages,
  meta,
  onChangeMeta,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onSaveAsPageTemplate,
  onInsertFromTemplate,
}) {
  // Collapse/expand is view state, not document state -- deliberately not
  // persisted into meta.page_groups (same "view state stays out of the
  // document/undo stack" principle as Step 2's panel collapse). Resets on
  // reload; session-level memory is enough here too.
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const isGrouped = meta?.page_display === 'grouped';
  const groups = meta?.page_groups || [];

  function toggleGroupCollapse(groupId) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function handleAddGroup() {
    const newGroup = { group_id: genGroupId(), title: `Module ${groups.length + 1}`, page_ids: [] };
    onChangeMeta({ ...meta, page_groups: [...groups, newGroup] }, { forceSnapshot: true });
  }

  function handleRenameGroup(groupId, title) {
    onChangeMeta(
      { ...meta, page_groups: groups.map((g) => (g.group_id === groupId ? { ...g, title } : g)) },
      { forceSnapshot: true }
    );
  }

  function handleDeleteGroup(groupId) {
    if (!window.confirm('Delete this module? Its pages are kept, just ungrouped.')) return;
    onChangeMeta({ ...meta, page_groups: groups.filter((g) => g.group_id !== groupId) }, { forceSnapshot: true });
  }

  // Removes the page from whichever group currently holds it (if any),
  // then adds it to the target group -- a page can only ever belong to
  // one module at a time, so reassigning is "remove from old, add to
  // new" rather than a more general many-to-many membership operation.
  function handleAssignGroup(pageId, targetGroupId) {
    const nextGroups = groups.map((g) => ({ ...g, page_ids: g.page_ids.filter((id) => id !== pageId) }));
    const finalGroups = targetGroupId
      ? nextGroups.map((g) => (g.group_id === targetGroupId ? { ...g, page_ids: [...g.page_ids, pageId] } : g))
      : nextGroups;
    onChangeMeta({ ...meta, page_groups: finalGroups }, { forceSnapshot: true });
  }

  function renderPageRow(page, currentGroupId) {
    return (
      <PageRow
        key={page.page_id}
        page={page}
        isActive={page.page_id === activePageId}
        groups={groups}
        currentGroupId={currentGroupId}
        onSelect={onSelectPage}
        onRename={onRenamePage}
        onDelete={onDeletePage}
        onSaveAsPageTemplate={onSaveAsPageTemplate}
        onAssignGroup={handleAssignGroup}
        showGroupPicker={isGrouped}
        canDelete={pages.length > 1}
      />
    );
  }

  return (
    <div className="page-list">
      {isGrouped ? (
        <div className="page-list__grouped">
          {groups.map((group) => {
            const groupPages = group.page_ids.map((id) => pages.find((p) => p.page_id === id)).filter(Boolean);
            const collapsed = collapsedGroups.has(group.group_id);
            return (
              <div className="page-list__group" key={group.group_id}>
                <GroupHeader
                  group={group}
                  collapsed={collapsed}
                  onToggleCollapse={() => toggleGroupCollapse(group.group_id)}
                  onRename={handleRenameGroup}
                  onDelete={handleDeleteGroup}
                />
                {!collapsed && (
                  <ul className="page-list__group-pages">
                    {groupPages.length === 0 && <li className="page-list__empty-hint">No pages in this module yet.</li>}
                    {groupPages.map((page) => renderPageRow(page, group.group_id))}
                  </ul>
                )}
              </div>
            );
          })}

          {(() => {
            const groupedIds = new Set(groups.flatMap((g) => g.page_ids));
            const ungrouped = pages.filter((p) => !groupedIds.has(p.page_id));
            if (ungrouped.length === 0) return null;
            return (
              <div className="page-list__group page-list__group--ungrouped">
                <div className="page-list__group-header page-list__group-header--plain">
                  <span className="page-list__group-title">Ungrouped pages</span>
                </div>
                <ul className="page-list__group-pages">{ungrouped.map((page) => renderPageRow(page, null))}</ul>
              </div>
            );
          })()}

          <button type="button" className="btn page-list__add-module" onClick={handleAddGroup}>
            + Add Module
          </button>
        </div>
      ) : (
        <ul>{pages.map((page) => renderPageRow(page, null))}</ul>
      )}

      <div className="page-list__add-row">
        <button className="btn page-list__add" onClick={onAddPage}>
          + Add Page
        </button>
        <button className="btn page-list__add" onClick={onInsertFromTemplate}>
          + From Template
        </button>
      </div>
    </div>
  );
}

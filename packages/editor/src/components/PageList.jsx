import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { genGroupId } from '../lib/idGen.js';
import ObjectiveMultiSelect from './ObjectiveMultiSelect.jsx';

const GROUP_DROP_PREFIX = 'group-drop:';
const groupDropId = (groupId) => `${GROUP_DROP_PREFIX}${groupId}`;

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.page_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <li ref={setNodeRef} style={style} className={isActive ? 'page-list__item page-list__item--active' : 'page-list__item'}>
      <span className="page-list__drag-handle" title="Drag to reorder pages" aria-label="Drag to reorder pages" {...attributes} {...listeners}>⠿</span>
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

function GroupHeader({ group, collapsed, onToggleCollapse, onRename, onDelete, objectives, onAssignObjectives }) {
  const [renaming, setRenaming] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.group_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="page-list__group-header">
      <span className="page-list__drag-handle" title="Drag to reorder modules" aria-label="Drag to reorder modules" {...attributes} {...listeners}>⠿</span>
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
      <div onClick={(event) => event.stopPropagation()}>
        <ObjectiveMultiSelect
          objectives={objectives}
          value={group.objective_ids || []}
          onChange={(objectiveIds) => onAssignObjectives(group.group_id, objectiveIds)}
          label="Assign objectives"
          ariaLabel={'Assign objectives to ' + group.title}
          hint="Optional module filter for question-bank draws."
        />
      </div>
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

function GroupDropList({ group, children }) {
  const { isOver, setNodeRef } = useDroppable({ id: groupDropId(group.group_id) });
  return <ul ref={setNodeRef} className={isOver ? 'page-list__group-pages page-list__group-pages--drop-target' : 'page-list__group-pages'}>{children}</ul>;
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
  onReorderPages,
  onReorderGroups,
}) {
  // Collapse/expand is view state, not document state -- deliberately not
  // persisted into meta.page_groups (same "view state stays out of the
  // document/undo stack" principle as Step 2's panel collapse). Resets on
  // reload; session-level memory is enough here too.
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const isGrouped = meta?.page_display === 'grouped';
  const groups = meta?.page_groups || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Groups define membership and section order only. Within each section,
  // preserve the authoritative course.pages[] order so the editor nav and
  // player Continue sequence cannot diverge again.
  function pagesForGroup(group) {
    const memberIds = new Set(group.page_ids || []);
    return pages.filter((page) => memberIds.has(page.page_id));
  }

  const groupedPages = groups.flatMap((group) => pagesForGroup(group));
  const groupedIds = new Set(groups.flatMap((group) => group.page_ids || []));
  const ungroupedPages = pages.filter((page) => !groupedIds.has(page.page_id));
  const displayedPages = isGrouped ? [...groupedPages, ...ungroupedPages] : pages;

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeGroupIndex = groups.findIndex((group) => group.group_id === active.id);
    if (activeGroupIndex !== -1) {
      const overGroupId = groups.some((group) => group.group_id === over.id)
        ? over.id
        : String(over.id).startsWith(GROUP_DROP_PREFIX)
          ? String(over.id).slice(GROUP_DROP_PREFIX.length)
          : groups.find((group) => (group.page_ids || []).includes(over.id))?.group_id;
      const overGroupIndex = groups.findIndex((group) => group.group_id === overGroupId);
      if (overGroupIndex === -1 || overGroupIndex === activeGroupIndex) return;
      onReorderGroups(arrayMove(groups, activeGroupIndex, overGroupIndex));
      return;
    }

    const oldIndex = displayedPages.findIndex((page) => page.page_id === active.id);
    if (oldIndex === -1) return;
    const overPageIndex = displayedPages.findIndex((page) => page.page_id === over.id);
    const overGroupId = groups.some((group) => group.group_id === over.id)
      ? over.id
      : String(over.id).startsWith(GROUP_DROP_PREFIX)
        ? String(over.id).slice(GROUP_DROP_PREFIX.length)
        : groups.find((group) => (group.page_ids || []).includes(over.id))?.group_id || null;
    let newIndex = overPageIndex;
    if (newIndex === -1 && overGroupId) {
      const targetPageIndexes = displayedPages
        .map((page, index) => (groups.find((group) => (group.page_ids || []).includes(page.page_id))?.group_id === overGroupId ? index : -1))
        .filter((index) => index >= 0);
      newIndex = targetPageIndexes.length ? targetPageIndexes[targetPageIndexes.length - 1] + 1 : displayedPages.length;
    }
    if (newIndex === -1) return;

    const reorderedPages = arrayMove(displayedPages, oldIndex, newIndex);
    const nextGroups = groups.map((group) => ({
      ...group,
      page_ids: (group.page_ids || []).filter((pageId) => pageId !== active.id),
    }));
    if (overGroupId) {
      const targetGroup = nextGroups.find((group) => group.group_id === overGroupId);
      if (targetGroup) targetGroup.page_ids = [...targetGroup.page_ids, active.id];
    }
    onReorderPages(reorderedPages, nextGroups);
  }

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

  function handleAssignObjectives(groupId, objectiveIds) {
    onChangeMeta(
      { ...meta, page_groups: groups.map((group) => (
        group.group_id === groupId ? { ...group, objective_ids: objectiveIds } : group
      )) },
      { forceSnapshot: true }
    );
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={displayedPages.map((page) => page.page_id)} strategy={verticalListSortingStrategy}>
      <div className="page-list">
      {isGrouped ? (
        <div className="page-list__grouped">
          {groups.map((group) => {
            const groupPages = pagesForGroup(group);
            const collapsed = collapsedGroups.has(group.group_id);
            return (
              <div className="page-list__group" key={group.group_id}>
                <SortableContext items={groups.map((candidate) => candidate.group_id)} strategy={verticalListSortingStrategy}>
                  <GroupHeader
                    group={group}
                    collapsed={collapsed}
                    onToggleCollapse={() => toggleGroupCollapse(group.group_id)}
                    onRename={handleRenameGroup}
                    onDelete={handleDeleteGroup}
                    objectives={meta.objectives || []}
                    onAssignObjectives={handleAssignObjectives}
                  />
                </SortableContext>
                {!collapsed && (
                  <GroupDropList group={group}>
                    {groupPages.length === 0 && <li className="page-list__empty-hint">No pages in this module yet.</li>}
                    {groupPages.map((page) => renderPageRow(page, group.group_id))}
                  </GroupDropList>
                )}
              </div>
            );
          })}

          {(() => {
            const ungrouped = ungroupedPages;
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
      </SortableContext>
    </DndContext>
  );
}

import { useMemo, useState } from 'react';

function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function CommentComposer({ label, value, onChange, onSubmit, submitLabel = 'Add comment', disabled = false }) {
  return (
    <form className="comments-panel__composer" onSubmit={async (event) => {
      event.preventDefault();
      try {
        await onSubmit();
      } catch {
        // The parent owns the visible error state; keep the form mounted.
      }
    }} noValidate>
      <label htmlFor="comments-panel-composer">{label}</label>
      <textarea
        id="comments-panel-composer"
        className="input"
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write a plain-text comment…"
        maxLength={5000}
        disabled={disabled}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled || !value.trim()}>{submitLabel}</button>
    </form>
  );
}

function ReplyComposer({ threadId, value, onChange, onSubmit, disabled }) {
  return (
    <form className="comments-panel__reply-form" onSubmit={async (event) => {
      event.preventDefault();
      try {
        await onSubmit(threadId);
      } catch {
        // The parent owns the visible error state; keep the form mounted.
      }
    }} noValidate>
      <textarea
        className="input"
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write a reply…"
        maxLength={5000}
        disabled={disabled}
        aria-label="Reply body"
      />
      <button type="submit" className="btn btn-secondary" disabled={disabled || !value.trim()}>Reply</button>
    </form>
  );
}

function CommentBody({ comment, currentUserId, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const isAuthor = currentUserId === comment.author_id;

  if (editing) {
    return (
      <form className="comments-panel__edit-form" onSubmit={(event) => {
        event.preventDefault();
        onEdit(comment.comment_id, draft)
          .then(() => setEditing(false))
          .catch(() => {
            // The parent owns the visible error state; keep the edit open.
          });
      }} noValidate>
        <textarea className="input" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} />
        <div className="comments-panel__inline-actions">
          <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>Save</button>
          <button type="button" className="btn btn-secondary" onClick={() => { setDraft(comment.body); setEditing(false); }}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <>
      <p className="comments-panel__body">{comment.body}</p>
      {(isAuthor || onDelete) && (
        <div className="comments-panel__inline-actions">
          {isAuthor && <button type="button" className="btn-text" onClick={() => setEditing(true)}>Edit</button>}
          {(isAuthor || onDelete) && <button type="button" className="btn-text comments-panel__delete" onClick={() => onDelete(comment.comment_id)}>Delete</button>}
        </div>
      )}
    </>
  );
}

function Thread({ thread, currentUserId, canModerate, onReply, onStatus, onEdit, onDelete }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const isResolved = thread.status === 'resolved';
  const canDeleteRoot = canModerate || currentUserId === thread.author_id;

  async function submitReply() {
    await onReply(thread.comment_id, replyDraft);
    setReplyDraft('');
    setReplyOpen(false);
  }

  const content = (
    <article className={`comments-panel__thread comments-panel__thread--${thread.status}`} data-comment-id={thread.comment_id}>
      <div className="comments-panel__thread-header">
        <strong>{thread.author_name || thread.author_email || 'Unknown author'}</strong>
        <time dateTime={thread.created_at}>{dateLabel(thread.created_at)}</time>
      </div>
      <p className="comments-panel__anchor">{thread.fallback_label}</p>
      <CommentBody comment={thread} currentUserId={currentUserId} onEdit={onEdit} onDelete={canDeleteRoot ? onDelete : null} />
      {thread.replies?.length > 0 && (
        <div className="comments-panel__replies" aria-label="Replies">
          {thread.replies.map((reply) => (
            <div className="comments-panel__reply" key={reply.comment_id}>
              <div className="comments-panel__thread-header">
                <strong>{reply.author_name || reply.author_email || 'Unknown author'}</strong>
                <time dateTime={reply.created_at}>{dateLabel(reply.created_at)}</time>
              </div>
              <CommentBody
                comment={reply}
                currentUserId={currentUserId}
                onEdit={onEdit}
                onDelete={canModerate || currentUserId === reply.author_id ? onDelete : null}
              />
            </div>
          ))}
        </div>
      )}
      <div className="comments-panel__thread-actions">
        <button type="button" className="btn-text" onClick={() => setReplyOpen((value) => !value)}>
          {replyOpen ? 'Cancel reply' : 'Reply'}
        </button>
        <button type="button" className="btn-text" onClick={() => onStatus(thread.comment_id, isResolved ? 'open' : 'resolved')}>
          {isResolved ? 'Reopen thread' : 'Resolve thread'}
        </button>
      </div>
      {replyOpen && <ReplyComposer threadId={thread.comment_id} value={replyDraft} onChange={setReplyDraft} onSubmit={submitReply} />}
    </article>
  );

  return isResolved ? <details className="comments-panel__resolved" open={false}><summary>Resolved thread</summary>{content}</details> : content;
}

export default function CommentsPanel({
  comments = [],
  commentAnchor = null,
  defaultAnchor = null,
  currentUserId = null,
  currentRole = null,
  loading = false,
  error = null,
  onCreateComment,
  onReply,
  onStatus,
  onEdit,
  onDelete,
  onNavigate,
  initialFilter = 'open',
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [draft, setDraft] = useState('');
  const anchor = commentAnchor || defaultAnchor;
  const canModerate = currentRole === 'owner';
  const counts = useMemo(() => ({
    open: comments.filter((comment) => comment.status === 'open').length,
    resolved: comments.filter((comment) => comment.status === 'resolved').length,
  }), [comments]);
  const visible = comments.filter((comment) => filter === 'all' || comment.status === filter);

  async function submitComment() {
    if (!anchor) return;
    await onCreateComment({
      body: draft,
      blockId: anchor.blockId || null,
      pageId: anchor.blockId ? null : anchor.pageId,
    });
    setDraft('');
  }

  return (
    <div className="comments-panel" data-testid="comments-panel">
      <p className="settings-panel__hint">Review comments are visible to every organization member. Email notifications are not enabled.</p>
      <div className="comments-panel__filters" role="group" aria-label="Filter comments">
        {['open', 'resolved', 'all'].map((value) => (
          <button
            type="button"
            key={value}
            className={filter === value ? 'btn btn-primary' : 'btn btn-secondary'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value[0].toUpperCase() + value.slice(1)} {value === 'all' ? comments.length : counts[value]}
          </button>
        ))}
      </div>

      <section className="comments-panel__new">
        <h3>Add comment</h3>
        <p className="comments-panel__anchor">{anchor ? `Comment on: ${anchor.fallbackLabel}` : 'Select a page or block to anchor a comment.'}</p>
        <CommentComposer label="Comment" value={draft} onChange={setDraft} onSubmit={submitComment} disabled={loading || !anchor} />
      </section>

      {error && <p className="comments-panel__error" role="alert">{error}</p>}
      {loading && <p className="settings-panel__hint">Loading comments…</p>}
      {!loading && visible.length === 0 && <p className="comments-panel__empty">No {filter === 'all' ? '' : `${filter} `}comment threads.</p>}
      <div className="comments-panel__list">
        {visible.map((thread) => (
          <div key={thread.comment_id}>
            <button type="button" className="comments-panel__navigate" onClick={() => onNavigate(thread)}>
              {thread.block_id ? 'Go to block' : 'Go to page'} · {thread.fallback_label}
            </button>
            <Thread
              thread={thread}
              currentUserId={currentUserId}
              canModerate={canModerate}
              onReply={onReply}
              onStatus={onStatus}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

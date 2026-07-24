export function hasRichTextContent(value) {
  if (Array.isArray(value)) {
    return value.some((segment) => segment?.t === 'variable' || segment?.v?.replace(/<br>/g, '').trim());
  }
  return typeof value === 'string' && value.replace(/<br>/g, '').trim().length > 0;
}

export function hasOptionFeedbackContent(feedback) {
  return Boolean(feedback?.image_id) || hasRichTextContent(feedback?.rich_text);
}

export function toggleExpandedId(ids, id) {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function plainText(value) {
  if (Array.isArray(value)) {
    return value.map((segment) => segment?.t === 'variable' ? '' : String(segment?.v || '').replace(/<[^>]*>/g, '')).join('');
  }
  if (value && typeof value === 'object' && Array.isArray(value.rich_text)) return plainText(value.rich_text);
  return String(value || '').replace(/<[^>]*>/g, '');
}

export function shouldRenderPageTitle(page) {
  const firstBlock = page?.blocks?.[0];
  if (!page?.title || firstBlock?.type !== 'heading') return true;
  return plainText(page.title).trim() !== plainText(firstBlock.content?.text).trim();
}

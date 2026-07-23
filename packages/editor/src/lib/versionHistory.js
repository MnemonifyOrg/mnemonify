export function sortVersionsNewestFirst(versions = []) {
  return [...versions].sort((a, b) => {
    const timeDelta = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (timeDelta !== 0) return timeDelta;
    return String(b.version_id || '').localeCompare(String(a.version_id || ''));
  });
}

export function restoreConfirmationMessage(version) {
  return `Restore “${version?.name || 'this version'}”? This replaces the current course state and creates a new history entry.`;
}

export function formatVersionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
}

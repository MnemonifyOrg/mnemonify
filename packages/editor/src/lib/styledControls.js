export function getNextOptionIndex(length, currentIndex, direction) {
  if (length === 0) return -1;
  const next = currentIndex + direction;
  if (next < 0) return length - 1;
  if (next >= length) return 0;
  return next;
}

export function getOptionIndex(options, value) {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

export function toggleSelectedValue(values, value) {
  const current = new Set(values || []);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  return Array.from(current);
}

export function filterMultiSelectOptions(options, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return options;
  return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery));
}

export function selectedCountLabel(count, emptyLabel = 'None selected') {
  return count === 0 ? emptyLabel : `${count} selected`;
}

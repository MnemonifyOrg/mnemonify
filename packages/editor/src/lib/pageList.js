export function buildGroupOptions(groups) {
  return [{ value: '', label: 'No module' }, ...groups.map((group) => ({ value: group.group_id, label: group.title }))];
}

export function readSelectedObjectiveIds(event) {
  return Array.from(event.target.selectedOptions || [], (option) => option.value);
}

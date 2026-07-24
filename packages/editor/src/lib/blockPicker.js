// The editor does not currently depend on an icon library. Keep these small,
// semantic SVG path sets local to the picker so adding icons does not pull a
// new UI dependency into the editor bundle or the framework-free schema package.
export const BLOCK_ICON_PATHS = {
  text: ['M5 5h14', 'M12 5v14', 'M8 19h8'],
  heading: ['M5 5v14', 'M19 5v14', 'M5 12h14'],
  image: ['M4 5h16v14H4z', 'M7 9h.01', 'M5 17l4-4 3 3 2-2 5 5'],
  list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  table: ['M4 5h16v14H4z', 'M4 10h16', 'M10 5v14', 'M16 5v14'],
  two_column: ['M4 5h16v14H4z', 'M12 5v14'],
  accordion: ['M5 7h14', 'M5 12h14', 'M5 17h14'],
  tabs: ['M4 6h6v4H4z', 'M12 6h8v4h-8z', 'M4 14h16v4H4z'],
  'knowledge-check': ['M5 5h14v14H5z', 'M8 12l2 2 5-5'],
  reflection: ['M5 5h14v14H5z', 'M8 9h8', 'M8 13h5'],
  carousel: ['M4 6h16v12H4z', 'M7 15l3-3 2 2 2-2 3 3'],
  embed: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M14 5l-4 14'],
  video: ['M5 5h14v14H5z', 'M10 9l5 3-5 3z'],
  audio: ['M5 10h4l5-4v12l-5-4H5z', 'M17 9c2 1 2 5 0 6'],
  flashcards: ['M5 7h12v12H5z', 'M8 4h11v12'],
  matching: ['M5 6h6v4H5z', 'M13 14h6v4h-6z', 'M11 8h2v8'],
  ordering: ['M5 6h14', 'M5 12h14', 'M5 18h14', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  hotspot: ['M4 5h16v14H4z', 'M12 9v6', 'M9 12h6'],
  question_bank_draw: ['M5 5h14v14H5z', 'M8 8h8', 'M8 12h8', 'M8 16h5'],
};

export function filterBlockDefinitions(grouped, query) {
  const needle = query.trim().toLowerCase();
  return Object.entries(grouped).reduce((filtered, [category, definitions]) => {
    const matches = needle
      ? definitions.filter((definition) => definition.displayName.toLowerCase().includes(needle))
      : definitions;
    if (matches.length > 0) filtered[category] = matches;
    return filtered;
  }, {});
}

export function firstMatchingBlockType(grouped, query) {
  const filtered = filterBlockDefinitions(grouped, query);
  return Object.values(filtered)[0]?.[0]?.type || null;
}

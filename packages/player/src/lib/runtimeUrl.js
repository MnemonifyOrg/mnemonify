// Course assets are normally served by the Mnemonify server. A self-contained
// SCORM export sets this marker before loading the player bundle, so the same
// components can resolve package-local files without changing live hosting.
export function isEmbeddedPackage() {
  return globalThis.window?.__MNEMONIFY_EMBEDDED__ === true
    || Boolean(globalThis.document?.getElementById('mnemonify-course-data'));
}

export function readEmbeddedJson(globalName, elementId) {
  const globalValue = globalThis.window?.[globalName];
  if (globalValue) return globalValue;
  const element = globalThis.document?.getElementById(elementId);
  if (!element?.textContent) return null;
  try {
    return JSON.parse(element.textContent);
  } catch (error) {
    console.error(`[player] Could not parse embedded ${elementId}:`, error);
    return null;
  }
}

export function resolvePlayerUrl(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^(?:https?:|data:|blob:)/i.test(raw) || raw.startsWith('/')) return raw;
  return isEmbeddedPackage() ? `./${raw.replace(/^\.\/+/, '')}` : `/${raw}`;
}

export function resolveCaptionUrl(assetId) {
  const entry = embeddedCaptionEntry(assetId);
  if (isEmbeddedPackage() && entry?.caption) return resolvePlayerUrl(entry.caption);
  return `/api/assets/${assetId}/captions/caption.vtt`;
}

export function embeddedCaptionEntry(assetId) {
  if (!isEmbeddedPackage()) return null;
  const captions = readEmbeddedJson('__MNEMONIFY_EMBEDDED_CAPTIONS__', 'mnemonify-captions');
  return captions?.[assetId] || null;
}

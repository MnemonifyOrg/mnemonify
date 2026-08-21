// Course assets are normally served by the Mnemonify server. A self-contained
// SCORM export sets this marker before loading the player bundle, so the same
// components can resolve package-local files without changing live hosting.
export function isEmbeddedPackage() {
  return globalThis.window?.__MNEMONIFY_EMBEDDED__ === true;
}

export function resolvePlayerUrl(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^(?:https?:|data:|blob:)/i.test(raw) || raw.startsWith('/')) return raw;
  return isEmbeddedPackage() ? `./${raw.replace(/^\.\/+/, '')}` : `/${raw}`;
}

export function resolveCaptionUrl(assetId) {
  const entry = globalThis.window?.__MNEMONIFY_EMBEDDED_CAPTIONS__?.[assetId];
  if (isEmbeddedPackage() && entry?.caption) return resolvePlayerUrl(entry.caption);
  return `/api/assets/${assetId}/captions/caption.vtt`;
}

export function embeddedCaptionEntry(assetId) {
  if (!isEmbeddedPackage()) return null;
  return globalThis.window?.__MNEMONIFY_EMBEDDED_CAPTIONS__?.[assetId] || null;
}

export function resolveAssetUrl(assetOrSrc) {
  const src = typeof assetOrSrc === 'string' ? assetOrSrc : assetOrSrc?.url || assetOrSrc?.src;
  if (!src) return '';
  return src.startsWith('/') || src.startsWith('http') ? src : `/${src}`;
}

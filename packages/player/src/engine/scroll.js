export function resetPageScroll(targetWindow = globalThis.window, targetDocument = globalThis.document) {
  targetWindow?.scrollTo?.(0, 0);
  if (targetDocument?.documentElement) targetDocument.documentElement.scrollTop = 0;
  if (targetDocument?.body) targetDocument.body.scrollTop = 0;
}

/**
 * A URL ending in .pdf is the reliable, synchronous signal available to the
 * player before a cross-origin resource is loaded. The response headers are
 * not readable from an iframe, so content-type detection is not possible here
 * without adding a separate network request to every embed.
 */
export function isPdfUrl(value = '') {
  try {
    const pathname = new URL(value, 'https://mnemonify.invalid').pathname;
    return pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

// Hotfix (post-Phase-4.6 QA): normalizes a pasted YouTube/Vimeo URL into
// its canonical embeddable form. YouTube's own watch page and youtu.be
// short links send an X-Frame-Options/CSP frame-ancestors response that
// refuses to be framed by any other origin -- that's the actual cause of
// the "www.youtube.com refused to connect" failure, not a sandbox
// permission gap. Only youtube.com/embed/<id> is designed to be embedded.
// Confirmed live: pasting a raw watch/short URL rendered a blank iframe
// with the *existing* sandbox value unchanged; swapping only the URL to
// the /embed/ form rendered the full YouTube player with that same
// sandbox value, no permission widening needed to fix this specific
// failure. Vimeo has the identical split (vimeo.com/<id> vs.
// player.vimeo.com/video/<id>), so it's normalized the same way.
const YOUTUBE_WATCH = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]+)/i;
const YOUTUBE_SHORT = /^https?:\/\/youtu\.be\/([\w-]+)/i;
const YOUTUBE_ALREADY_EMBED = /^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//i;
const VIMEO_WATCH = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i;
const VIMEO_ALREADY_EMBED = /^https?:\/\/player\.vimeo\.com\/video\//i;

export function toEmbeddableUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return trimmed;
  if (YOUTUBE_ALREADY_EMBED.test(trimmed) || VIMEO_ALREADY_EMBED.test(trimmed)) return trimmed;

  let match = trimmed.match(YOUTUBE_WATCH);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;

  match = trimmed.match(YOUTUBE_SHORT);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;

  match = trimmed.match(VIMEO_WATCH);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;

  return trimmed;
}

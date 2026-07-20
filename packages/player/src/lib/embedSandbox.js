// The one sandbox token that must never reach a rendered embed iframe --
// here, or in the editor's own preview (packages/editor/src/lib/embedSandbox.js,
// an intentionally identical copy of this file: editor and player are
// separately deployed apps that can't share a source import). It lets a
// popup opened from inside the iframe escape the sandbox's restrictions
// entirely, letting embedded content navigate/control the parent/top
// window -- see ARCHITECTURE.md 5.2's in-player containment rule. Strips
// it defensively even though nothing in this app currently lets an author
// type an arbitrary sandbox string; content authored another way (a
// direct API write, an older export, a future import path) could still
// carry it.
const UNSAFE_SANDBOX_TOKENS = new Set(['allow-popups-to-escape-sandbox']);

export function safeEmbedSandbox(sandbox, fallback) {
  return (sandbox || fallback || '')
    .split(' ')
    .filter((token) => token && !UNSAFE_SANDBOX_TOKENS.has(token))
    .join(' ');
}

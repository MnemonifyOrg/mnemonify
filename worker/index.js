const PROXY_PREFIXES = Object.freeze([
  '/api',
  '/uploads',
  '/player',
  '/player-assets',
  '/share',
  '/content',
]);

const PLAYER_SHELL_PATHS = Object.freeze(['/player', '/share']);
const PLAYER_ASSET_PREFIX = '/player-assets/';

export function isProxyPath(pathname) {
  return PROXY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isPlayerShellPath(pathname) {
  return PLAYER_SHELL_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function buildBackendUrl(requestUrl, backendBaseUrl) {
  const incoming = new URL(requestUrl);
  const backend = new URL(String(backendBaseUrl || ''));
  if (!['http:', 'https:'].includes(backend.protocol)) {
    throw new Error('RENDER_BACKEND_URL must use http or https.');
  }

  // RENDER_BACKEND_URL is an origin, not a path prefix. Preserve a trailing
  // base path if a staging proxy ever needs one, while keeping the browser's
  // original path and query string unchanged.
  const basePath = backend.pathname.replace(/\/$/, '');
  let requestPath = incoming.pathname;
  if (requestPath.startsWith(PLAYER_ASSET_PREFIX)) {
    // The editor owns /assets/* in its static output. Render exposes the
    // player bundle at /assets/*, so this proxy path avoids that collision.
    requestPath = `/assets/${requestPath.slice(PLAYER_ASSET_PREFIX.length)}`;
  }
  backend.pathname = `${basePath}${requestPath}`;
  backend.search = incoming.search;
  return backend.toString();
}

function rewritePlayerHtml(body) {
  return body
    .replaceAll('"/assets/', '"/player-assets/')
    .replaceAll("'/assets/", "'/player-assets/")
    .replaceAll('url(/assets/', 'url(/player-assets/');
}

function rewritePlayerAssetSrc(src) {
  if (src.startsWith('/assets/')) return `/player-assets/${src.slice('/assets/'.length)}`;
  if (src.startsWith('assets/')) return `player-assets/${src.slice('assets/'.length)}`;
  return src;
}

function rewriteCourseAssetPaths(course) {
  if (!course || !Array.isArray(course.assets)) return course;
  return {
    ...course,
    assets: course.assets.map((asset) => (
      typeof asset?.src === 'string'
        ? { ...asset, src: rewritePlayerAssetSrc(asset.src) }
        : asset
    )),
  };
}

async function rewritePlayerResponse(pathname, response) {
  const contentType = response.headers.get('content-type') || '';
  const isShell = isPlayerShellPath(pathname) && contentType.includes('text/html');
  const isCoursePayload = (
    pathname === '/content' || pathname.startsWith('/content/')
    || pathname.startsWith('/api/share-links/')
  ) && contentType.includes('application/json');

  if (!isShell && !isCoursePayload) return response;

  const body = await response.text();
  let rewritten = body;
  if (isShell) {
    rewritten = rewritePlayerHtml(body);
  } else {
    try {
      rewritten = JSON.stringify(rewriteCourseAssetPaths(JSON.parse(body)));
    } catch {
      // Preserve an upstream error/body exactly if it was not JSON after all.
      rewritten = body;
    }
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(rewritten, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function proxyRequest(request, env) {
  const pathname = new URL(request.url).pathname;
  const backendBaseUrl = env?.RENDER_BACKEND_URL;
  if (!backendBaseUrl) {
    return new Response('RENDER_BACKEND_URL is not configured.', { status: 500 });
  }

  try {
    const targetUrl = buildBackendUrl(request.url, backendBaseUrl);
    // Cloning the incoming Request onto the Render URL preserves method,
    // body, authorization headers, query strings, and session cookies.
    const upstreamRequest = new Request(targetUrl, request);
    const upstreamResponse = await fetch(upstreamRequest, { redirect: 'manual' });
    return rewritePlayerResponse(pathname, upstreamResponse);
  } catch (error) {
    console.error('[worker-proxy] Render request failed:', error);
    return new Response('Backend proxy request failed.', { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (isProxyPath(pathname)) return proxyRequest(request, env);
    return env.ASSETS.fetch(request);
  },
};

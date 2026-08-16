import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackendUrl,
  isPlayerShellPath,
  isProxyPath,
  onRequest,
} from './functions/[[path]].js';

test('proxy route matching covers backend and player paths only', () => {
  for (const path of ['/api/auth/me', '/uploads/course/file.png', '/player', '/player-assets/index.js', '/share/token', '/content/course-id']) {
    assert.equal(isProxyPath(path), true, path);
  }
  assert.equal(isProxyPath('/assets/index-editor.js'), false);
  assert.equal(isProxyPath('/src/main.jsx'), false);
  assert.equal(isPlayerShellPath('/player'), true);
  assert.equal(isPlayerShellPath('/share/token'), true);
  assert.equal(isPlayerShellPath('/api/share-links/token'), false);
});

test('proxy preserves path/query and rewrites the player asset collision path', () => {
  assert.equal(
    buildBackendUrl('https://editor.pages.dev/api/courses?id=1', 'https://mnemonify-api.onrender.com/'),
    'https://mnemonify-api.onrender.com/api/courses?id=1'
  );
  assert.equal(
    buildBackendUrl('https://editor.pages.dev/player-assets/index-abc.js', 'https://mnemonify-api.onrender.com'),
    'https://mnemonify-api.onrender.com/assets/index-abc.js'
  );
});

test('invalid backend URL schemes are rejected before fetch', () => {
  assert.throws(
    () => buildBackendUrl('https://editor.pages.dev/api/me', 'javascript:alert(1)'),
    /must use http or https/
  );
});

test('forwards a same-origin request and rewrites player shell asset URLs', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (request) => {
    forwarded = request;
    return new Response('<script src="/assets/player.js"></script>', {
      headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'mnemonify_session=test; Path=/' },
    });
  };

  try {
    const response = await onRequest({
      request: new Request('https://editor.pages.dev/player', {
        method: 'POST',
        headers: { cookie: 'mnemonify_session=browser-token' },
        body: 'forwarded body',
      }),
      env: { RENDER_BACKEND_URL: 'https://mnemonify-api.onrender.com' },
      next: () => { throw new Error('unexpected static fallback'); },
    });
    assert.equal(forwarded.url, 'https://mnemonify-api.onrender.com/player');
    assert.equal(forwarded.method, 'POST');
    assert.equal(forwarded.headers.get('cookie'), 'mnemonify_session=browser-token');
    assert.equal(await forwarded.text(), 'forwarded body');
    assert.match(await response.text(), /\/player-assets\/player\.js/);
    assert.equal(response.headers.get('set-cookie'), 'mnemonify_session=test; Path=/');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

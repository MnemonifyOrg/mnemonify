import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  buildBackendUrl,
  isProxyPath,
} from './worker/index.js';

test('Worker route matching covers proxy paths but leaves editor assets alone', () => {
  for (const path of ['/api/auth/me', '/uploads/course/file.png', '/player', '/player-assets/index.js', '/share/token', '/content/course-id']) {
    assert.equal(isProxyPath(path), true, path);
  }
  assert.equal(isProxyPath('/assets/index-editor.js'), false);
  assert.equal(isProxyPath('/src/main.jsx'), false);
});

test('Worker preserves query strings and maps player-assets to Render assets', () => {
  assert.equal(
    buildBackendUrl('https://editor.workers.dev/api/courses?id=1', 'https://mnemonify-api.onrender.com/'),
    'https://mnemonify-api.onrender.com/api/courses?id=1'
  );
  assert.equal(
    buildBackendUrl('https://editor.workers.dev/player-assets/index-abc.js', 'https://mnemonify-api.onrender.com'),
    'https://mnemonify-api.onrender.com/assets/index-abc.js'
  );
});

test('Worker forwards method/body/cookie and preserves response cookies while rewriting player HTML', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (request) => {
    forwarded = request;
    return new Response('<script src="/assets/player.js"></script>', {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'set-cookie': 'mnemonify_session=test; Path=/',
      },
    });
  };

  try {
    const response = await worker.fetch(
      new Request('https://editor.workers.dev/player?courseId=1', {
        method: 'POST',
        headers: { cookie: 'mnemonify_session=browser-token' },
        body: 'forwarded body',
      }),
      { RENDER_BACKEND_URL: 'https://mnemonify-api.onrender.com', ASSETS: { fetch: () => { throw new Error('unexpected asset fallback'); } } },
    );
    assert.equal(forwarded.url, 'https://mnemonify-api.onrender.com/player?courseId=1');
    assert.equal(forwarded.method, 'POST');
    assert.equal(forwarded.headers.get('cookie'), 'mnemonify_session=browser-token');
    assert.equal(await forwarded.text(), 'forwarded body');
    assert.match(await response.text(), /\/player-assets\/player\.js/);
    assert.equal(response.headers.get('set-cookie'), 'mnemonify_session=test; Path=/');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Worker falls through to the ASSETS binding for non-proxy requests', async () => {
  const assetResponse = new Response('editor shell');
  let receivedRequest;
  const response = await worker.fetch(
    new Request('https://editor.workers.dev/assets/index-editor.js'),
    {
      ASSETS: {
        fetch(request) {
          receivedRequest = request;
          return assetResponse;
        },
      },
    },
  );
  assert.equal(receivedRequest.url, 'https://editor.workers.dev/assets/index-editor.js');
  assert.equal(response, assetResponse);
});

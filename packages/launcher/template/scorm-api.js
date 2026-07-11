/*
  Minimal SCORM bridge for the Mnemonify thin launcher.

  The launcher runs same-origin with the LMS (it was uploaded into the LMS
  as the SCORM package), so it can discover API_1484_11 directly by walking
  window.parent per the SCORM 2004 spec. The Mnemonify player, however, runs
  in a nested iframe served from the content server -- a different origin in
  any real deployment -- so it cannot read API_1484_11 off this window
  directly (custom window properties aren't in the small set of properties
  the Same-Origin Policy allows cross-origin scripts to read).

  This script relays SCORM calls for the player over window.postMessage:
  the player posts a request, this script calls the real API_1484_11 (which
  it has direct, same-origin access to) and posts the result back.
*/
(function () {
  var CHANNEL = 'mnemonify-scorm';

  function findAPI(win) {
    var attempts = 0;
    var current = win;
    while (current && current.API_1484_11 == null && current.parent && current.parent !== current) {
      attempts += 1;
      if (attempts > 500) return null;
      current = current.parent;
    }
    return (current && current.API_1484_11) || null;
  }

  function discoverAPI() {
    var api = findAPI(window);
    if (!api && window.opener) {
      api = findAPI(window.opener);
    }
    return api;
  }

  var api = discoverAPI();

  if (!api) {
    console.warn('[mnemonify-launcher] No SCORM API_1484_11 found. Running outside an LMS?');
  }

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || msg.channel !== CHANNEL) return;
    var source = event.source;
    if (!source) return;

    if (msg.type === 'handshake') {
      source.postMessage({ channel: CHANNEL, type: 'handshake-ack', requestId: msg.requestId }, '*');
      return;
    }

    if (msg.type === 'call') {
      var result = null;
      try {
        if (api && typeof api[msg.method] === 'function') {
          result = api[msg.method].apply(api, msg.args || []);
        }
      } catch (err) {
        console.error('[mnemonify-launcher] SCORM API call failed:', msg.method, err);
        result = null;
      }
      source.postMessage({ channel: CHANNEL, type: 'call-response', requestId: msg.requestId, result: result }, '*');
    }
  });
})();

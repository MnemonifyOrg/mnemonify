/*
  SCORM 2004 3rd Edition module. This is the ONLY file in the player that
  touches API_1484_11 (ARCHITECTURE.md Section 7).

  The player is loaded inside the thin launcher's iframe, which is loaded
  inside the LMS's own frame. In a real deployment the player (served from
  the Mnemonify content server) and the launcher (hosted by the LMS/SCORM
  Cloud/Ethos) are different origins, so a direct `window.parent.parent.API_1484_11`
  property read is blocked by the browser's Same-Origin Policy — custom
  window properties are not in the small cross-origin-accessible allowlist
  (postMessage, location, close, closed, focus, blur, frames, length, top,
  parent, opener). Direct discovery only works when the launcher and content
  server happen to share an origin (e.g. local dev).

  So this module tries direct discovery first, and falls back to an async
  postMessage bridge (relayed by packages/launcher/template/scorm-api.js,
  which runs same-origin with the LMS and CAN reach API_1484_11 directly).
  Because the bridge path is inherently asynchronous, every method that talks
  to the LMS returns a Promise, even in the direct-access case, so callers
  have one consistent interface regardless of which transport is active.
*/

const SUSPEND_DATA_MAX_LENGTH = 64000;
const HANDSHAKE_TIMEOUT_MS = 2000;
const CALL_TIMEOUT_MS = 5000;
const CHANNEL = 'mnemonify-scorm';

let mode = null; // 'direct' | 'bridge' | null
let directApi = null;
let bridgeTargetWindow = null;
let requestCounter = 0;
let sessionStartTime = null;

function warnNoApi(method) {
  console.warn(`[scorm2004] ${method}() called but no SCORM API is available (standalone context)`);
}

function toBool(result) {
  return result === 'true' || result === true;
}

// Walks the window.parent chain per the SCORM 2004 API discovery algorithm.
export function findAPI(win) {
  let attempts = 0;
  let current = win;
  while (current && current.API_1484_11 == null && current.parent && current.parent !== current) {
    attempts += 1;
    if (attempts > 500) return null;
    current = current.parent;
  }
  return (current && current.API_1484_11) || null;
}

export function discoverDirectAPI(startWindow) {
  if (!startWindow) return null;
  let found = findAPI(startWindow);
  if (!found && startWindow.opener) {
    found = findAPI(startWindow.opener);
  }
  return found;
}

function tryBridgeHandshake(targetWindow, timeoutMs = HANDSHAKE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
      resolve(false);
      return;
    }
    const requestId = `handshake-${++requestCounter}`;
    const timeout = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(false);
    }, timeoutMs);

    function onMessage(event) {
      if (event.source !== targetWindow) return;
      const msg = event.data;
      if (!msg || msg.channel !== CHANNEL) return;
      if (msg.type === 'handshake-ack' && msg.requestId === requestId) {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        resolve(true);
      }
    }
    window.addEventListener('message', onMessage);
    targetWindow.postMessage({ channel: CHANNEL, type: 'handshake', requestId }, '*');
  });
}

function bridgeCall(method, args) {
  return new Promise((resolve, reject) => {
    const requestId = `call-${++requestCounter}`;
    const timeout = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error(`[scorm2004] bridge call "${method}" timed out`));
    }, CALL_TIMEOUT_MS);

    function onMessage(event) {
      if (event.source !== bridgeTargetWindow) return;
      const msg = event.data;
      if (!msg || msg.channel !== CHANNEL) return;
      if (msg.type === 'call-response' && msg.requestId === requestId) {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        resolve(msg.result);
      }
    }
    window.addEventListener('message', onMessage);
    bridgeTargetWindow.postMessage({ channel: CHANNEL, type: 'call', requestId, method, args }, '*');
  });
}

async function initialize() {
  mode = null;
  directApi = null;
  bridgeTargetWindow = null;

  if (typeof window === 'undefined') {
    return false;
  }

  directApi = discoverDirectAPI(window);
  if (directApi) {
    mode = 'direct';
    const result = directApi.Initialize('');
    return toBool(result);
  }

  if (window.parent && window.parent !== window) {
    const handshakeOk = await tryBridgeHandshake(window.parent);
    if (handshakeOk) {
      mode = 'bridge';
      bridgeTargetWindow = window.parent;
      const result = await bridgeCall('Initialize', ['']);
      return toBool(result);
    }
  }

  warnNoApi('initialize');
  return false;
}

async function getValue(key) {
  if (mode === 'direct') return directApi.GetValue(key);
  if (mode === 'bridge') return bridgeCall('GetValue', [key]);
  warnNoApi('getValue');
  return '';
}

async function setValue(key, value) {
  if (mode === 'direct') {
    const result = directApi.SetValue(key, value);
    directApi.Commit('');
    return toBool(result);
  }
  if (mode === 'bridge') {
    const result = await bridgeCall('SetValue', [key, value]);
    await bridgeCall('Commit', ['']);
    return toBool(result);
  }
  warnNoApi('setValue');
  return false;
}

async function commit() {
  if (mode === 'direct') return toBool(directApi.Commit(''));
  if (mode === 'bridge') return toBool(await bridgeCall('Commit', ['']));
  warnNoApi('commit');
  return false;
}

async function terminate(exitMode, successStatus, score) {
  if (mode === null) {
    warnNoApi('terminate');
    return false;
  }
  if (successStatus) {
    await setSuccess(successStatus);
  }
  if (score) {
    await setScore(score.raw, score.min, score.max, score.scaled);
  }
  await setValue('cmi.exit', exitMode);
  if (mode === 'direct') return toBool(directApi.Terminate(''));
  return toBool(await bridgeCall('Terminate', ['']));
}

async function setLocation(pageId) {
  return setValue('cmi.location', pageId);
}

async function getLocation() {
  return getValue('cmi.location');
}

function truncateToMostRecent(data) {
  const clone = { ...data };
  if (!clone.variables || typeof clone.variables !== 'object') {
    return JSON.stringify(clone).slice(0, SUSPEND_DATA_MAX_LENGTH);
  }
  const entries = Object.entries(clone.variables);

  // Insertion order approximates recency for a plain-object variable map,
  // so keeping the LAST n entries keeps the most recently-set variables.
  function serializeWithLastN(n) {
    const kept = n === 0 ? [] : entries.slice(entries.length - n);
    return JSON.stringify({ ...clone, variables: Object.fromEntries(kept) });
  }

  // Binary search for the largest n that still fits, instead of dropping
  // one variable at a time (which re-serializes the whole payload on every
  // step and is O(n^2) for large variable sets).
  let lo = 0;
  let hi = entries.length;
  let best = serializeWithLastN(0);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = serializeWithLastN(mid);
    if (candidate.length <= SUSPEND_DATA_MAX_LENGTH) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

async function setSuspendData(data) {
  let serialized = JSON.stringify(data);
  if (serialized.length > SUSPEND_DATA_MAX_LENGTH) {
    console.error(
      `[scorm2004] suspend_data exceeds ${SUSPEND_DATA_MAX_LENGTH} chars (${serialized.length}); truncating to most recent variable states`
    );
    serialized = truncateToMostRecent(data);
  }
  return setValue('cmi.suspend_data', serialized);
}

async function getSuspendData() {
  const raw = await getValue('cmi.suspend_data');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[scorm2004] failed to parse cmi.suspend_data, returning empty state', err);
    return {};
  }
}

async function setScore(raw, min, max, scaled) {
  const results = await Promise.all([
    setValue('cmi.score.raw', String(raw)),
    setValue('cmi.score.min', String(min)),
    setValue('cmi.score.max', String(max)),
    setValue('cmi.score.scaled', String(scaled)),
  ]);
  return results.every(Boolean);
}

async function setCompletion(status) {
  return setValue('cmi.completion_status', status);
}

async function setSuccess(status) {
  return setValue('cmi.success_status', status);
}

function startTimer() {
  sessionStartTime = Date.now();
}

function getSessionTime() {
  if (sessionStartTime == null) return 'PT0H0M0S';
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return `PT${hours}H${minutes}M${seconds}S`;
}

const scorm2004 = {
  initialize,
  getValue,
  setValue,
  commit,
  terminate,
  setLocation,
  getLocation,
  setSuspendData,
  getSuspendData,
  setScore,
  setCompletion,
  setSuccess,
  startTimer,
  getSessionTime,
};

export default scorm2004;

const EVENT_VERSION = 1;
const SESSION_ID_KEY = 'mnemonify.analytics.session_id';
const MAX_FIELD_LENGTH = 200;

let context = null;
let actorHashPromise = Promise.resolve(null);

function normalizeOptionalString(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_FIELD_LENGTH) {
    return undefined;
  }
  return value;
}

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function hashLearnerId(learnerId) {
  if (!learnerId || !globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(learnerId);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function configureAnalytics({ courseId, courseVersion, learnerId, endpoint }) {
  if (!courseId) {
    context = null;
    return;
  }
  context = {
    courseId,
    // versionId is optional in the standalone player. Do not serialize null
    // here: the server validator allows an omitted course_version, but not a
    // present non-string value such as null.
    courseVersion: normalizeOptionalString(courseVersion),
    endpoint: endpoint || `${window.location.origin}/api/events`,
    sessionId: getSessionId(),
  };
  actorHashPromise = hashLearnerId(learnerId);
}

export function resetAnalytics() {
  context = null;
  actorHashPromise = Promise.resolve(null);
}

export function track(eventType, { pageId, blockId, payload = {} } = {}) {
  if (!context) return;
  const eventContext = context;
  actorHashPromise.then((actorHash) => {
    const event = {
      event_version: EVENT_VERSION,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      course_id: eventContext.courseId,
      session_id: eventContext.sessionId,
      payload,
    };
    const optionalFields = {
      course_version: eventContext.courseVersion,
      page_id: pageId,
      block_id: blockId,
      actor_hash: actorHash,
    };
    for (const [field, value] of Object.entries(optionalFields)) {
      const normalized = normalizeOptionalString(value);
      if (normalized !== undefined) event[field] = normalized;
    }
    return fetch(eventContext.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });
  }).catch(() => {});
}

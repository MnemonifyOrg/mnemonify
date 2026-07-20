const EVENT_TYPES = new Set([
  'resource_opened', 'media_play', 'media_pause', 'media_scrub', 'media_complete',
  'media_dropoff', 'block_interaction', 'page_enter', 'page_exit',
  'knowledge_check_attempt', 'continue_clicked', 'course_complete',
]);

const MAX_PAYLOAD_BYTES = 16 * 1024;

export function validateAnalyticsEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Event must be an object.';
  if (input.event_version !== 1) return 'Unsupported event_version.';
  if (typeof input.event_type !== 'string' || !EVENT_TYPES.has(input.event_type)) return 'Unsupported event_type.';
  if (typeof input.course_id !== 'string' || input.course_id.length === 0 || input.course_id.length > 200) {
    return 'course_id must be a non-empty string of 200 characters or fewer.';
  }
  if (input.course_version !== undefined && (typeof input.course_version !== 'string' || input.course_version.length > 200)) {
    return 'course_version must be a string of 200 characters or fewer.';
  }
  for (const field of ['page_id', 'block_id', 'session_id', 'actor_hash']) {
    if (input[field] !== undefined && (typeof input[field] !== 'string' || input[field].length > 200)) {
      return `${field} must be a string of 200 characters or fewer.`;
    }
  }
  if (input.payload !== undefined && (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload))) {
    return 'payload must be an object.';
  }
  let payloadBytes;
  try {
    payloadBytes = Buffer.byteLength(JSON.stringify(input.payload || {}), 'utf8');
  } catch {
    return 'payload must be JSON-serializable.';
  }
  if (payloadBytes > MAX_PAYLOAD_BYTES) return 'payload exceeds the 16KB limit.';
  if (input.occurred_at !== undefined && Number.isNaN(Date.parse(input.occurred_at))) {
    return 'occurred_at must be a valid ISO timestamp.';
  }
  return null;
}

export { EVENT_TYPES, MAX_PAYLOAD_BYTES };

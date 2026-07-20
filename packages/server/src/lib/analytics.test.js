import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnalyticsEvent } from './analytics.js';

const validEvent = {
  event_version: 1,
  event_type: 'page_enter',
  course_id: 'crs_sample',
  session_id: 'session-1',
  actor_hash: 'a'.repeat(64),
  payload: { source: 'player' },
};

test('accepts a versioned bounded analytics event', () => {
  assert.equal(validateAnalyticsEvent(validEvent), null);
});

test('rejects unknown event types and unsupported versions', () => {
  assert.equal(validateAnalyticsEvent({ ...validEvent, event_type: 'learner_name' }), 'Unsupported event_type.');
  assert.equal(validateAnalyticsEvent({ ...validEvent, event_version: 2 }), 'Unsupported event_version.');
});

test('does not require or store a raw learner identifier', () => {
  assert.equal(validateAnalyticsEvent({ ...validEvent, learner_id: 'raw-id' }), null);
  assert.equal(validateAnalyticsEvent({ ...validEvent, payload: { value: 'x'.repeat(16 * 1024) } }), 'payload exceeds the 16KB limit.');
});

test('rejects malformed timestamps and payloads', () => {
  assert.equal(validateAnalyticsEvent({ ...validEvent, occurred_at: 'not-a-date' }), 'occurred_at must be a valid ISO timestamp.');
  assert.equal(validateAnalyticsEvent({ ...validEvent, payload: ['not-an-object'] }), 'payload must be an object.');
});

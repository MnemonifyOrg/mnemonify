import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NAV_MODE, resolveNavMode } from './navigation.js';

test('navigation mode defaults to linear when a legacy course omits nav_mode', () => {
  assert.equal(DEFAULT_NAV_MODE, 'linear');
  assert.equal(resolveNavMode({}), 'linear');
  assert.equal(resolveNavMode(undefined), 'linear');
});

test('explicit free navigation remains free', () => {
  assert.equal(resolveNavMode({ nav_mode: 'free' }), 'free');
  assert.equal(resolveNavMode({ nav_mode: 'linear' }), 'linear');
});

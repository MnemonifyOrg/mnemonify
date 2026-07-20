import { describe, expect, it } from 'vitest';
import * as mediaManager from './mediaManager.js';

function fakeMediaElement() {
  const listeners = new Map();
  return {
    currentTime: 0,
    paused: false,
    ended: false,
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    pause() {
      this.paused = true;
    },
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    emit(type) {
      listeners.get(type)?.();
    },
  };
}

describe('media timeline triggers', () => {
  it('pauses and fires once when playback crosses a marker', () => {
    const element = fakeMediaElement();
    const reached = [];
    mediaManager.register('video-test', element, {
      timelineTriggers: [{ trigger_id: 'trg_5s', at_seconds: 5, actions: [] }],
      onTimeReached: (trigger, timestamp) => reached.push({ trigger, timestamp }),
    });

    element.currentTime = 4.6;
    element.emit('timeupdate');
    element.currentTime = 5.1;
    element.emit('timeupdate');
    element.currentTime = 5.4;
    element.emit('timeupdate');

    expect(element.paused).toBe(true);
    expect(reached).toHaveLength(1);
    expect(reached[0].trigger.trigger_id).toBe('trg_5s');
    mediaManager.unregister('video-test');
  });

  it('allows a marker to fire again after seeking before it', () => {
    const element = fakeMediaElement();
    let count = 0;
    mediaManager.register('video-seek-test', element, {
      timelineTriggers: [{ trigger_id: 'trg_5s_again', at_seconds: 5, actions: [] }],
      onTimeReached: () => {
        count += 1;
      },
    });
    element.currentTime = 5.1;
    element.emit('timeupdate');
    mediaManager.seek('video-seek-test', 2);
    element.paused = false;
    element.currentTime = 5.1;
    element.emit('timeupdate');

    expect(count).toBe(2);
    mediaManager.unregister('video-seek-test');
  });
});

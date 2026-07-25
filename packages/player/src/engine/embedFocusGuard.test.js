import { describe, expect, it, vi } from 'vitest';
import { installEmbedFocusGuard } from './embedFocusGuard.js';

function fakeEnvironment() {
  const iframeEvents = {};
  const documentEvents = {};
  const iframe = {
    addEventListener: vi.fn((name, handler) => { iframeEvents[name] = handler; }),
    removeEventListener: vi.fn(),
  };
  const documentRef = {
    activeElement: null,
    querySelectorAll: () => [iframe],
    addEventListener: vi.fn((name, handler) => { documentEvents[name] = handler; }),
    removeEventListener: vi.fn(),
  };
  const scrollTarget = {
    scrollX: 18,
    scrollY: 240,
    scrollTo: vi.fn(),
    setInterval: vi.fn((handler) => { scrollTarget.poll = handler; return 7; }),
    clearInterval: vi.fn(),
    poll: null,
  };
  return { documentRef, iframe, iframeEvents, documentEvents, scrollTarget };
}

describe('embed focus guard', () => {
  it('restores the pre-focus position instead of forcing the page to zero', () => {
    const environment = fakeEnvironment();
    const cleanup = installEmbedFocusGuard(environment);

    environment.iframeEvents.load();
    expect(environment.scrollTarget.scrollTo).toHaveBeenCalledWith(18, 240);

    environment.documentRef.activeElement = environment.iframe;
    environment.scrollTarget.poll();
    expect(environment.scrollTarget.scrollTo).toHaveBeenCalledWith(18, 240);
    cleanup();
  });

  it('stops correcting after deliberate pointer interaction', () => {
    const environment = fakeEnvironment();
    const cleanup = installEmbedFocusGuard(environment);
    environment.documentEvents.pointerdown();
    environment.iframeEvents.load();
    expect(environment.scrollTarget.scrollTo).not.toHaveBeenCalled();
    cleanup();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { installEmbedFocusGuard } from './embedFocusGuard.js';

describe('editor embed focus guard', () => {
  it('restores the editor center panel position after an unsolicited preview focus', () => {
    const iframeEvents = {};
    const iframe = { addEventListener: vi.fn((name, handler) => { iframeEvents[name] = handler; }), removeEventListener: vi.fn() };
    const documentRef = {
      activeElement: null,
      querySelectorAll: () => [iframe],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const scrollPanel = { scrollLeft: 0, scrollTop: 180 };
    const cleanup = installEmbedFocusGuard({ documentRef, scrollTarget: scrollPanel });

    scrollPanel.scrollTop = 600;
    iframeEvents.load();
    expect(scrollPanel.scrollTop).toBe(180);
    cleanup();
  });
});

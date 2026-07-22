import { describe, expect, it, vi } from 'vitest';
import { resetPageScroll } from './scroll.js';

describe('page scroll reset', () => {
  it('resets the window and document scroll positions', () => {
    const targetWindow = { scrollTo: vi.fn() };
    const targetDocument = { documentElement: { scrollTop: 240 }, body: { scrollTop: 240 } };

    resetPageScroll(targetWindow, targetDocument);

    expect(targetWindow.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(targetDocument.documentElement.scrollTop).toBe(0);
    expect(targetDocument.body.scrollTop).toBe(0);
  });
});

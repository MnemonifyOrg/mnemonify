import { afterEach, describe, expect, it } from 'vitest';
import { resolveCaptionUrl, resolvePlayerUrl } from './runtimeUrl.js';

afterEach(() => {
  delete globalThis.window;
});

describe('player runtime URLs', () => {
  it('preserves live same-origin resolution for logical storage paths', () => {
    globalThis.window = {};
    expect(resolvePlayerUrl('uploads/course/image.png')).toBe('/uploads/course/image.png');
    expect(resolveCaptionUrl('ast_1')).toBe('/api/assets/ast_1/captions/caption.vtt');
  });

  it('resolves embedded assets and caption tracks relative to the package root', () => {
    globalThis.window = {
      __MNEMONIFY_EMBEDDED__: true,
      __MNEMONIFY_EMBEDDED_CAPTIONS__: { ast_1: { caption: 'captions/ast_1.vtt' } },
    };
    expect(resolvePlayerUrl('course-assets/ast_1/image.png')).toBe('./course-assets/ast_1/image.png');
    expect(resolveCaptionUrl('ast_1')).toBe('./captions/ast_1.vtt');
  });
});

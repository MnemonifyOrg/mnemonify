import { afterEach, describe, expect, it } from 'vitest';
import { readEmbeddedJson, resolveCaptionUrl, resolvePlayerUrl } from './runtimeUrl.js';

afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
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

  it('can read a JSON script block without executing an inline assignment', () => {
    globalThis.window = {};
    globalThis.document = {
      getElementById: (id) => id === 'mnemonify-course-data'
        ? { textContent: '{"content":"<b>bold</b>"}' }
        : null,
    };
    expect(readEmbeddedJson('__MNEMONIFY_COURSE_DATA__', 'mnemonify-course-data')).toEqual({ content: '<b>bold</b>' });
  });
});

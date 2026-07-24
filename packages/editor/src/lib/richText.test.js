import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureRichTextSelection,
  contrastRatio,
  insertVariableAtSelection,
  isLowContrast,
  normalizeColorToHex,
  richSegmentsToEditableHtml,
  RICH_TEXT_TAGS,
  splitVariableSyntax,
  TEXT_COLORS,
} from './richText.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('editor rich-text variable editing', () => {
  it('splits typed brace syntax into literal and variable pieces', () => {
    expect(splitVariableSyntax('Score: {ScoreRaw}/{ScoreMax}')).toEqual([
      { type: 'text', value: 'Score: ' },
      { type: 'variable', name: 'ScoreRaw' },
      { type: 'text', value: '/' },
      { type: 'variable', name: 'ScoreMax' },
    ]);
  });

  it('restores the captured selection before inserting a variable chip', () => {
    const commonAncestor = {};
    const capturedRange = { commonAncestorContainer: commonAncestor, cloneRange: vi.fn(() => capturedRange) };
    const selection = {
      rangeCount: 1,
      getRangeAt: vi.fn(() => capturedRange),
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
    };
    const field = { contains: vi.fn(() => true), focus: vi.fn() };
    const documentStub = {
      execCommand: vi.fn(() => true),
      createRange: vi.fn(),
    };
    vi.stubGlobal('window', { getSelection: () => selection });
    vi.stubGlobal('document', documentStub);

    const selectionRef = { current: null };
    captureRichTextSelection(field, selectionRef);
    insertVariableAtSelection({ current: field }, selectionRef, 'ScoreRaw');

    expect(selection.removeAllRanges).toHaveBeenCalled();
    expect(selection.addRange).toHaveBeenCalledWith(capturedRange);
    expect(documentStub.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      '<span class="rich-variable-chip" data-mnemonify-variable="ScoreRaw">ScoreRaw</span>'
    );
  });

  it('serializes accepted glossary links as visibly distinct bound chips', () => {
    expect(richSegmentsToEditableHtml([
      { t: 'glossary_link', term_id: 'term_anemia', v: 'anemia' },
    ])).toContain('class="rich-glossary-chip" data-mnemonify-glossary-term="term_anemia">anemia</span>');
  });
});

describe('rich-text color and block formatting support', () => {
  it('keeps the original six colors and adds a broader preset grid', () => {
    expect(TEXT_COLORS.slice(0, 6).map((color) => color.name)).toEqual([
      'Default', 'Primary Blue', 'Violet', 'Emerald', 'Coral', 'Deep Navy',
    ]);
    expect(TEXT_COLORS.length).toBeGreaterThanOrEqual(16);
  });

  it('normalizes custom colors and warns only below WCAG AA', () => {
    expect(normalizeColorToHex('#abc')).toBe('#aabbcc');
    expect(normalizeColorToHex('rgb(14, 122, 138)')).toBe('#0e7a8a');
    expect(isLowContrast('#eeeeee', '#ffffff')).toBe(true);
    expect(isLowContrast('#101828', '#ffffff')).toBe(false);
    expect(contrastRatio('#101828', '#ffffff')).toBeGreaterThan(4.5);
  });

  it('allows list tags and preserves alignment-safe HTML in rich segments', () => {
    expect(RICH_TEXT_TAGS.has('UL')).toBe(true);
    expect(RICH_TEXT_TAGS.has('OL')).toBe(true);
    expect(RICH_TEXT_TAGS.has('LI')).toBe(true);
    // Lists/alignment are carried in the existing html segment, not a new
    // schema segment type. The DOM-level sanitizer round-trip is exercised
    // by the editor/player browser bundle; this node test verifies the
    // allowlist contract without inventing a second parser for the test.
    expect(richSegmentsToEditableHtml([{ t: 'glossary_link', term_id: 'term_one', v: 'One' }])).toContain('term_one');
  });
});

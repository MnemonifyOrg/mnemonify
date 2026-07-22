import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureRichTextSelection, insertVariableAtSelection, splitVariableSyntax } from './richText.js';

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
});

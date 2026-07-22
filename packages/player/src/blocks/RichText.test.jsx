import { describe, expect, it } from 'vitest';
import { interpolateText } from './RichText.jsx';

describe('rich-text variable interpolation', () => {
  it('resolves typed variable syntax alongside literal text', () => {
    expect(interpolateText('You scored {ScoreRaw} of {ScoreMax} ({ScorePercent}%)', {
      ScoreRaw: 3,
      ScoreMax: 4,
      ScorePercent: 75,
    })).toEqual([
      { type: 'text', value: 'You scored ' },
      { type: 'variable', name: 'ScoreRaw', value: '3' },
      { type: 'text', value: ' of ' },
      { type: 'variable', name: 'ScoreMax', value: '4' },
      { type: 'text', value: ' (' },
      { type: 'variable', name: 'ScorePercent', value: '75' },
      { type: 'text', value: '%)' },
    ]);
  });

  it('renders unresolved typed variables as empty values', () => {
    expect(interpolateText('Before {DeletedVariable} after', {})).toEqual([
      { type: 'text', value: 'Before ' },
      { type: 'variable', name: 'DeletedVariable', value: '' },
      { type: 'text', value: ' after' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StyledSelect from './StyledSelect.jsx';
import MultiSelectCheckbox from './MultiSelectCheckbox.jsx';
import { filterMultiSelectOptions, getNextOptionIndex, getOptionIndex, selectedCountLabel, toggleSelectedValue } from '../lib/styledControls.js';

globalThis.React = React;

const options = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
];

describe('StyledSelect', () => {
  it('shows the current option and exposes an accessible listbox trigger', () => {
    const html = renderToStaticMarkup(<StyledSelect options={options} value="two" onChange={() => {}} ariaLabel="Example select" />);
    expect(html).toContain('Two');
    expect(html).toContain('aria-label="Example select"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('wraps keyboard navigation and starts at the selected option', () => {
    expect(getOptionIndex(options, 'three')).toBe(2);
    expect(getNextOptionIndex(options.length, 2, 1)).toBe(0);
    expect(getNextOptionIndex(options.length, 0, -1)).toBe(2);
  });
});

describe('MultiSelectCheckbox', () => {
  it('shows a selected-count summary and supports multi-select semantics', () => {
    const html = renderToStaticMarkup(
      <MultiSelectCheckbox options={options} value={['one', 'three']} onChange={() => {}} ariaLabel="Objectives" />
    );
    expect(html).toContain('2 selected');
    expect(html).toContain('aria-label="Objectives"');
    expect(html).toContain('aria-haspopup="listbox"');
  });

  it('toggles values without modifier-key semantics and filters long option lists', () => {
    expect(toggleSelectedValue(['one'], 'two')).toEqual(['one', 'two']);
    expect(toggleSelectedValue(['one', 'two'], 'one')).toEqual(['two']);
    expect(selectedCountLabel(0)).toBe('None selected');
    expect(selectedCountLabel(2)).toBe('2 selected');

    const longOptions = Array.from({ length: 9 }, (_, index) => ({ value: `obj_${index}`, label: `Objective ${index}` }));
    expect(filterMultiSelectOptions(longOptions, 'objective 8')).toEqual([longOptions[8]]);
    const html = renderToStaticMarkup(<MultiSelectCheckbox options={longOptions} value={[]} onChange={() => {}} placeholder="None selected" />);
    expect(html).toContain('None selected');
  });
});

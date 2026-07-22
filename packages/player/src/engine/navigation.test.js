import { describe, expect, it } from 'vitest';
import { getPageStatus } from './navigation.js';

const pages = [{ page_id: 'pg-1' }, { page_id: 'pg-2' }, { page_id: 'pg-3' }];

describe('linear page navigation status', () => {
  it('locks future pages before the first page is complete', () => {
    expect(getPageStatus({ pageId: 'pg-2', pages, navMode: 'linear' })).toBe('locked');
  });

  it('unlocks exactly the next page after a contiguous completion', () => {
    expect(getPageStatus({ pageId: 'pg-2', pages, navMode: 'linear', completedPageIds: ['pg-1'] })).toBe('not-visited');
  });

  it('does not let stale visited state bypass a missing predecessor', () => {
    expect(getPageStatus({ pageId: 'pg-3', pages, navMode: 'linear', visitedPageIds: ['pg-3'], completedPageIds: ['pg-1'] })).toBe('locked');
  });

  it('allows previous pages and preserves their status', () => {
    expect(getPageStatus({ pageId: 'pg-1', pages, navMode: 'linear', completedPageIds: ['pg-1', 'pg-2'] })).toBe('completed');
    expect(getPageStatus({ pageId: 'pg-2', pages, navMode: 'linear', completedPageIds: ['pg-1', 'pg-2'] })).toBe('completed');
  });

  it('does not lock pages in free navigation mode', () => {
    expect(getPageStatus({ pageId: 'pg-3', pages, navMode: 'free' })).toBe('not-visited');
  });
});

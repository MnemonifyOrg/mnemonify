import { describe, expect, it } from 'vitest';
import { getGroupPagesInCourseOrder } from './NavDrawer.jsx';

const pages = [
  { page_id: 'page-3', title: 'Third page' },
  { page_id: 'page-1', title: 'First page' },
  { page_id: 'page-2', title: 'Second page' },
];

describe('NavDrawer grouped page ordering', () => {
  it('uses course.pages order while page_ids only define membership', () => {
    const group = { group_id: 'module-1', page_ids: ['page-2', 'page-3', 'page-1'] };

    expect(getGroupPagesInCourseOrder(group, pages).map((page) => page.page_id)).toEqual([
      'page-3',
      'page-1',
      'page-2',
    ]);
  });

  it('reflects a saved page reorder without rebuilding the navigation structure', () => {
    const group = { group_id: 'module-1', page_ids: ['page-1', 'page-2', 'page-3'] };
    const reorderedPages = [pages[1], pages[2], pages[0]];

    expect(getGroupPagesInCourseOrder(group, reorderedPages).map((page) => page.page_id)).toEqual([
      'page-1',
      'page-2',
      'page-3',
    ]);
  });
});

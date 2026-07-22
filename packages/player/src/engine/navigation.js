export function getPageStatus({ pageId, pages = [], navMode = 'free', completedPageIds = [], visitedPageIds = [] }) {
  if (navMode === 'linear') {
    const targetIndex = pages.findIndex((page) => page.page_id === pageId);
    if (targetIndex >= 0) {
      const completed = new Set(completedPageIds);
      let frontier = 0;
      while (frontier < pages.length && completed.has(pages[frontier].page_id)) frontier += 1;
      if (targetIndex > frontier) return 'locked';
    }
  }
  if (completedPageIds.includes(pageId)) return 'completed';
  if (visitedPageIds.includes(pageId)) return 'in-progress';
  return 'not-visited';
}

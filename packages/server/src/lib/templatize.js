// Replaces the text content of every block with a labeled placeholder while
// preserving block structure, block types, trigger logic, and ids -- used
// by POST /api/courses/:id/save-as-template. Recurses into accordion/tabs
// body_blocks since those are themselves full block objects.
function templatizeBlock(block) {
  const content = block.content || {};
  let newContent;

  switch (block.type) {
    case 'text':
      newContent = {
        ...content,
        rich_text: (content.rich_text || []).map((segment) =>
          segment.t === 'text' ? { ...segment, v: '[Body text here]' } : segment
        ),
      };
      break;
    case 'heading':
      newContent = { ...content, text: '[Heading text here]' };
      break;
    case 'image':
      newContent = { ...content, asset_id: null };
      break;
    case 'list':
      newContent = { ...content, items: (content.items || []).map(() => '[List item here]') };
      break;
    case 'accordion':
      newContent = {
        ...content,
        items: (content.items || []).map((item) => ({
          ...item,
          title: '[Accordion title here]',
          body_blocks: (item.body_blocks || []).map(templatizeBlock),
        })),
      };
      break;
    case 'tabs':
      newContent = {
        ...content,
        items: (content.items || []).map((item) => ({
          ...item,
          label: '[Tab label here]',
          body_blocks: (item.body_blocks || []).map(templatizeBlock),
        })),
      };
      break;
    case 'knowledge-check':
      newContent = {
        ...content,
        question: '[Question text here]',
        options: (content.options || []).map((option) => ({ ...option, text: '[Answer option here]' })),
      };
      break;
    case 'carousel':
      newContent = { ...content, asset_ids: [] };
      break;
    default:
      newContent = content;
  }

  return { ...block, content: newContent };
}

export function templatizeCourse(courseJson) {
  const clone = JSON.parse(JSON.stringify(courseJson));
  clone.pages = (clone.pages || []).map((page) => ({
    ...page,
    blocks: (page.blocks || []).map(templatizeBlock),
  }));
  return clone;
}

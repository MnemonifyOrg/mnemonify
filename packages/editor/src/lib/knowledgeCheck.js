import { getCorrectOptionIds } from '@mnemonify/schema/knowledge-check.js';

function optionIdsForContent(content) {
  return getCorrectOptionIds(content).filter((id) => (content.options || []).some((option) => option.id === id));
}

export function updateKnowledgeCheckSelectionMode(block, multiSelect) {
  const correctIds = optionIdsForContent(block.content);
  const options = (block.content.options || []).map((option) => ({ ...option, correct: correctIds.includes(option.id) }));
  const content = { ...block.content, options, multi_select: multiSelect };
  if (multiSelect) {
    content.correct_option_ids = correctIds;
    content.feedback_mode = block.content.feedback_mode === 'per_option' ? 'per_option' : 'summary';
    delete content.correct_option_id;
  } else {
    content.correct_option_id = correctIds[0] || options[0]?.id;
    delete content.correct_option_ids;
    delete content.feedback_mode;
  }
  return { ...block, content };
}

export function updateKnowledgeCheckCorrectOptions(block, optionIds) {
  const allowedIds = new Set((block.content.options || []).map((option) => option.id));
  const correctIds = [...new Set((optionIds || []).filter((id) => allowedIds.has(id)))];
  const options = (block.content.options || []).map((option) => ({ ...option, correct: correctIds.includes(option.id) }));
  const content = { ...block.content, options };
  if (block.content.multi_select === true) content.correct_option_ids = correctIds;
  else content.correct_option_id = correctIds[0] || options[0]?.id;
  return { ...block, content };
}

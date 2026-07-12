// Shared between Word export and import so the two directions can never
// drift apart: getFieldRows() enumerates every editable field on a block
// (used to build the export table), and applyFieldValue() writes a value
// for a given block_id + field_name back into the course JSON (used by
// import). Every row's Notes column is "{block_id}:{field_name}" -- that
// exact pairing is what getFieldRows() emits and applyFieldValue() expects.

export function getFieldRows(block, assets) {
  const c = block.content || {};
  const rows = [];

  switch (block.type) {
    case 'text':
      rows.push({ field: 'body', label: 'Body', value: c.rich_text?.[0]?.v || '' });
      break;
    case 'heading':
      rows.push({ field: 'heading_text', label: 'Heading Text', value: c.text || '' });
      break;
    case 'image': {
      const asset = (assets || []).find((a) => a.asset_id === c.asset_id);
      rows.push({ field: 'alt', label: 'Alt Text', value: asset?.alt || '' });
      rows.push({ field: 'caption', label: 'Caption', value: asset?.caption || '' });
      break;
    }
    case 'list':
      (c.items || []).forEach((item, i) => {
        rows.push({ field: `item_${i + 1}`, label: `Item ${i + 1}`, value: item || '' });
      });
      break;
    case 'accordion':
      (c.items || []).forEach((item, i) => {
        rows.push({ field: `item_${i + 1}_title`, label: `Item ${i + 1} Title`, value: item.title || '' });
        rows.push({
          field: `item_${i + 1}_body`,
          label: `Item ${i + 1} Body`,
          value: item.body_blocks?.find((b) => b.type === 'text')?.content.rich_text?.[0]?.v || '',
        });
      });
      break;
    case 'tabs':
      (c.items || []).forEach((item, i) => {
        rows.push({ field: `tab_${i + 1}_label`, label: `Tab ${i + 1} Label`, value: item.label || '' });
        rows.push({
          field: `tab_${i + 1}_body`,
          label: `Tab ${i + 1} Body`,
          value: item.body_blocks?.find((b) => b.type === 'text')?.content.rich_text?.[0]?.v || '',
        });
      });
      break;
    case 'knowledge-check':
      rows.push({ field: 'question', label: 'Question', value: c.question || '' });
      (c.options || []).forEach((opt, i) => {
        rows.push({ field: `option_${i + 1}_text`, label: `Option ${i + 1}`, value: opt.text || '' });
        rows.push({
          field: `option_${i + 1}_correct`,
          label: `Option ${i + 1} Correct? (yes/no)`,
          value: opt.correct ? 'yes' : 'no',
        });
      });
      rows.push({ field: 'correct_feedback', label: 'Correct Feedback', value: c.correct_feedback || '' });
      rows.push({ field: 'incorrect_feedback', label: 'Incorrect Feedback', value: c.incorrect_feedback || '' });
      break;
    default:
      break;
  }

  return rows;
}

// Human-readable label for the "Block Type" column. knowledge-check is
// deliberately rendered with an underscore here per the documented Word
// template format; block.type itself (used for block_id lookups) is
// unaffected.
export function blockTypeLabel(type) {
  return type === 'knowledge-check' ? 'knowledge_check' : type;
}

function findBlock(courseJson, blockId) {
  function walkBlocks(blocks) {
    for (const block of blocks) {
      if (block.block_id === blockId) return block;
      for (const item of block.content?.items || []) {
        if (item.body_blocks) {
          const found = walkBlocks(item.body_blocks);
          if (found) return found;
        }
      }
    }
    return null;
  }
  for (const page of courseJson.pages || []) {
    const found = walkBlocks(page.blocks);
    if (found) return found;
  }
  return null;
}

// Mutates courseJson with `value` applied at block_id's field_name.
// Returns { applied, oldValue }. applied is false if the block or field
// couldn't be resolved (the caller flags this row for review rather than
// silently dropping it).
export function applyFieldValue(courseJson, blockId, fieldName, value) {
  const block = findBlock(courseJson, blockId);
  if (!block) return { applied: false, oldValue: null };

  const oldRow = getFieldRows(block, courseJson.assets).find((r) => r.field === fieldName);
  const oldValue = oldRow ? oldRow.value : null;

  const applied = applyToBlock(block, fieldName, value, courseJson);
  return { applied, oldValue };
}

function applyToBlock(block, fieldName, value, courseJson) {
  const c = block.content;

  if (block.type === 'text' && fieldName === 'body') {
    c.rich_text = [{ t: 'text', v: value }];
    return true;
  }
  if (block.type === 'heading' && fieldName === 'heading_text') {
    c.text = value;
    return true;
  }
  if (block.type === 'image' && (fieldName === 'alt' || fieldName === 'caption')) {
    const asset = (courseJson.assets || []).find((a) => a.asset_id === c.asset_id);
    if (!asset) return false;
    asset[fieldName] = value;
    return true;
  }
  if (block.type === 'list') {
    const m = fieldName.match(/^item_(\d+)$/);
    if (m && c.items[Number(m[1]) - 1] !== undefined) {
      c.items[Number(m[1]) - 1] = value;
      return true;
    }
  }
  if (block.type === 'accordion') {
    const mTitle = fieldName.match(/^item_(\d+)_title$/);
    const mBody = fieldName.match(/^item_(\d+)_body$/);
    if (mTitle && c.items[Number(mTitle[1]) - 1]) {
      c.items[Number(mTitle[1]) - 1].title = value;
      return true;
    }
    if (mBody && c.items[Number(mBody[1]) - 1]) {
      setBodyText(c.items[Number(mBody[1]) - 1], value);
      return true;
    }
  }
  if (block.type === 'tabs') {
    const mLabel = fieldName.match(/^tab_(\d+)_label$/);
    const mBody = fieldName.match(/^tab_(\d+)_body$/);
    if (mLabel && c.items[Number(mLabel[1]) - 1]) {
      c.items[Number(mLabel[1]) - 1].label = value;
      return true;
    }
    if (mBody && c.items[Number(mBody[1]) - 1]) {
      setBodyText(c.items[Number(mBody[1]) - 1], value);
      return true;
    }
  }
  if (block.type === 'knowledge-check') {
    if (fieldName === 'question') {
      c.question = value;
      return true;
    }
    if (fieldName === 'correct_feedback' || fieldName === 'incorrect_feedback') {
      c[fieldName] = value;
      return true;
    }
    const mText = fieldName.match(/^option_(\d+)_text$/);
    const mCorrect = fieldName.match(/^option_(\d+)_correct$/);
    if (mText && c.options[Number(mText[1]) - 1]) {
      c.options[Number(mText[1]) - 1].text = value;
      return true;
    }
    if (mCorrect && c.options[Number(mCorrect[1]) - 1]) {
      c.options[Number(mCorrect[1]) - 1].correct = /^y(es)?$/i.test(value.trim());
      return true;
    }
  }
  return false;
}

function setBodyText(item, text) {
  const existing = item.body_blocks?.find((b) => b.type === 'text');
  if (existing) {
    existing.content = { rich_text: [{ t: 'text', v: text }] };
  } else {
    item.body_blocks = [
      { block_id: `blk_${Math.random().toString(36).slice(2, 8)}`, type: 'text', content: { rich_text: [{ t: 'text', v: text }] }, triggers: [] },
    ];
  }
}

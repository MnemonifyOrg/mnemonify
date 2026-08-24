import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCourse, getBlockingFindings } from './index.js';
import { MEDIA_SIZE_WARNING_BYTES } from './rules.js';

function headingBlock(id = 'blk_heading', text = 'A heading') {
  return { block_id: id, type: 'heading', content: { text: [{ t: 'text', v: text }] } };
}

function baseCourse(overrides = {}) {
  return {
    schema_version: 7,
    meta: {
      course_id: 'crs_analyzer',
      title: 'Analyzer test course',
      theme: { accent: '#123456' },
      page_groups: [],
      resources: [],
      utility_bar: { custom: [] },
    },
    variables: [],
    assets: [],
    question_banks: [],
    linked_entities: [],
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [headingBlock()] }],
    ...overrides,
  };
}

function findingsFor(course, ruleId, options) {
  return analyzeCourse(course, options).filter((finding) => finding.ruleId === ruleId);
}

test('clean current-schema course produces no findings and findings carry the required model', () => {
  const course = baseCourse({
    assets: [
      { asset_id: 'ast_image', kind: 'image', src: 'uploads/slide.png', alt: 'A slide' },
      { asset_id: 'ast_video', kind: 'video', src: 'uploads/case.mp4', alt: 'Case video', caption_status: 'ready', transcript_status: 'ready' },
    ],
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [
        headingBlock(),
        { block_id: 'blk_embed', type: 'embed', content: { url: 'https://example.org', label: 'Reference site' } },
      ],
    }],
  });

  const findings = analyzeCourse(course, { uploadedAssetIds: ['ast_image', 'ast_video'] });
  assert.deepEqual(findings, []);
});

test('broken references are surfaced as reference errors from the dependency index', () => {
  const course = baseCourse({
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [{
        block_id: 'blk_text',
        type: 'text',
        content: { rich_text: [] },
        triggers: [{
          trigger_id: 'trg_one',
          event: 'onClick',
          actions: [{ action: 'JUMP_TO_PAGE', target: 'pg_missing' }],
        }],
      }],
    }],
  });
  const findings = findingsFor(course, 'broken_ref.page_target_missing');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'error');
  assert.equal(findings[0].category, 'reference');
  assert.deepEqual(findings[0].location, { page_id: 'pg_one', block_id: 'blk_text' });
  assert.equal(getBlockingFindings(findings).length, 1);
  assert.equal(getBlockingFindings([{ severity: 'warning' }]).length, 0);
});

test('orphaned banks warn, while an over-large draw is an asset error', () => {
  const course = baseCourse({
    question_banks: [{
      bank_id: 'bnk_one',
      name: 'One bank',
      questions: [{ question_id: 'bq_one', scored: true, content: { question: 'Q?', options: [{ id: 'opt_one' }, { id: 'opt_two' }] } }],
    }],
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [{ block_id: 'blk_draw', type: 'question_bank_draw', content: { bank_id: 'bnk_one', draw_count: 2 } }],
    }],
  });
  assert.deepEqual(findingsFor(course, 'reference.orphaned_question_bank'), []);
  const drawFindings = findingsFor(course, 'asset.question_bank_draw_count_exceeded');
  assert.equal(drawFindings.length, 1);
  assert.equal(drawFindings[0].severity, 'error');

  const orphan = baseCourse({ question_banks: [{ bank_id: 'bnk_orphan', name: 'Reserve', questions: [] }] });
  assert.equal(findingsFor(orphan, 'reference.orphaned_question_bank').length, 1);
  assert.equal(findingsFor(orphan, 'reference.orphaned_question_bank')[0].severity, 'warning');
});

test('duplicate stable IDs are defensive reference errors', () => {
  const course = baseCourse({
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [headingBlock('blk_same'), headingBlock('blk_same')] }],
  });
  const findings = findingsFor(course, 'reference.duplicate_stable_id');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].entityId, 'blk_same');
  assert.equal(findings[0].severity, 'error');
  assert.match(findings[0].message, /Two course items share the same identity/);
});

test('accordion, tab, and ordering items are classified once by their owning block type', () => {
  const course = baseCourse({
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [
        {
          block_id: 'blk_accordion',
          type: 'accordion',
          content: { items: [{ item_id: 'itm_accordion', title: 'Accordion item', body_blocks: [] }] },
        },
        {
          block_id: 'blk_tabs',
          type: 'tabs',
          content: { items: [{ item_id: 'itm_tab', label: 'Tab item', body_blocks: [] }] },
        },
        {
          block_id: 'blk_ordering',
          type: 'ordering',
          content: { items: [{ item_id: 'ord_item', text: 'Ordering item', correct_position: 0 }] },
        },
      ],
    }],
  });

  assert.deepEqual(findingsFor(course, 'reference.duplicate_stable_id'), []);
});

test('a stable ID shared by different nested objects is still reported', () => {
  const course = baseCourse({
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [
        {
          block_id: 'blk_accordion',
          type: 'accordion',
          content: { items: [{ item_id: 'itm_shared', title: 'Accordion item', body_blocks: [] }] },
        },
        {
          block_id: 'blk_ordering',
          type: 'ordering',
          content: { items: [{ item_id: 'itm_shared', text: 'Ordering item', correct_position: 0 }] },
        },
      ],
    }],
  });

  const findings = findingsFor(course, 'reference.duplicate_stable_id');
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Recreate one of the affected items \(ordering item\)/);
});

test('course health messages explain the problem and the next action in plain language', () => {
  const course = baseCourse({
    assets: [{ asset_id: 'ast_missing', kind: 'image', filename: 'slide.png', src: 'uploads/missing.png', alt: '' }],
    pages: [{ page_id: 'pg_empty', title: 'Case 1', blocks: [] }],
  });
  const findings = analyzeCourse(course, { uploadedAssetIds: [] });
  const messages = findings.map((finding) => finding.message).join(' ');

  assert.match(messages, /Add alt text to image/);
  assert.match(messages, /Re-upload it or replace it/);
  assert.match(messages, /Add at least one block before publishing/);
  assert.doesNotMatch(messages, /schema validation|uploaded file path/);
});

test('basic accessibility rules cover image alt, video captions/transcript, embeds, and headings', () => {
  const course = baseCourse({
    assets: [
      { asset_id: 'ast_image', kind: 'image', filename: 'slide.png', src: 'uploads/slide.png', alt: '' },
      { asset_id: 'ast_video', kind: 'video', filename: 'case.mp4', src: 'uploads/case.mp4', alt: 'Case video', caption_status: 'draft', transcript_status: 'failed' },
    ],
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [
        headingBlock('blk_empty_heading', ''),
        { block_id: 'blk_embed', type: 'embed', content: { url: 'https://example.org', label: '' } },
      ],
    }],
  });
  for (const ruleId of [
    'a11y.image_alt_missing',
    'a11y.video_captions_missing',
    'accessibility.video_transcript_missing',
    'accessibility.embed_label_missing',
    'accessibility.heading_text_missing',
  ]) {
    assert.equal(findingsFor(course, ruleId).length, 1, ruleId);
    assert.equal(findingsFor(course, ruleId)[0].severity, 'warning', ruleId);
    assert.equal(findingsFor(course, ruleId)[0].category, 'accessibility', ruleId);
  }
});

test('asset file, resource path, duplicate filename, and size checks use supplied file metadata', () => {
  const course = baseCourse({
    assets: [
      { asset_id: 'ast_missing', kind: 'image', filename: 'duplicate.png', src: 'uploads/missing.png', alt: 'Missing' },
      { asset_id: 'ast_large', kind: 'video', filename: 'duplicate.png', src: 'uploads/large.mp4', alt: 'Large', caption_status: 'ready', transcript_status: 'ready', size_bytes: MEDIA_SIZE_WARNING_BYTES + 1 },
    ],
    meta: {
      ...baseCourse().meta,
      resources: [{ resource_id: 'res_missing', filename: 'handout.pdf', file_path: 'crs_analyzer/resources/handout.pdf', size_bytes: 10, uploaded_at: '2026-07-26' }],
    },
  });
  const options = {
    uploadedAssetIds: ['ast_large'],
    uploadedResourceIds: [],
  };
  assert.equal(findingsFor(course, 'asset.uploaded_file_missing', options).length, 1);
  assert.equal(findingsFor(course, 'asset.resource_file_missing', options).length, 1);
  assert.equal(findingsFor(course, 'asset.duplicate_filename', options).length, 2);
  assert.equal(findingsFor(course, 'asset.file_size_large', options).length, 1);
});

test('empty pages and empty modules warn without creating errors', () => {
  const course = baseCourse({
    meta: { ...baseCourse().meta, page_groups: [{ group_id: 'grp_empty', title: 'Empty module', page_ids: [] }] },
    pages: [{ page_id: 'pg_empty', title: 'Empty page', blocks: [] }],
  });
  const findings = analyzeCourse(course);
  assert.equal(findingsFor(course, 'asset.page_empty').length, 1);
  assert.equal(findingsFor(course, 'asset.module_empty').length, 1);
  assert.equal(findings.some((finding) => finding.severity === 'error'), false);
});

test('course with no pages emits the requested warning, even though schema validity also reports the invalid shape', () => {
  const findings = analyzeCourse(baseCourse({ pages: [] }));
  const empty = findingsFor(baseCourse({ pages: [] }), 'asset.course_empty');
  assert.equal(empty.length, 1);
  assert.equal(empty[0].severity, 'warning');
});

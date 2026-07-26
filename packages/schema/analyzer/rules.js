// Phase 4.5c: the scoped, deterministic Course Analyzer rule set.
//
// Every rule has the signature (courseJson, context) => Finding[]. The
// context contains the dependency index built once by analyzer/index.js and
// optional file metadata supplied by the editor. Rules never write to the
// course document, query the network, or infer author intent.

import { validateCourse } from '../index.js';
import { getDependents, labelForBlock } from '../dependency-index.js';

export const FINDING_CATEGORIES = Object.freeze({
  reference: 'reference',
  accessibility: 'accessibility',
  asset: 'asset',
});

export const MEDIA_SIZE_WARNING_BYTES = 50 * 1024 * 1024;

function finding(ruleId, severity, category, message, entityType, entityId, location = {}) {
  return { ruleId, severity, category, message, entityType, entityId, location };
}

function collectAllBlocks(course) {
  const result = [];
  function walk(block, page) {
    if (!block) return;
    result.push({ block, page });
    if (block.left) walk(block.left, page);
    if (block.right) walk(block.right, page);
    for (const item of block.content?.items || []) {
      for (const child of item?.body_blocks || []) walk(child, page);
    }
  }
  for (const page of course?.pages || []) {
    for (const block of page.blocks || []) walk(block, page);
  }
  return result;
}

function blockLocation(page, block) {
  return { page_id: page?.page_id, block_id: block?.block_id };
}

function blockLabel(block, page) {
  return labelForBlock(block, page?.blocks || []);
}

function plainText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(plainText).join('');
  if (!value || typeof value !== 'object') return '';
  if (Array.isArray(value.rich_text)) return plainText(value.rich_text);
  if (typeof value.v === 'string') return value.v;
  if (typeof value.text === 'string' || Array.isArray(value.text)) return plainText(value.text);
  return '';
}

function assetMetadata(context, asset) {
  const metadata = context.assetMetadataById;
  if (!metadata) return asset;
  if (metadata instanceof Map) return { ...asset, ...(metadata.get(asset.asset_id) || {}) };
  return { ...asset, ...(metadata[asset.asset_id] || {}) };
}

function explicitFileStatus(entry) {
  if (entry?.file_exists === false || entry?.uploaded === false) return false;
  if (entry?.file_exists === true || entry?.uploaded === true) return true;
  return null;
}

function fileIsPresent(entry, context, kind) {
  const explicit = explicitFileStatus(entry);
  if (explicit !== null) return explicit;

  const resolver = kind === 'asset' ? context.assetFileExists : context.resourceFileExists;
  if (typeof resolver === 'function') return !!resolver(entry);

  const ids = kind === 'asset' ? context.uploadedAssetIds : context.uploadedResourceIds;
  if (ids) {
    const key = kind === 'asset' ? entry.asset_id : entry.resource_id;
    return ids instanceof Set ? ids.has(key) : Array.isArray(ids) ? ids.includes(key) : !!ids[key];
  }

  const paths = kind === 'asset' ? context.uploadedAssetPaths : context.uploadedResourcePaths;
  if (paths && entry.file_path) {
    return paths instanceof Set ? paths.has(entry.file_path) : Array.isArray(paths) ? paths.includes(entry.file_path) : !!paths[entry.file_path];
  }

  // A shared analyzer cannot resolve a local upload directory by itself.
  // When no server-provided file inventory is available, absence of evidence
  // is not evidence of a missing file; explicit false metadata remains
  // supported for imports and server-side callers.
  return true;
}

function firstAssetLocation(assetId, depIndex) {
  const edge = (depIndex[assetId] || []).find((candidate) => candidate.pageId || candidate.entityType === 'block');
  return edge?.pageId ? { page_id: edge.pageId, ...(edge.id ? { block_id: edge.id } : {}) } : {};
}

// -------------------------------------------------------------------------
// Reference rules
// -------------------------------------------------------------------------

export function ruleSchemaValidity(course) {
  const { valid, errors } = validateCourse(course);
  if (valid) return [];
  return errors.map((message) => finding(
    'schema.invalid',
    'error',
    FINDING_CATEGORIES.reference,
    `This course fails schema validation: ${message}`,
    'course',
    course?.meta?.course_id || 'course',
  ));
}

function brokenReferenceRuleId(edge) {
  if (edge.referenceType === 'trigger_reads_variable' || edge.referenceType === 'trigger_writes_variable' || edge.referenceType === 'continue_gate_reads_variable') {
    return 'broken_ref.variable_missing';
  }
  if (edge.referenceType === 'visibility_condition_reads_variable') return 'broken_ref.visibility_variable_missing';
  if (edge.referenceType === 'trigger_targets_block') return 'broken_ref.block_target_missing';
  if (edge.referenceType === 'trigger_navigates_to_page' || edge.referenceType === 'utility_item_navigates_to_page') return 'broken_ref.page_target_missing';
  if (edge.referenceType === 'block_uses_asset') return 'broken_ref.asset_missing';
  return 'reference.broken_reference';
}

export function ruleBrokenReferences(course, context) {
  return context.brokenReferences.map((edge) => finding(
    brokenReferenceRuleId(edge),
    'error',
    FINDING_CATEGORIES.reference,
    `${edge.label || edge.id || 'This content'} references a ${edge.targetType || 'resource'} that does not exist (${edge.targetId}).`,
    edge.entityType || 'course',
    edge.id || edge.targetId,
    edge.pageId ? { page_id: edge.pageId, ...(edge.entityType === 'block' ? { block_id: edge.id } : {}) } : {},
  ));
}

export function ruleOrphanedQuestionBank(course, context) {
  return (course?.question_banks || [])
    .filter((bank) => !getDependents(bank.bank_id, course, context.dependencyIndex).some((edge) => edge.referenceType === 'block_uses_question_bank'))
    .map((bank) => finding(
      'reference.orphaned_question_bank',
      'warning',
      FINDING_CATEGORIES.reference,
      `Question bank "${bank.name || bank.bank_id}" is not used by any Question Bank block.`,
      'question_bank',
      bank.bank_id,
    ));
}

function stableIdEntries(course) {
  const entries = [];
  const add = (id, entityType, entityId, location = {}) => {
    if (id) entries.push({ id, entityType, entityId: entityId || id, location });
  };

  add(course?.meta?.course_id, 'course', course?.meta?.course_id);
  for (const variable of course?.variables || []) add(variable.variable_id, 'variable', variable.variable_id);
  for (const asset of course?.assets || []) add(asset.asset_id, 'asset', asset.asset_id);
  for (const resource of course?.meta?.resources || []) add(resource.resource_id, 'resource', resource.resource_id);
  for (const objective of course?.objectives || course?.meta?.objectives || []) add(objective.objective_id, 'objective', objective.objective_id);
  for (const entity of course?.linked_entities || []) add(entity.entity_id, 'linked_entity', entity.entity_id);
  for (const bank of course?.question_banks || []) {
    add(bank.bank_id, 'question_bank', bank.bank_id);
    for (const question of bank.questions || []) {
      add(question.question_id, 'question', question.question_id);
      addQuestionContentIds(question.content, question.question_id, add, {});
    }
  }
  for (const group of course?.meta?.page_groups || []) add(group.group_id, 'module', group.group_id);
  for (const item of course?.meta?.utility_bar?.custom || []) add(item.id, 'utility_item', item.id);

  for (const page of course?.pages || []) {
    add(page.page_id, 'page', page.page_id, { page_id: page.page_id });
    for (const trigger of page.triggers || []) add(trigger.trigger_id, 'trigger', trigger.trigger_id, { page_id: page.page_id });
    for (const block of page.blocks || []) collectBlockIds(block, page, add);
  }
  return entries;
}

function addQuestionContentIds(content, questionId, add, location) {
  for (const option of content?.options || []) {
    add(option.id, 'answer_option', option.id, location);
    add(option.feedback?.feedback_id, 'option_feedback', option.feedback?.feedback_id, location);
  }
}

function collectBlockIds(block, page, add) {
  const location = { page_id: page.page_id, block_id: block.block_id };
  add(block.block_id, 'block', block.block_id, location);
  for (const trigger of block.triggers || []) add(trigger.trigger_id, 'trigger', trigger.trigger_id, location);
  for (const trigger of block.timeline_triggers || []) add(trigger.trigger_id, 'trigger', trigger.trigger_id, location);
  for (const item of block.content?.items || []) {
    add(item.item_id, 'nested_item', item.item_id, location);
    for (const child of item.body_blocks || []) collectBlockIds(child, page, add);
  }
  for (const card of block.content?.cards || []) add(card.card_id, 'flashcard', card.card_id, location);
  for (const prompt of block.content?.prompts || []) add(prompt.prompt_id, 'matching_prompt', prompt.prompt_id, location);
  for (const option of block.content?.options || []) add(option.option_id, 'matching_option', option.option_id, location);
  for (const item of block.content?.items || []) add(item.item_id, 'ordering_item', item.item_id, location);
  for (const region of block.content?.regions || []) add(region.region_id, 'hotspot_region', region.region_id, location);
  addQuestionContentIds(block.content, block.block_id, add, location);
  if (block.left) collectBlockIds(block.left, page, add);
  if (block.right) collectBlockIds(block.right, page, add);
}

export function ruleDuplicateStableIds(course) {
  const seen = new Map();
  const findings = [];
  for (const entry of stableIdEntries(course)) {
    const previous = seen.get(entry.id);
    if (previous) {
      findings.push(finding(
        'reference.duplicate_stable_id',
        'error',
        FINDING_CATEGORIES.reference,
        `Stable ID "${entry.id}" is used by both ${previous.entityType} and ${entry.entityType}.`,
        entry.entityType,
        entry.entityId,
        entry.location,
      ));
    } else {
      seen.set(entry.id, entry);
    }
  }
  return findings;
}

// -------------------------------------------------------------------------
// Accessibility rules
// -------------------------------------------------------------------------

export function ruleImageAltMissing(course) {
  return (course?.assets || [])
    .filter((asset) => asset.kind === 'image' && !asset.alt?.trim())
    .map((asset) => finding(
      'a11y.image_alt_missing',
      'warning',
      FINDING_CATEGORIES.accessibility,
      `Image "${asset.filename || asset.asset_id}" is missing alt text.`,
      'asset',
      asset.asset_id,
    ));
}

export function ruleVideoCaptionsMissing(course) {
  return (course?.assets || [])
    .filter((asset) => asset.kind === 'video' && asset.caption_status !== 'ready')
    .map((asset) => finding(
      'a11y.video_captions_missing',
      'warning',
      FINDING_CATEGORIES.accessibility,
      `Video "${asset.filename || asset.asset_id}" does not have captions ready.`,
      'asset',
      asset.asset_id,
    ));
}

export function ruleVideoTranscriptMissing(course) {
  return (course?.assets || [])
    .filter((asset) => asset.kind === 'video' && asset.transcript_status !== 'ready')
    .map((asset) => finding(
      'accessibility.video_transcript_missing',
      'warning',
      FINDING_CATEGORIES.accessibility,
      `Video "${asset.filename || asset.asset_id}" does not have a transcript ready.`,
      'asset',
      asset.asset_id,
    ));
}

export function ruleEmbedLabelMissing(course) {
  return collectAllBlocks(course)
    .filter(({ block }) => block.type === 'embed' && !(block.content?.label || block.label || '').trim())
    .map(({ block, page }) => finding(
      'accessibility.embed_label_missing',
      'warning',
      FINDING_CATEGORIES.accessibility,
      `${blockLabel(block, page)} has no descriptive label for learners.`,
      'block',
      block.block_id,
      blockLocation(page, block),
    ));
}

export function ruleHeadingTextMissing(course) {
  return collectAllBlocks(course)
    .filter(({ block }) => block.type === 'heading' && !plainText(block.content?.text).trim())
    .map(({ block, page }) => finding(
      'accessibility.heading_text_missing',
      'warning',
      FINDING_CATEGORIES.accessibility,
      `${blockLabel(block, page)} is empty.`,
      'block',
      block.block_id,
      blockLocation(page, block),
    ));
}

// -------------------------------------------------------------------------
// Asset and structural completeness rules
// -------------------------------------------------------------------------

export function ruleAssetFileMissing(course, context) {
  return (course?.assets || [])
    .filter((asset) => !fileIsPresent(assetMetadata(context, asset), context, 'asset'))
    .map((asset) => finding(
      'asset.uploaded_file_missing',
      'error',
      FINDING_CATEGORIES.asset,
      `Asset "${asset.filename || asset.asset_id}" has no corresponding uploaded file.`,
      'asset',
      asset.asset_id,
      firstAssetLocation(asset.asset_id, context.dependencyIndex),
    ));
}

export function ruleResourceFileMissing(course, context) {
  return (course?.meta?.resources || [])
    .filter((resource) => !fileIsPresent(resource, context, 'resource'))
    .map((resource) => finding(
      'asset.resource_file_missing',
      'error',
      FINDING_CATEGORIES.asset,
      `Resource "${resource.label || resource.filename || resource.resource_id}" cannot be found at its uploaded file path.`,
      'resource',
      resource.resource_id,
    ));
}

export function ruleDuplicateAssetFilenames(course) {
  const byFilename = new Map();
  for (const asset of course?.assets || []) {
    const filename = asset.filename?.trim().toLowerCase();
    if (!filename) continue;
    if (!byFilename.has(filename)) byFilename.set(filename, []);
    byFilename.get(filename).push(asset);
  }
  const findings = [];
  for (const assets of byFilename.values()) {
    if (assets.length < 2) continue;
    for (const asset of assets) {
      findings.push(finding(
        'asset.duplicate_filename',
        'warning',
        FINDING_CATEGORIES.asset,
        `Asset filename "${asset.filename}" is used more than once and may be ambiguous.`,
        'asset',
        asset.asset_id,
      ));
    }
  }
  return findings;
}

export function ruleLargeMediaAsset(course, context) {
  return (course?.assets || [])
    .map((asset) => assetMetadata(context, asset))
    .filter((asset) => ['image', 'video'].includes(asset.kind) && Number(asset.size_bytes ?? asset.file_size ?? asset.size) > MEDIA_SIZE_WARNING_BYTES)
    .map((asset) => finding(
      'asset.file_size_large',
      'warning',
      FINDING_CATEGORIES.asset,
      `Asset "${asset.filename || asset.asset_id}" is larger than ${Math.round(MEDIA_SIZE_WARNING_BYTES / (1024 * 1024))} MB and may load slowly.`,
      'asset',
      asset.asset_id,
    ));
}

export function ruleQuestionBankDrawCount(course) {
  const banks = new Map((course?.question_banks || []).map((bank) => [bank.bank_id, bank]));
  return collectAllBlocks(course)
    .filter(({ block }) => block.type === 'question_bank_draw' && banks.has(block.content?.bank_id))
    .flatMap(({ block, page }) => {
      const available = banks.get(block.content.bank_id).questions || [];
      if (Number(block.content?.draw_count) <= available.length) return [];
      return [finding(
        'asset.question_bank_draw_count_exceeded',
        'error',
        FINDING_CATEGORIES.asset,
        `${blockLabel(block, page)} requests ${block.content.draw_count} questions, but its bank only contains ${available.length}.`,
        'block',
        block.block_id,
        blockLocation(page, block),
      )];
    });
}

export function ruleEmptyPages(course) {
  return (course?.pages || [])
    .filter((page) => (page.blocks || []).length === 0)
    .map((page) => finding(
      'asset.page_empty',
      'warning',
      FINDING_CATEGORIES.asset,
      `Page "${page.title}" has no blocks.`,
      'page',
      page.page_id,
      { page_id: page.page_id },
    ));
}

export function ruleEmptyCourseOrModule(course) {
  const findings = [];
  if (!(course?.pages || []).length) {
    findings.push(finding(
      'asset.course_empty',
      'warning',
      FINDING_CATEGORIES.asset,
      'This course has no pages.',
      'course',
      course?.meta?.course_id || 'course',
    ));
  }
  for (const group of course?.meta?.page_groups || []) {
    if ((group.page_ids || []).length === 0) {
      findings.push(finding(
        'asset.module_empty',
        'warning',
        FINDING_CATEGORIES.asset,
        `Module "${group.title}" has no pages assigned.`,
        'module',
        group.group_id,
      ));
    }
  }
  return findings;
}

export const RULES = [
  ruleSchemaValidity,
  ruleBrokenReferences,
  ruleOrphanedQuestionBank,
  ruleDuplicateStableIds,
  ruleImageAltMissing,
  ruleVideoCaptionsMissing,
  ruleVideoTranscriptMissing,
  ruleEmbedLabelMissing,
  ruleHeadingTextMissing,
  ruleAssetFileMissing,
  ruleResourceFileMissing,
  ruleDuplicateAssetFilenames,
  ruleLargeMediaAsset,
  ruleQuestionBankDrawCount,
  ruleEmptyPages,
  ruleEmptyCourseOrModule,
];

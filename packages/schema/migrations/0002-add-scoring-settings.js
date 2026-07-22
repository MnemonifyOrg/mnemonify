// Phase 5.5 Part 1: add publish settings and make the implicit assessment
// scoring behavior explicit on every existing interaction block.
function migrateBlocks(blocks, diagnostics) {
  return (blocks || []).map((block) => {
    if (!block || typeof block !== 'object') return block;
    let next = block;
    if (['knowledge-check', 'matching', 'ordering'].includes(block.type) || block.type === 'hotspot') {
      if (block.content?.scored === undefined) diagnostics.scoredDefaultsAdded += 1;
      next = { ...block, content: { ...(block.content || {}), scored: block.content?.scored !== false } };
    }
    if (next.content?.items) {
      next = { ...next, content: { ...next.content, items: next.content.items.map((item) => ({ ...item, body_blocks: migrateBlocks(item.body_blocks, diagnostics) })) } };
    }
    if (next.left) next = { ...next, left: migrateBlocks([next.left], diagnostics)[0] };
    if (next.right) next = { ...next, right: migrateBlocks([next.right], diagnostics)[0] };
    return next;
  });
}

export default {
  id: '0002-add-scoring-settings',
  fromVersion: 2,
  toVersion: 3,
  migrate(document) {
    const diagnostics = { scoredDefaultsAdded: 0, publishSettingsAdded: 0 };
    const legacyRule = document.meta?.completion_rule;
    const existing = document.meta?.publish_settings;
    if (!existing) diagnostics.publishSettingsAdded = 1;
    const publish_settings = {
      completion_criteria: legacyRule === 'passed_final_quiz' ? 'passed_assessment' : 'viewed_all_pages',
      report_status_as: 'both',
      success_enabled: true,
      passing_score_pct: 80,
      ...(existing || {}),
    };
    const pages = (document.pages || []).map((page) => ({ ...page, blocks: migrateBlocks(page.blocks, diagnostics) }));
    return { document: { ...document, schema_version: 3, meta: { ...document.meta, publish_settings }, pages }, diagnostics };
  },
};

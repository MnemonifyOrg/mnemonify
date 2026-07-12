function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export const genBlockId = () => `blk_${shortId()}`;
export const genPageId = () => `pg_${shortId()}`;
export const genTriggerId = () => `trg_${shortId()}`;
export const genAssetId = () => `ast_${shortId()}`;
export const genCourseId = () => `crs_${shortId()}`;

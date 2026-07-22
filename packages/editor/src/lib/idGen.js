function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export const genBlockId = () => `blk_${shortId()}`;
export const genPageId = () => `pg_${shortId()}`;
export const genTriggerId = () => `trg_${shortId()}`;
export const genAssetId = () => `ast_${shortId()}`;
export const genCourseId = () => `crs_${shortId()}`;
export const genUtilityItemId = () => `util_${shortId()}`;
// Phase 4.5a identity convention (DECISIONS.md) -- extends the existing
// prefix pattern to every entity DATA-MODEL.md section 2 requires a
// stable id for.
export const genOptionId = () => `opt_${shortId()}`;
export const genItemId = () => `itm_${shortId()}`;
export const genVariableId = () => `var_${shortId()}`;
export const genObjectiveId = () => `obj_${shortId()}`;
export const genConceptId = () => `cpt_${shortId()}`;
export const genGroupId = () => `grp_${shortId()}`;
export const genCardId = () => `crd_${shortId()}`;
export const genMatchingPromptId = () => `mp_${shortId()}`;
export const genMatchingOptionId = () => `mo_${shortId()}`;
export const genOrderingItemId = () => `ord_${shortId()}`;
export const genHotspotRegionId = () => `hs_${shortId()}`;
export const genBankId = () => `bnk_${shortId()}`;
export const genBankQuestionId = () => `bq_${shortId()}`;

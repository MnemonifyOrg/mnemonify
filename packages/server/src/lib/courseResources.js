// The course document owns manually attached resources in meta.resources.
// Generated publish artifacts live in the resources table instead, so the
// content-serving path must merge the database rows into the document it
// sends to a real learner. Keep this transformation pure so preview and
// published-content tests can exercise the same contract without a database.

function toCourseResource(resource) {
  return {
    resource_id: resource.resource_id,
    filename: resource.filename,
    file_path: resource.url || resource.file_path,
    ...(resource.label ? { label: resource.label } : {}),
    size_bytes: Number(resource.size_bytes || 0),
    uploaded_at: resource.uploaded_at || resource.created_at || new Date(0).toISOString(),
  };
}

export function mergeCourseResources(courseJson, databaseResources = []) {
  if (!courseJson || !Array.isArray(databaseResources) || databaseResources.length === 0) return courseJson;

  // Match the existing preview behavior: resources_page controls whether
  // database-backed resources (including generated PDFs) are exposed. The
  // author-authored meta.resources entries remain part of the course JSON.
  if (courseJson.meta?.pdf_settings?.resources_page === false) return courseJson;

  const existingResources = Array.isArray(courseJson.meta?.resources) ? courseJson.meta.resources : [];
  const existingIds = new Set(existingResources.map((resource) => resource.resource_id));
  const additions = databaseResources
    .filter((resource) => resource.resource_id && !existingIds.has(resource.resource_id))
    .map(toCourseResource);

  if (additions.length === 0) return courseJson;

  return {
    ...courseJson,
    meta: {
      ...(courseJson.meta || {}),
      resources: [...existingResources, ...additions],
    },
  };
}

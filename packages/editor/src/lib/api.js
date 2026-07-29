import axios from 'axios';

const client = axios.create({ baseURL: '/', withCredentials: true });

export const api = {
  // Courses
  listCourses: () => client.get('/api/courses').then((r) => r.data),
  getCourse: (id) => client.get(`/api/courses/${id}`).then((r) => r.data),
  createCourse: (payload) => client.post('/api/courses', payload).then((r) => r.data),
  updateCourse: (id, payload) => client.patch(`/api/courses/${id}`, payload).then((r) => r.data),
  listCourseVersions: (id) => client.get(`/api/courses/${id}/versions`).then((r) => r.data),
  createCourseVersion: (id, payload) => client.post(`/api/courses/${id}/versions`, payload).then((r) => r.data),
  restoreCourseVersion: (id, versionId) => client.post(`/api/courses/${id}/versions/${versionId}/restore`).then((r) => r.data),
  listGlossaries: () => client.get('/api/glossaries').then((r) => r.data),
  getGlossary: (id) => client.get(`/api/glossaries/${id}`).then((r) => r.data),
  createGlossary: (payload) => client.post('/api/glossaries', payload).then((r) => r.data),
  publishGlossaryTerm: (glossaryId, payload) => client.post(`/api/glossaries/${glossaryId}/terms`, payload).then((r) => r.data),
  generatePublishArtifacts: (id) => client.post(`/api/courses/${id}/publish-artifacts`).then((r) => r.data),
  exportWorksheet: (id) => client.post(`/api/courses/${id}/worksheet-export`).then((r) => r.data),
  listCourseResources: (id) => client.get(`/api/courses/${id}/resources`).then((r) => r.data),
  deleteCourse: (id) => client.delete(`/api/courses/${id}`),
  duplicateCourse: (id) => client.post(`/api/courses/${id}/duplicate`).then((r) => r.data),
  saveAsTemplate: (id, payload) => client.post(`/api/courses/${id}/save-as-template`, payload).then((r) => r.data),

  // Phase 6b review comments
  listComments: (courseId) => client.get(`/api/courses/${courseId}/comments`).then((r) => r.data.comments || []),
  createComment: (courseId, payload) => client.post(`/api/courses/${courseId}/comments`, payload).then((r) => r.data.comment),
  createCommentReply: (courseId, commentId, payload) => client.post(`/api/courses/${courseId}/comments/${commentId}/replies`, payload).then((r) => r.data.comment),
  updateComment: (courseId, commentId, payload) => client.patch(`/api/courses/${courseId}/comments/${commentId}`, payload).then((r) => r.data.comment),
  updateCommentStatus: (courseId, commentId, status) => client.patch(`/api/courses/${courseId}/comments/${commentId}/status`, { status }).then((r) => r.data),
  deleteComment: (courseId, commentId) => client.delete(`/api/courses/${courseId}/comments/${commentId}`),

  // Templates
  listTemplates: () => client.get('/api/templates').then((r) => r.data),
  exportTemplateWord: (id) => `/api/templates/${id}/export-word`,

  // Word import
  importWordReview: (formData) =>
    client.post('/api/courses/import-word', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  importWordConfirm: (payload) => client.post('/api/courses/import-word/confirm', payload).then((r) => r.data),

  // Assets
  listAssets: (courseId) => client.get(`/api/assets/${courseId}`).then((r) => r.data),
  uploadAsset: (formData) =>
    client.post('/api/assets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  bulkUploadAssets: (formData) =>
    client.post('/api/assets/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  updateAsset: (assetId, payload) => client.patch(`/api/assets/${assetId}`, payload).then((r) => r.data),
  deleteAsset: (assetId) => client.delete(`/api/assets/${assetId}`),
  listCaptions: (assetId) => client.get(`/api/assets/${assetId}/captions`).then((r) => r.data),
  updateCaption: (assetId, kind, payload) => client.patch(`/api/assets/${assetId}/captions/${kind}`, payload).then((r) => r.data),
  uploadCaption: (assetId, formData) =>
    client.post(`/api/assets/${assetId}/captions/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),

  // Resources (manually-attached course documents, distinct from assets --
  // Phase 4 usability-fix session Step 2)
  uploadResource: (formData) =>
    client.post('/api/resources/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  updateResource: (resourceId, payload) => client.patch(`/api/resources/${resourceId}`, payload).then((r) => r.data),
  deleteResource: (resourceId) => client.delete(`/api/resources/${resourceId}`),

  // Users
  getMe: () => client.get('/api/users/me').then((r) => r.data),
  updateMe: (payload) => client.patch('/api/users/me', payload).then((r) => r.data),

  // Phase 6a authentication and organization membership
  signup: (payload) => client.post('/api/auth/signup', payload).then((r) => r.data),
  login: (payload) => client.post('/api/auth/login', payload).then((r) => r.data),
  logout: () => client.post('/api/auth/logout').then((r) => r.data),
  getAuthMe: () => client.get('/api/auth/me').then((r) => r.data),
  verifyEmail: (token) => client.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`).then((r) => r.data),
  requestPasswordReset: (email) => client.post('/api/auth/password-reset/request', { email }).then((r) => r.data),
  confirmPasswordReset: (payload) => client.post('/api/auth/password-reset/confirm', payload).then((r) => r.data),
  listOrganizations: () => client.get('/api/organizations').then((r) => r.data),
  switchOrganization: (organisation_id) => client.post('/api/organizations/switch', { organisation_id }).then((r) => r.data),
  listOrganizationMembers: (organisationId) => client.get(`/api/organizations/${organisationId}/members`).then((r) => r.data),
  inviteOrganizationMember: (organisationId, payload) => client.post(`/api/organizations/${organisationId}/invitations`, payload).then((r) => r.data),
  updateOrganizationMember: (organisationId, userId, payload) => client.patch(`/api/organizations/${organisationId}/members/${userId}`, payload).then((r) => r.data),
  removeOrganizationMember: (organisationId, userId) => client.delete(`/api/organizations/${organisationId}/members/${userId}`),

  // Page templates
  listPageTemplates: () => client.get('/api/page-templates').then((r) => r.data),
  createPageTemplate: (payload) => client.post('/api/page-templates', payload).then((r) => r.data),
};

export default api;

import axios from 'axios';

const client = axios.create({ baseURL: '/' });

export const api = {
  // Courses
  listCourses: () => client.get('/api/courses').then((r) => r.data),
  getCourse: (id) => client.get(`/api/courses/${id}`).then((r) => r.data),
  createCourse: (payload) => client.post('/api/courses', payload).then((r) => r.data),
  updateCourse: (id, payload) => client.patch(`/api/courses/${id}`, payload).then((r) => r.data),
  deleteCourse: (id) => client.delete(`/api/courses/${id}`),
  duplicateCourse: (id) => client.post(`/api/courses/${id}/duplicate`).then((r) => r.data),
  saveAsTemplate: (id, payload) => client.post(`/api/courses/${id}/save-as-template`, payload).then((r) => r.data),

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

  // Resources (manually-attached course documents, distinct from assets --
  // Phase 4 usability-fix session Step 2)
  uploadResource: (formData) =>
    client.post('/api/resources/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  updateResource: (resourceId, payload) => client.patch(`/api/resources/${resourceId}`, payload).then((r) => r.data),
  deleteResource: (resourceId) => client.delete(`/api/resources/${resourceId}`),

  // Users
  getMe: () => client.get('/api/users/me').then((r) => r.data),
  updateMe: (payload) => client.patch('/api/users/me', payload).then((r) => r.data),

  // Page templates
  listPageTemplates: () => client.get('/api/page-templates').then((r) => r.data),
  createPageTemplate: (payload) => client.post('/api/page-templates', payload).then((r) => r.data),
};

export default api;

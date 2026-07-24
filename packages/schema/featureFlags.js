export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  versionHistory: false,
  glossary: false,
  bankImportExport: false,
  linkedQuestions: false,
});

export const FEATURE_FLAG_ENV_KEYS = Object.freeze({
  versionHistory: ['VITE_FEATURE_VERSION_HISTORY', 'FEATURE_VERSION_HISTORY'],
  glossary: ['VITE_FEATURE_GLOSSARY', 'FEATURE_GLOSSARY'],
  bankImportExport: ['VITE_FEATURE_BANK_IMPORT_EXPORT', 'FEATURE_BANK_IMPORT_EXPORT'],
  linkedQuestions: ['VITE_FEATURE_LINKED_QUESTIONS', 'FEATURE_LINKED_QUESTIONS'],
});

function parseFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function resolveFeatureFlags(env = {}) {
  const source = env || {};
  return Object.fromEntries(Object.entries(FEATURE_FLAG_ENV_KEYS).map(([flag, keys]) => {
    const configuredKey = keys.find((key) => source[key] !== undefined);
    return [flag, configuredKey ? parseFlag(source[configuredKey]) : DEFAULT_FEATURE_FLAGS[flag]];
  }));
}

// Vite exposes only VITE_* variables to browser bundles. The second branch
// keeps this shared module safe when imported by Node-based schema tests or
// other non-Vite consumers.
const runtimeEnv = typeof import.meta.env === 'object' ? import.meta.env : {};
export const FEATURE_FLAGS = Object.freeze(resolveFeatureFlags(runtimeEnv));

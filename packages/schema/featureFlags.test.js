import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_ENV_KEYS, FEATURE_FLAGS, resolveFeatureFlags } from './featureFlags.js';

test('v1 feature flags default every flag to false', () => {
    assert.deepEqual(DEFAULT_FEATURE_FLAGS, {
      versionHistory: false,
      glossary: false,
      bankImportExport: false,
      linkedQuestions: false,
    });
    assert.deepEqual(resolveFeatureFlags({}), DEFAULT_FEATURE_FLAGS);
    assert.deepEqual(FEATURE_FLAGS, DEFAULT_FEATURE_FLAGS);
});

test('v1 feature flags accept Vite environment variables and common boolean spellings', () => {
    assert.deepEqual(resolveFeatureFlags({
      VITE_FEATURE_VERSION_HISTORY: 'true',
      VITE_FEATURE_GLOSSARY: '1',
      VITE_FEATURE_BANK_IMPORT_EXPORT: 'yes',
      VITE_FEATURE_LINKED_QUESTIONS: 'on',
    }), {
      versionHistory: true,
      glossary: true,
      bankImportExport: true,
      linkedQuestions: true,
    });
});

test('v1 feature flags accept non-Vite aliases and treat other values as off', () => {
    assert.deepEqual(resolveFeatureFlags({
      FEATURE_VERSION_HISTORY: 'TRUE',
      FEATURE_GLOSSARY: 'false',
      FEATURE_BANK_IMPORT_EXPORT: true,
      FEATURE_LINKED_QUESTIONS: 'maybe',
    }), {
      versionHistory: true,
      glossary: false,
      bankImportExport: true,
      linkedQuestions: false,
    });
    assert.ok(FEATURE_FLAG_ENV_KEYS.versionHistory.includes('VITE_FEATURE_VERSION_HISTORY'));
});

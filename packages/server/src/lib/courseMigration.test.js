import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrateCourseForPersistence } from './courseMigration.js';

test('persistence boundary migrates a pre-v6 course before it is saved', () => {
  const fixturePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../schema/migrations/__fixtures__/stable-nested-v5.json'
  );
  const legacyCourse = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  const result = migrateCourseForPersistence(legacyCourse, 'course_real_shape_test');

  assert.equal(result.document.schema_version, 6);
  assert.match(result.document.question_banks[0].questions[0].content.options[0].id, /^opt_/);
  assert.match(result.document.question_banks[0].questions[0].content.options[1].id, /^opt_/);
  assert.equal(legacyCourse.schema_version, 5);
  assert.equal(result.migrated, true);
});

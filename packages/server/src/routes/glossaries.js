import express from 'express';
import crypto from 'node:crypto';
import pool from '../db.js';
import { requireAuth, requireRole, ROLES } from '../lib/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createLibraryTerm, validateGlossaryName, validateGlossaryTerm } from '../lib/glossaries.js';

const router = express.Router();

router.get('/glossaries', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT g.glossary_id, g.name, g.created_by, g.created_at, g.updated_at,
            COUNT(t.term_id)::integer AS term_count
     FROM glossaries g
     LEFT JOIN glossary_terms t ON t.glossary_id = g.glossary_id
     WHERE g.organisation_id = $1
     GROUP BY g.glossary_id
     ORDER BY g.name ASC`,
    [req.auth.organisationId]
  );
  res.json(result.rows);
}));

router.get('/glossaries/:id', asyncHandler(async (req, res) => {
  // Player playback has always loaded an attached glossary by id without an
  // author session. Keep this read path public; author listing and all writes
  // remain protected by the membership middleware below.
  const glossaryResult = req.auth
    ? await pool.query(
      `SELECT glossary_id, name, created_by, created_at, updated_at
       FROM glossaries WHERE glossary_id = $1 AND organisation_id = $2`,
      [req.params.id, req.auth.organisationId]
    )
    : await pool.query(
      `SELECT glossary_id, name, created_by, created_at, updated_at
       FROM glossaries WHERE glossary_id = $1`,
      [req.params.id]
    );
  if (glossaryResult.rows.length === 0) {
    res.status(404).json({ error: 'Glossary not found' });
    return;
  }
  const termsResult = await pool.query(
    `SELECT term_id, term, definition, created_at, updated_at
     FROM glossary_terms WHERE glossary_id = $1 ORDER BY normalized_term ASC`,
    [req.params.id]
  );
  res.json({ ...glossaryResult.rows[0], terms: termsResult.rows });
}));

router.post('/glossaries', requireRole(ROLES.OWNER, ROLES.EDITOR), asyncHandler(async (req, res) => {
  let name;
  try {
    name = validateGlossaryName(req.body?.name);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const glossaryId = `glo_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const result = await pool.query(
    `INSERT INTO glossaries (glossary_id, organisation_id, name, created_by)
     VALUES ($1, $2, $3, $4) RETURNING glossary_id, name, created_by, created_at, updated_at`,
    [glossaryId, req.auth.organisationId, name, req.auth.userId]
  );
  res.status(201).json({ ...result.rows[0], term_count: 0 });
}));

router.post('/glossaries/:id/terms', requireRole(ROLES.OWNER, ROLES.EDITOR), asyncHandler(async (req, res) => {
  let validated;
  try {
    validated = validateGlossaryTerm(req.body?.term, req.body?.definition);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const glossaryResult = await pool.query(
    `SELECT glossary_id FROM glossaries WHERE glossary_id = $1 AND organisation_id = $2`,
    [req.params.id, req.auth.organisationId]
  );
  if (glossaryResult.rows.length === 0) {
    res.status(404).json({ error: 'Glossary not found' });
    return;
  }
  const existingResult = await pool.query(
    `SELECT term_id, term, definition, glossary_id, created_at, updated_at
     FROM glossary_terms WHERE glossary_id = $1 AND normalized_term = $2`,
    [req.params.id, validated.normalizedTerm]
  );
  if (existingResult.rows.length > 0) {
    const updated = await pool.query(
      `UPDATE glossary_terms SET term = $1, definition = $2, updated_at = now()
       WHERE term_id = $3 RETURNING term_id, term, definition, glossary_id, created_at, updated_at`,
      [validated.term, validated.definition, existingResult.rows[0].term_id]
    );
    res.json(updated.rows[0]);
    return;
  }
  const libraryTerm = createLibraryTerm({
    glossaryId: req.params.id,
    term: validated.term,
    definition: validated.definition,
    createdBy: req.auth.userId,
  });
  const result = await pool.query(
    `INSERT INTO glossary_terms
       (term_id, glossary_id, term, normalized_term, definition, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING term_id, term, definition, glossary_id, created_at, updated_at`,
    [libraryTerm.term_id, libraryTerm.glossary_id, libraryTerm.term, libraryTerm.normalized_term, libraryTerm.definition, libraryTerm.created_by]
  );
  res.status(201).json(result.rows[0]);
}));

export default router;

import bcrypt from 'bcryptjs';
import pool from './db.js';
import { DEV_ORG_ID, DEV_USER_ID } from './lib/devUser.js';

const DEV_EMAIL = 'dev@mnemonify.org';
const DEV_NAME = 'Dev User';
const DEFAULT_DEV_PASSWORD = 'dev-password';

export function assertDevSeedEnvironment(env = process.env) {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed the development account with NODE_ENV=production.');
  }
  if (env.NODE_ENV && !['development', 'test'].includes(env.NODE_ENV)) {
    throw new Error(`Refusing to seed the development account with NODE_ENV=${env.NODE_ENV}.`);
  }
}

export async function seedDevAccount({ client, env = process.env } = {}) {
  assertDevSeedEnvironment(env);
  if (!client) throw new Error('A database client is required to seed the development account.');
  const password = env.DEV_PASSWORD || DEFAULT_DEV_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO organisations (id, name)
       VALUES ($1, 'Default Organisation')
       ON CONFLICT (id) DO NOTHING`,
      [DEV_ORG_ID]
    );

    await client.query(
      `INSERT INTO users
         (id, organisation_id, email, name, role, password_hash, email_verified_at)
       VALUES ($1, $2, $3, $4, 'owner', $5, now())
       ON CONFLICT (id) DO UPDATE
         SET organisation_id = EXCLUDED.organisation_id,
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             password_hash = EXCLUDED.password_hash,
             email_verified_at = EXCLUDED.email_verified_at`,
      [DEV_USER_ID, DEV_ORG_ID, DEV_EMAIL, DEV_NAME, passwordHash]
    );
    await client.query(
      `INSERT INTO organisation_memberships (organisation_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [DEV_ORG_ID, DEV_USER_ID]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  return { email: DEV_EMAIL, password };
}

async function main() {
  let client;
  try {
    assertDevSeedEnvironment();
    client = await pool.connect();
    const account = await seedDevAccount({ client });
    console.log(`[seed:dev] Ready: ${account.email}`);
  } catch (error) {
    console.error(`[seed:dev] Failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

main();

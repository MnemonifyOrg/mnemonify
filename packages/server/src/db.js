import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// dotenv.config() with no path resolves ".env" relative to process.cwd(),
// NOT relative to this file -- if the server process is ever launched
// from a different working directory than packages/server (confirmed to
// happen with this project's preview-server tooling, which was found
// running with cwd `/Users/sfranci/Desktop` instead of packages/server),
// this silently finds nothing (dotenv does not throw on a missing file)
// and DATABASE_URL is left undefined. pg.Pool then falls back to PG's own
// default connection parameters, which use the OS username as both the
// connection user AND the default database name -- producing the exact
// `database "<os-user>" does not exist` error that was this session's
// actual root-caused crash trigger (see DECISIONS.md, Step 0). Resolving
// the path from this file's own location makes env loading correct
// regardless of the launching process's cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// pg.Pool docs: "You must attach an error listener to the pool... if a
// client emits an 'error' event and there is no listener, node will throw."
// This was previously unhandled, meaning ANY background pool error (an idle
// client's connection dropped, a network blip, Postgres restarting) crashed
// the entire server process outright -- the single most likely real cause
// of this content-server's repeated, seemingly-random crashes across Parts
// 1-3 (see DECISIONS.md, Step 0). Idle-client errors are recoverable: the
// pool itself removes the broken client and creates a new one on the next
// query, so logging and continuing is correct here, not fatal.
pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle PostgreSQL client (pool continues):', err);
});

export default pool;

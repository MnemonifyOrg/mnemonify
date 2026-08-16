# Handoff notes

This supplements REQUIREMENTS.md, ARCHITECTURE.md, and DECISIONS.md — it
doesn't repeat their content, it covers what a fresh agent won't get from
reading those alone: tooling limitations, environment setup, and a few
"don't repeat this mistake" lessons from hands-on work on this project.

## 1. Known environment/tooling limitations

The browser-automation tooling used in this project's sessions (a
CDP-driven browser pane, not a real human) cannot drive two categories of
interaction. Both are testing-tool limitations, not app bugs — confirmed
each time by checking the underlying code follows the library's documented
pattern correctly, then flagging for manual verification rather than
declaring the feature broken:

- **Drag-and-drop via `@dnd-kit`'s `PointerSensor`** (page reorder, block
  reorder, carousel image reorder). Neither synthetic `PointerEvent`
  dispatch nor the available computer-use drag tool can trigger it. See
  DECISIONS.md 2026-07-12 (`@dnd-kit` choice entry) and 2026-07-16 (undo/redo
  entry, which re-flags the same gap for drag+undo specifically).
- **Native OS file-picker dialogs** (`<input type="file">` triggering a
  real system dialog) — image upload, bulk ZIP upload, Word document
  import. No CDP-level file-chooser interception is exposed to this
  project's tooling, so these flows have only ever been exercised via
  direct API calls or pre-seeded data, never a real click-and-pick.

**Anything touching either area needs a human to manually smoke-test it
after a change** — an agent session reporting these as "working" is
reporting that the code path looks correct, not that a real drag or a real
file dialog was exercised.

## 2. Codex sandbox has no persistent server/browser — a distinct limitation from Claude Code's environment

This Codex development environment cannot start a persistent running Node
server or a real browser session. Any "verification" performed here is
code-level: unit tests, direct API calls made from within the same
process/session, or static code inspection. It is **not** equivalent to a
live browser hitting a live server.

This is stricter than the two limitations in Section 1 (dnd-kit drag and
OS file-picker dialogs). Those are specific interaction types that fail
inside an otherwise-working browser session. This limitation is broader:
no browser session exists at all in this environment.

**Practical implication:** any task involving real HTTP request/response
behavior between a running player and a running server — analytics
telemetry, SCORM communication, or anything involving actual network calls
rather than pure logic — requires independent human verification in a real
browser. Watch the real Network tab and query the real database. Code that
passes unit tests, and even a direct API call made from this sandbox, can
still fail in the genuinely wired-together system. This happened three
times in a row during the analytics telemetry work before the real bugs
were found.

This limitation applies specifically to the Codex CLI/background-session
surface. Codex's desktop app can provide an active browser connector, and
that was used successfully for live Phase 5 Interactive Video verification;
however, it requires the user to be actively available during the session
and must not be assumed in future tasks without first confirming the active
Codex surface and its connected tools.

### Case study: the analytics telemetry debugging session

This is the concrete sequence, recorded so future agents do not repeat the
same false-confidence pattern:

1. The initial analytics implementation passed all unit/server tests and a
   player build check, and was reported as complete.
2. Live human browser testing found every `/api/events` request returning
   404. As far as the running server was concerned, the routes genuinely
   did not exist.
3. The cause was a stale Node dev-server process that had started before
   the analytics route file was added. Restarting the process loaded the
   route. This was not a route-path code bug; it was a dev-environment
   gotcha. See the Content-server stability guidance in Section 3 for the
   related stale-process and server-lifecycle lessons.
4. After restart, live testing found a new HTTP 400:
   `course_version must be a string of 200 characters or fewer.` The player
   was sending `null` instead of omitting the optional field.
5. That fix was initially left uncommitted and untracked locally — `git
   status` showed the entire feature as local changes. Live testing also
   continued to show old pre-fix behavior because of an unrelated stale
   build, briefly making it look as if the fix itself had failed.
6. Once the player was genuinely rebuilt fresh, live testing found a
   second instance of the same bug class on `actor_hash`. The final fix
   swept all similarly conditional fields at once instead of finding them
   one at a time.
7. Once events returned 202, most payloads were still empty `{}`. This was
   a data-completeness gap, not an HTTP error, and would have gone unnoticed
   if verification had checked only status codes instead of reading the
   database rows.
8. The final fix populated the real payload data specified by
   `ARCHITECTURE.md` Section 14.2: knowledge-check answers and correctness,
   media timestamps, page entry/exit timing, Continue conditions, and a
   course-completion summary with score context. A human real-browser and
   database session confirmed real knowledge-check answers, real
   time-on-page durations, and a real completion summary. That same session
   confirmed that reflection-block text never appeared in any event,
   preserving the P1-46 privacy requirement.

The lesson is: **"tests pass" and "an isolated API call succeeds" are
necessary but not sufficient.** A human running a real browser session and
actually reading the resulting database rows — not just checking for a
success status code — caught four distinct real issues in this one feature:
stale server state, invalid optional metadata, incomplete rebuild state,
and missing event payload data. Budget for that independent live check on
any future feature involving real network communication between running
processes.

## 3. Content-server stability

Full root cause and fix: DECISIONS.md 2026-07-18, "Phase 4 usability-fix
session, Step 0." Short version: a chain of four issues, not one — wrong
`dotenv.config()` cwd resolution left `DATABASE_URL` undefined, `pg.Pool`
silently fell back to OS-level connection defaults (wrong user *and* wrong
database name), and most route handlers had no try/catch around their
async bodies, so every resulting DB error became an unhandled promise
rejection that kills the Node process outright (Node v15+ default
behavior). Three prior sessions across earlier Phase 4 parts had each
independently hit this and reported "content server dies, unrelated to
this session's code" without ever getting a stack trace.

**Conditions that would cause a recurrence:**
- A new file in `packages/server/src` calling `dotenv.config()` without an
  explicit `path` (both `db.js` and `index.js` now resolve it explicitly
  from `import.meta.url`, not `process.cwd()` — copy that pattern, don't
  reintroduce a bare `dotenv.config()`).
- A new async route handler added without wrapping it in `asyncHandler`
  (`packages/server/src/lib/asyncHandler.js`) — every existing handler
  across `courses.js`, `assets.js`, `pageTemplates.js`, `users.js`,
  `word.js`, `resources.js` is wrapped; a new route that skips this
  reintroduces the unhandled-rejection crash path for that one endpoint.
- If the server still dies with no stack trace despite the above, check
  `pool.on('error', ...)` in `db.js` and the `process.on('unhandledRejection'
  /'uncaughtException', ...)` handlers in `index.js` are still present —
  they're the last-resort loud-logging safety net; if either gets removed
  during a refactor, a future crash goes back to being silent.

## 4. SCORM testing workflow

Three separate terminals, one browser tab, plus a workaround step:

1. **Content server**: `npm run dev:server` from repo root (port 3001 per
  `.env`, see section 5). Must stay running.
2. **ngrok tunnel**: `ngrok http 3001` — exposes the local content server
   at a public `https://*.ngrok-free.app` URL. SCORM Cloud/Ethos needs a
   real HTTPS URL it can reach; `localhost` isn't reachable from their
   servers/iframes.
3. **Rebuild-the-zip terminal**: after ngrok gives you its URL, rebuild the
   launcher zip pointed at it:
   ```
   CONTENT_SERVER_URL=https://<your-tunnel>.ngrok-free.app \
   COURSE_ID=sample \
   VERSION_ID=1 \
   node packages/launcher/build.js
   ```
   (or the equivalent `--content-server-url=`/`--course-id=`/
   `--version-id=` CLI flags — see `packages/launcher/build.js`). Output
   lands at `packages/launcher/dist/mnemonify-<courseId>-launcher.zip`,
   which is what you upload to SCORM Cloud/Ethos. **The ngrok URL changes
   every time you restart ngrok on the free tier** — rebuild the zip after
   every ngrok restart, not just once per session.

**The ngrok warning-page interstitial** (free-tier ngrok shows a
"You are about to visit..." click-through page to any new visitor) is a
**per-session manual step, not something fixed in code**: before launching
from SCORM Cloud/Ethos, open the ngrok URL directly in a separate browser
tab, click "Visit Site" once, and leave that tab open. That authorizes the
domain for your browser session, so when the SCORM Cloud iframe loads the
same origin afterward, it skips the interstitial. Do this again after every
ngrok restart (new URL = new interstitial).

**Separately** — a real, already-shipped code fix, not a per-session
workaround: `packages/server/src/index.js` sets
`Content-Security-Policy: frame-ancestors *` on every route and
deliberately **omits** `X-Frame-Options` entirely (there's no standards-
compliant "allow all" value for that header — see the comment at that
line). Without this, the browser blocks SCORM Cloud's own iframe from
framing the ngrok-tunneled content server at all ("Blocked a frame with
origin... Protocols, domains, and ports must match"), independent of the
ngrok interstitial. This is already in place; don't remove it. Permissive
CORS (`cors({ origin: '*', ... })`) is also already set for the same
reason.

**Pointing a real course at the launcher, not the hardcoded sample — resolved
(2026-07-20):** `/content/:courseId` (`packages/server/src/index.js`) now
serves any real course by id, not just the hardcoded sample. The static
`COURSES` map still handles `sample` exactly as before (unchanged, for the
original Phase 2 fixture test case); any other id is looked up in the
`courses` table and pushed through `loadAndMigrateCourseRow`
(`packages/server/src/routes/courses.js`) — the identical migration-on-load
function `GET /api/courses/:id` uses for the editor, imported and reused
rather than reimplemented, so there is exactly one load-and-migrate path,
not two that could drift apart. A nonexistent id returns a clear 404
instead of a silent failure. `COURSE_ID=<real-uuid>` now works end-to-end
with `packages/launcher/build.js`. See DECISIONS.md 2026-07-20 for the live
migration proof (a course forced back to schema_version 1 directly in the
DB was correctly migrated to v2 and served through this route, with the
migration write-back confirmed via a follow-up DB read).

Once this content-server work exists and Phase 6 moves off ngrok to a
real deployed domain (mnemonify.org, per the roadmap), the entire ngrok
interstitial workaround disappears on its own — it only exists because
local dev is being tunneled. A real deployed URL has no interstitial.

## 5. Dev environment setup

PostgreSQL (local, one-time):
```
createdb mnemonify_dev
npm run migrate --workspace=packages/server
```
Migrations run in order from `packages/server/src/migrations/*.sql`
(currently 001–014, including `013_phase6a_accounts.sql` and the invitation
follow-up `014_allow_multiple_invitations.sql`); `migrate.js` runs
each file straight through on every invocation — there is no migration ledger,
down-migration, or rollback mechanism. Run the same command after a fresh
clone or whenever a new numbered migration is added. Phase 6a's migration
creates the PostgreSQL session, token, invitation, login-rate-limit, and
email-outbox tables, backfills organization memberships, and seeds the local
owner account `dev@mnemonify.org` with password `dev-password`.

After migration, a quick local auth smoke test is:
```
curl -c /tmp/mnemonify.cookies \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@mnemonify.org","password":"dev-password"}' \
  http://localhost:3001/api/auth/login
curl -b /tmp/mnemonify.cookies http://localhost:3001/api/auth/me
```

`packages/server/.env` (copy from `.env.example`):
```
DATABASE_URL=postgresql://localhost:5432/mnemonify_dev
CONTENT_BASE_URL=http://localhost:3001
PORT=3001
```

Start server + editor together (two terminals, or one with `&`):
```
npm run dev:server   # content server, port 3001
npm run dev:editor    # editor Vite dev server, port 3000
```
The editor's Vite dev server proxies `/api`, `/content`, `/assets`,
`/uploads`, and `/player` to the content server (see
`packages/editor/vite.config.js`) — both must be running to author a
course.

For SCORM/player testing specifically, the player must be **built**, not
just running in dev mode — `/player` on the content server serves the
static `packages/player/dist`, and returns a 503 with an explicit message
if that dist doesn't exist yet:
```
npm run build --workspace=packages/player
```

## 8. Cloudflare R2 storage (Deploy-A)

The server uses local disk by default, so the existing local setup above is
complete with no storage configuration. R2 becomes active only when all four
credential variables below are set; `R2_PUBLIC_URL` is additionally required
so the application can construct browser-facing object URLs:

```text
R2_ACCOUNT_ID=<Cloudflare account id>
R2_ACCESS_KEY_ID=<R2 access key id>
R2_SECRET_ACCESS_KEY=<R2 secret access key>
R2_BUCKET_NAME=mnemonify-dev
R2_PUBLIC_URL=https://<public-r2-domain>
```

`R2_PUBLIC_URL` is the public bucket URL or Cloudflare-fronted custom domain,
without a trailing slash. This implementation uses that public URL directly
for player/editor asset and resource links; it does not generate signed URLs.
The R2 S3-compatible endpoint is derived from `R2_ACCOUNT_ID`. If the four
credentials are absent, uploads, deletes, existence checks, PDF artifacts,
and local development continue to use `packages/server/uploads/` exactly as
before. A partial R2 credential set fails clearly instead of silently writing
to the wrong backend.

To migrate the existing local upload tree (currently approximately 339 MB)
to the configured R2 bucket, run this one-time command from the repository
root:

```bash
npm run migrate:storage --workspace=packages/server
```

The command recursively uploads every file under
`packages/server/uploads/`, preserves its relative object key, performs a
post-upload existence check for every file, and exits non-zero on any failed
verification. It requires the R2 variables above and is intentionally manual;
it does not delete local files.

## 9. Resend production email (Deploy-B)

The three Phase 6a token-email flows — signup verification, organization
invitation, and password reset — use the email abstraction in
`packages/server/src/lib/email.js`. Resend is selected only when
`RESEND_API_KEY` is set. Configure the verified `mail.mnemonify.org` sending
domain with:

```text
RESEND_API_KEY=<Resend API key>
RESEND_FROM=noreply@mail.mnemonify.org
```

This pass chose the `noreply` local part. `RESEND_FROM` must be a sender on a
verified Resend domain. The implementation calls Resend's HTTPS API directly
at `https://api.resend.com/emails` and sends plain-text messages; no Resend
SDK dependency is required. A non-2xx response or network failure is logged
prominently and returned as an email-delivery error instead of appearing to
succeed.

When `RESEND_API_KEY` is absent, local development is unchanged: configured
SMTP is still used, otherwise the message is inserted into
`auth_email_outbox` and the link is logged/returned by the existing
development-only flow. There is currently no bulk-email operation; repeated
invites are the only plausible short burst, so Resend's free-tier limit of
100 emails/day should be kept in mind until production rate limiting or
throttling is added.

## 6. Where the project stands

Phases 1 through 4.6 are complete: core schema/player/editor (1), SCORM
integration (2), full editor + templates + media (3), player chrome +
usability fixes + Phase 4.5 foundations + Phase 4.6 UX polish (4).
Interactive video (Phase 5 sub-area 1) is complete and live-verified;
captions/transcripts (sub-area 2) are implemented with local Whisper and
live-verified through the desktop browser; PDF publish artifacts (sub-area
3) are implemented with headless Puppeteer and still need a desktop-browser
author/player pass for the final UI/resource-modal acceptance check. See
REQUIREMENTS.md's phase table (row "5") for the full scope and acceptance
bar. Any Phase 5 work must build on
top of three foundational systems from 4.5, not route around them: **any
schema change** goes through the 4.5a sequential migration service
(`packages/server/src/migrate.js` + a new numbered fixture, never a direct
hand-edit of existing course data — see DECISIONS.md 2026-07-19, Phase
4.5a entries); **any new block type** gets registered in the 4.5b block
registry (`packages/schema/block-registry.js`) rather than hand-added
across the editor/player's own scattered surfaces (Phase 4.5b entries);
and **any new validation/health rule** goes into the 4.5c analyzer's
`RULES` array (`packages/schema/analyzer/rules.js`), matching its existing
finding shape, rather than a one-off check bolted on somewhere else (Phase
4.5c entries).

## 7. Other things worth knowing

- **Test data hygiene**: this project's shared dev course library
  accumulates a lot of one-off test courses across sessions (`Phase 3 TEST
  Course`, `Analyzer Test 4.5c`, etc.) — some are left in deliberately as
  reusable regression fixtures (referenced by name in DECISIONS.md), others
  are throwaway and get `DELETE /api/courses/:id`'d at the end of the
  session that created them. Before deleting anything you didn't just
  create, check whether DECISIONS.md references it by name first.
- **Don't fabricate cross-origin test results**: several DECISIONS.md
  entries (embed scroll-jump fix, 2026-07-17; Course Health click-navigate,
  Phase 4.5c) explicitly note that a cross-origin iframe's `contentDocument`
  is unreadable from the parent by design, and that some browser behaviors
  (native auto-scroll-on-focus, smooth-scroll animation progress) don't
  reproduce inside this automated testing environment even when the
  underlying fix is correct. When you hit this, verify the *mechanism*
  (the right element, the right call, the right guard condition) rather
  than the end-to-end symptom, and say so plainly instead of claiming a
  full repro that didn't happen.
- **Synthetic DOM events lie about text-input bugs**: a `double_click` +
  raw `Cmd+A` keypress (or any plain-JS `.value =` + dispatched `Event`)
  against a real React controlled `<input>` does not reliably reproduce
  what a real user's typing does, and has twice produced what looked like
  a duplicated/concatenated-text product bug that was actually the test
  method (see DECISIONS.md 2026-07-19, Phase 4.6 Step 10 entry). If a
  rename/text-edit flow looks broken under automation, retest with
  `element.select()` (a real native full-selection call) before typing
  before concluding the component itself is broken.
- **CSS `overflow-x` gotcha**: setting `overflow-y: auto` without an
  explicit `overflow-x` forces the browser to compute `overflow-x: auto`
  too (CSS Overflow spec), which silently clips/scrolls anything that
  overflows horizontally — this is what caused the InfoTooltip's real
  left-edge clipping bug (not just a viewport issue) inside
  `.settings-panel`. Worth checking with `getComputedStyle` before
  assuming a container's overflow behavior matches what's written in its
  CSS.
- **This app has no lint/test scripts wired at the root** — `oxlint` exists
  as a per-package script in the editor (`packages/editor`'s `npm run
  lint`) and `vitest` in the player (`npm run test`), but there's no
  root-level `npm run lint`/`npm test` covering everything. Don't assume
  one exists; run the package-scoped script directly, or rely on live
  browser verification (HMR + console-error checks) the way most of this
  project's sessions have.
- **`git add .`/`git add -A` is unsafe in this repo right now**: an
  `AGENTS.md` file (environment/tooling-generated, not part of this
  project's own work) sits untracked at the repo root across sessions.
  Stage files by explicit path, not a blanket add, or you'll sweep it into
  a commit.

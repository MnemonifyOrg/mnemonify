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

## 2. Content-server stability

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

## 3. SCORM testing workflow

Three separate terminals, one browser tab, plus a workaround step:

1. **Content server**: `npm run dev:server` from repo root (port 3001 per
   `.env`, see section 4). Must stay running.
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

## 4. Dev environment setup

PostgreSQL (local, one-time):
```
createdb mnemonify_dev
npm run migrate --workspace=packages/server
```
Migrations run in order from `packages/server/src/migrations/*.sql`
(currently 001–007); `migrate.js` just runs each file straight through —
there's no down-migration or rollback mechanism.

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

## 5. Where the project stands

Phases 1 through 4.6 are complete: core schema/player/editor (1), SCORM
integration (2), full editor + templates + media (3), player chrome +
usability fixes + Phase 4.5 foundations + Phase 4.6 UX polish (4). Phase 5
— states, expanded block types, interactive video, captions, translation,
PDF artifacts, analytics, and the Word importers (Smart Import + AI
Import) — has not been started; see REQUIREMENTS.md's phase table (row
"5") for the full scope and acceptance bar. Any Phase 5 work must build on
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

## 6. Other things worth knowing

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

# UX Redesign: Acceptance Checklist

Add this section to ARCHITECTURE.md alongside the UI surface inventory (once Codex delivers it), as the combined Phase 0 deliverable. Commit before starting Phase 1.

## Purpose

This checklist is what every later phase gets measured against — both by our own judgment as we build, and later by real educators in Phase 6. It exists so "does this feel better" has a concrete, checkable answer rather than a vibe.

## Core tasks a new author must be able to do

For each, the redesign should make the answer to "how do I do this" obvious without hunting:

1. Create a course and understand where they are in it (course → module → page → block)
2. Add their first page and their first block, without needing to be told how
3. Add text, an image, and one interactive block (e.g. a knowledge check)
4. Find and change a course-level setting (e.g. navigation mode) without guessing which drawer it's in
5. Find and change a player/learner-experience setting
6. Understand what's blocking them from publishing, in plain language, and fix it
7. Preview the course
8. Publish it, or create a share link / SCORM export
9. Distinguish clearly between "saved," "previewed," and "published" as different states

## Success criteria (the actual test)

- A first-time user can create a page and add a block with zero guidance or documentation
- A user can locate any given course/player setting on the first or second guess, not by scanning every drawer
- A user can add a block without first scanning the entire block catalog — a "start here" set of common choices is visible immediately
- A user can state, correctly, what is currently blocking publish (if anything) without needing to interpret technical language
- A user can reach Preview and Publish from anywhere in the editor without extra navigation
- Advanced concepts (Variables, Triggers, Objectives, Glossary) are reachable but not visible/competing for attention during basic authoring
- No native browser validation popups appear anywhere in the authoring flow
- Every settings drawer/panel has a single, clear, describable purpose — not a mix of unrelated concerns

## What "done" looks like for each phase

- **Phase 1 (quick wins):** all of the above EXCEPT the navigation/IA-related criteria (since layout doesn't change yet) — validation messaging, empty states, Course Health language, and visual hierarchy specifically improve
- **Phase 2 (shell/IA):** the navigation and "find a setting" criteria are met
- **Phase 3 (block picker):** the "add a block without scanning everything" criterion is met
- **Phase 4 (Publish & Share hub):** the publish/share/export criteria are met
- **Phase 6 (real testing):** ALL criteria are validated by 5-8 actual educators completing the realistic task list below, not just by our own judgment

## Phase 6 realistic task list (for later reference)

- Build a three-page course
- Add an image and a video
- Add a knowledge check
- Configure completion behavior
- Find and fix a Course Health issue
- Preview the course
- Publish it, or create a share link

Measure: where they hesitate, which labels they misread, whether they search in the wrong place, whether they understand saved/previewed/published as distinct, and whether advanced tools feel appropriately tucked away rather than missing entirely.

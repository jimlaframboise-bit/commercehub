# Daily refresh — scheduled task prompt (both tracker pages)

CommerceHub now carries **two** frozen tracker pages: `/tracker` (the R3 redesign) and
`/rolling12` (the original artifact). They read separate snapshots. If only one is refreshed
they drift apart and start disagreeing on screen, which is worse than either being a day stale.
**This prompt refreshes both in one run and supersedes `tools/tracker/daily-refresh-task-prompt.md`** —
create one task from this file rather than two tasks from two files.

**Where it has to run: Jim's computer, not the cloud** (his call, 2026-07-28). A cloud session
can pull Pacvue and rebuild but **cannot push** — it has no GitHub write credential, and Jim
declined storing a PAT. A cloud session also **cannot create this task**: desktop-local
scheduled tasks live in the Claude desktop app and are invisible to the cloud trigger API. Jim
creates it there himself (same place the 7am Amazon Attribution refresh lives), set to
**10:00 ET daily**, and pastes the prompt below verbatim.

**Honest caveat about reliability.** The pull, rebuild and verification are solid and fail
loudly. The **deploy** step is the fragile one: it drives the GitHub web UI through Chrome, and
GitHub commits asynchronously, so an unattended run can lose a commit if it doesn't wait for the
redirect. The prompt tells it to verify and to report a failure rather than claim success. If
daily deploys start failing, the fix is a fine-grained GitHub PAT scoped to this repo, which
would let the task run in the cloud end-to-end with no Mac dependency.

---

## Prompt (paste verbatim — it must be self-contained; a scheduled run starts with no memory)

Refresh the two frozen Pacvue snapshots behind the tracker pages in CommerceHub, then redeploy.

The repo is at `/Users/jameslaframboise/Claude/Projects/Pacvue Alternative`. There are two
independent pipelines and they must **both** run, in this order:

- `/tracker` — the R3 redesign. Procedure: `tools/tracker/refresh-tracker.md`. FX **1.42071**.
- `/rolling12` — the original artifact. Procedure: `tools/rolling12/refresh-rolling12.md`.
  FX **1.4205**.

**Read both runbooks first and follow them; they are the authoritative procedures.** The two FX
rates are different on purpose — each page must agree with the artifact it clones. Do not
"harmonise" them.

Rules that apply to both:

1. **Any reconciliation check that FAILS stops everything.** Deploy nothing, report the failure.
   Never adjust a number to make a check pass.
2. The page builders abort if a patch does not match exactly once. That guard means the artifact
   source moved. Stop and report; do not work around it.
3. After the single-file build, confirm `node tools/build-singlefile.mjs` prints
   `dup top-level decls: []`. Anything listed there means two pages are silently sharing a name
   and one route may be rendering the other's snapshot.
4. Verification gate before any deploy — all four must pass against the same build:
   - `node tools/rolling12/build-snapshot12.mjs` and `node tools/tracker/build-snapshot.mjs`
   - `node tools/rolling12/check-rolling12.mjs` (38/38)
   - `node tools/rolling12/prove-watchdog.mjs`
   - `node tools/gen-render-html.mjs && node tools/render-check.mjs` (29/29 routes, 0 errors)
5. Commit locally. The device mount denies unlink, so before **each** git write op `mv` both
   `.git/index.lock` and `.git/HEAD.lock` aside into `_to_delete/locks/` — do not `rm` them, and
   ignore "Another git process seems to be running", nothing is.
6. Deploy through the GitHub web UI in Chrome to `github.com/jimlaframboise-bit/commercehub`:
   `index.html` at the repo root, `src/data/trackerSnapshot.js` and
   `src/data/rolling12Snapshot.js` into `src/data`. Copy them to a **fresh** `.ch-deploy-<date>/`
   subpath and stage from there — re-staging a path already used serves a cached copy.
   Two things silently lose work: GitHub commits **asynchronously**, so after clicking
   "Commit changes" **wait for the redirect to the repo root** before navigating; and keep the
   commit summary under 50 characters, because a "ProTip" line appears past that and shifts the
   button about 23px, so a click aimed from a stale screenshot misses.
7. Verify: `github.com/jimlaframboise-bit/commercehub/commits/main` shows the new commits, and
   both `commercehub-five.vercel.app/#/tracker` and `.../#/rolling12` render with today's
   snapshot date in the header. Give each page ~15 seconds — the charts animate in, and a
   screenshot taken too early shows empty axes and looks like a failure when it isn't.

Then report, in a few sentences: the settled window day, blended actualized COGS and ad spend
with their deviation vs the frozen July plan, the CA/US split, and the deployed commit SHAs.
**If anything failed, say what failed and that the live pages are still showing the previous
snapshot — never report a deploy you did not verify.**

Do not touch the `amazon-rolling12-tracker`, `amazon-rolling12-tracker-redesign` or
`amazon-tracker-redesign` artifacts. They are the live originals; these pages are mirrors of
them, and the mirrors never edit the originals.

---

## When the month rolls over

Both artifacts carry a frozen `PLAN` block covering the current month only. On the first of a
month with no `PLAN` entry, every scoreboard card reads "—" and both pages are useless. The
snapshot builders check for this and fail rather than shipping a page of dashes, so the task
will report a failure rather than quietly degrade — but the actual fix is to project the new
month and freeze it into **both artifacts**, which is a decision, not a refresh.

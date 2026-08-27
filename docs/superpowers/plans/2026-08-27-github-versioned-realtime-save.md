# GitHub Versioned Realtime Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optimistic version checks to the GitHub JSON file and automatically save local record mutations when a session Token is available.

**Architecture:** Store the remote file as `{ version, records }`, while continuing to read legacy array JSON as version `1`. Track the last loaded remote version in the app, fetch the current Contents API file before each save, reject mismatches, and increment the version on successful writes. Route manual and automatic saves through one queued App-level save function.

**Tech Stack:** React, TypeScript, Vitest, GitHub Contents API.

**Spec:** User request in the current task.

## Global Constraints

- Preserve legacy array JSON compatibility.
- Never overwrite GitHub data when the remote version differs from the locally known version.
- Keep Token in session storage only; do not expose or persist it elsewhere.
- Keep localStorage as the fallback when no Token is available or remote saving fails.

### Task 1: Versioned remote data API

**Files:**
- Modify: `src/remote.ts`
- Test: `src/remote.test.ts`

- [x] Add snapshot and save-result types, parse `{ version, records }` and legacy arrays, and make save compare/increment versions.
- [x] Add tests for parsing versions, rejecting stale versions, and writing the incremented version.

### Task 2: App save orchestration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/RemoteControl.tsx`

- [x] Track the last loaded version and initialize it from the bundled data snapshot.
- [x] Queue automatic saves after add, edit, overwrite, and delete when a session Token exists.
- [x] Reuse the same version-aware queue for the manual GitHub button and update the known version after success.
- [x] Surface conflict guidance without discarding local records.

### Task 3: Verification and handoff

**Files:**
- Modify: `src/remote.test.ts` if needed for regressions.

- [x] Run the full Vitest suite, production build, and `git diff --check`.
- [x] Commit only the implementation, tests, and plan with a Conventional Commit.
- [x] Report that push still requires explicit confirmation.

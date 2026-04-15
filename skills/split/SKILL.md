---
name: phlight-split
description: Use when a plan file is too large for a single PR - splits it into a series of PR-sized plan files with dependencies noted
argument-hint: <path-to-plan-file> [--auto] [--noconfirm]
---

# Split Plan Into PRs

Take a large implementation plan and split it into PR-sized plan files. Each
split file references the parent plan and is independently consumable by
`phlight-implement`.

## Usage

```
/phlight-split <path-to-plan-file>
/phlight-split <path-to-plan-file> --auto
/phlight-split <path-to-plan-file> --auto --noconfirm
```

## Help

If `$ARGUMENTS` (trimmed) exactly matches one of `--help`, `-h`, `-help`,
`--h`, `help`, or `h`, print the help screen below and stop. Do not run any
other step.

```
phlight-split - split a large plan into PR-sized plan files

Usage:
  /phlight-split <path-to-plan-file>
  /phlight-split <path-to-plan-file> --auto
  /phlight-split <path-to-plan-file> --auto --noconfirm

Flags:
  --auto                  skip per-PR approval, auto-chain to implement first
  --noconfirm             propagated forward, skips merge confirmation
  --help, -h, help        show this help screen

Prerequisites:
  Required: ## Task Management
  Optional: ## Plans (defaults to docs/plans/, pr-target 400)

Splits a large plan into PR-sized plan files, each independently consumable
by /phlight-implement. Plan files are local-only (never committed).
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--auto`: skip interactive per-PR approval; make split decisions
  autonomously, present the result, then auto-chain to implement for the first
  plan
- `--noconfirm`: propagated forward, skips merge confirmation at end of chain

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`

Optional (have defaults):
- `## Plans` (defaults to `docs/plans/`, `pr-target: 400`)

## Task Tracker Integration

Read `## Task Management` config. If `tool` is not `none`:

1. Verify a task ID is present in the parent plan file
2. If not found, search for matching tasks using the configured provider
3. If no match, STOP and ask for a task ID
4. Include the confirmed task ID in every split plan file header

If `tool: none`, skip task ID inclusion.

## Scope Boundary

**Do NOT** modify the parent plan, invoke `phlight-implement`, execute any code,
create worktrees/branches, or update task statuses. The job ends when split plan
files are written. Plan files are local-only, never committed to git.

(Exception: in --auto mode, invoke implement for the first plan at completion.)

## PR Size Guidance

Read `pr-target` from `## Plans` config (default: 400 lines of implementation,
excluding tests and generated code).

- **Below pr-target**: do not split further. Merge overhead is not worth it.
- **pr-target to +200**: ideal PR size range.
- **+200 to +400**: acceptable if cohesive single concern.
- **Above +400**: must split.

Splitting should have clear value: either the plan is genuinely too large to
review as one PR, or it naturally parallelizes. Do not over-split into
aggressively small PRs where each touches 2-3 files. The overhead of managing
multiple PRs and branches must be justified.

## PR Quality Criteria

Every proposed PR must satisfy ALL of these:

1. **Comprehensible scope** - a reviewer understands the full PR without
   excessive context-switching
2. **Testable in code** - has automated tests that run and pass independently
3. **Testable manually** - has at least one manual verification step
4. **Minimal additions** - adds only what's needed
5. **Generous removals** - includes cleanup/refactoring where it naturally fits
6. **Independent mergeability** - can merge without breaking main, even if later
   PRs aren't done

State these criteria once at the start. Reference them when proposing each PR.

## Process

### Phase 1: Analysis

Read the parent plan file. Identify:
- All numbered tasks
- Dependencies between tasks (explicit + implicit)
- Natural layers: database/migrations, models, workers/services, backend API,
  frontend
- Artifacts produced that later tasks consume
- Task ID if present in the parent plan header
- **Parallelization opportunities**: groups of PRs with no shared dependencies

Present a brief summary: total task count, identified layers, dependency chains,
parallelization potential. Then move to Phase 2.

**Design with parallelization in mind.** Prefer groupings that maximize
independent PRs. Do not create artificial ordering.

### Phase 2: PR Proposal

**If --auto is NOT set:** Propose PRs one at a time, interactively:

```
## Proposed PR N: [Short Label]

**Tasks:** [task numbers from parent plan]
**Scope:** [2-3 sentences]
**Estimated size:** [rough line count relative to pr-target]
**Depends on:** [prior PR(s) or "none"]
**Automated tests:** [what test commands will pass after this PR]
**Manual verification:** [concrete check]
**Enables:** [what later PRs this unblocks]
```

Wait for user approval before proposing the next PR. Adjust on request.

**If --auto is set:** Propose all PRs at once based on best judgment. Present
the full breakdown for the user to review but do not wait for per-PR approval.

After all PRs are proposed, present a parallelization summary:

```
## Parallelization Analysis

**Dependency graph:**
PR 1 ─┬─> PR 2
       └─> PR 3 ──> PR 5
PR 4 ─────────────> PR 5

**Parallel groups:**
- Sequential: PR 1
- Parallel group A: PR 2 + PR 3 + PR 4
- Sequential (after A): PR 5

**Verdict:** 3 of 5 PRs can run in parallel after PR 1 merges
```

### Phase 3: Write Split Files

Write one file per PR to the plan directory (read from `## Plans` config,
default `docs/plans/`).

**Naming:** `YYYY-MM-DD-<feature>-pr<N>-<short-label>.md`

**File format:**

```markdown
# [Feature Name] - PR N: [Short Label]

**Parent Plan:** `<relative-path-to-parent-plan>`
**PR:** N of M
**Depends on:** PR N-1 ([label]) must be merged first | None
**Task:** {task-id} (if task tracking is active)
**Branch:** `{type}/{task-id}-pr<N>-<short-label>`

---

## Scope
[2-3 sentences]

## Tasks from Parent Plan
- Task X: [title]

## Verification
### Automated
- [exact commands]
### Manual
- [concrete checks]

## Dependencies on Prior PRs
- [specific artifacts needed, or "First in series"]

## What This Enables
- [what later PRs this unblocks, or "Final PR"]
```

## Completion

Announce absolute file paths with an execution map showing recommended order
and parallel lanes.

**If --auto is set:** Invoke `/phlight-implement {first-split-plan-path} --auto
[--noconfirm]`

**If --auto is not set:** Suggest running `/phlight-implement` for the first plan.

Do NOT commit plan files.

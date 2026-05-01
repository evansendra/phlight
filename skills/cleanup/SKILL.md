---
name: phlight-cleanup
description: Delete stale git branches locally and optionally on remote - supports dry-run, age threshold, and protected-branch safety
argument-hint: [--local] [--remote] [--dry-run] [--days <N>]
---

# Cleanup

Prune stale git branches that have outlived their usefulness. Defaults to
local-only deletion with a 14-day staleness threshold. Remote deletion is
opt-in, loud, and gated behind explicit user approval.

## Usage

```
/phlight-cleanup
/phlight-cleanup --dry-run
/phlight-cleanup --days 7
/phlight-cleanup --remote --dry-run
/phlight-cleanup --local --remote --days 30
```

## Help

If `$ARGUMENTS` (trimmed) exactly matches one of `--help`, `-h`, `-help`,
`--h`, `help`, or `h`, print the help screen below and stop. Do not run any
other step.

```
phlight-cleanup - delete stale git branches

Usage:
  /phlight-cleanup
  /phlight-cleanup --dry-run
  /phlight-cleanup --days <N>
  /phlight-cleanup --local --remote --dry-run
  /phlight-cleanup --remote --days 30

Flags:
  --local                 delete local branches (default if no scope given)
  --remote                delete remote branches (requires explicit approval)
  --dry-run               list branches that would be deleted, change nothing
  --days <N>              staleness threshold in days (default: 14)
  --help, -h, help        show this help screen

Defaults:
  - Scope: local only
  - Staleness: 14 days since last commit on the branch
  - Protected branches are never deleted (see below)

Protected branches (never deleted, local or remote):
  main, master, staging, develop, development, production, prod,
  release/*, hotfix/*, and the currently checked-out branch

Remote mode always:
  - Shows the full list of branches to be deleted
  - Warns about the irreversibility of remote deletion
  - Requires explicit user approval before proceeding
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--local`: target local branches for deletion (this is the default if
  neither `--local` nor `--remote` is specified)
- `--remote`: target remote branches for deletion; chainable with `--local`
  to clean both; always requires explicit user approval
- `--dry-run`: list what would be deleted without deleting anything; chainable
  with any scope flag
- `--days <N>`: integer, branches whose latest commit is older than N days are
  considered stale (default: 14)

## No Prerequisites

This skill has no required config sections. It operates purely on git state.
If the repo has loaded context with branch-protection rules or naming
conventions, respect those in addition to the built-in protected set.

## Protected Branches

The following branches are NEVER deleted regardless of flags or staleness.
This list is not configurable by flags - it is a hard safety net:

- `main`
- `master`
- `staging`
- `develop`
- `development`
- `production`
- `prod`
- Any branch matching `release/*` or `hotfix/*`
- The currently checked-out branch (HEAD)
- Any branch referenced by loaded context as protected, primary, or default

If the repo's CLAUDE.md or rules context specifies a main/default branch
name not in this list, add it to the protected set for this run.

## Process

### Step 1: Resolve flags

Parse `$ARGUMENTS` into the flags above. Apply defaults:
- If neither `--local` nor `--remote` is given, set scope to local-only
- If `--days` is not given, default to 14
- Validate that `--days` is a positive integer; reject otherwise

### Step 2: Gather branch data

For each scope (local, remote, or both):

**Local branches:**
```
git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:iso8601)' refs/heads/
```

**Remote branches (if --remote):**
```
git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:iso8601)' refs/remotes/origin/
```

Strip `origin/` prefix from remote refs for display. Exclude `origin/HEAD`.

### Step 3: Filter candidates

From the gathered branches, build a deletion candidate list by including
branches whose latest commit is older than `--days` days from now. Exclude:

1. Any branch in the protected set (Step 0)
2. The currently checked-out branch
3. For remote scope: any branch with an open PR (check with
   `gh pr list --head <branch> --state open --json number --jq length` -
   if the count is > 0, skip it and note it was skipped due to open PR)

### Step 4: Present results

Display a table of candidates grouped by scope:

```
Local branches to delete (N):
  branch-name              last commit: 2026-04-01 (29 days ago)
  other-branch             last commit: 2026-03-15 (46 days ago)

Remote branches to delete (M):
  feature/old-thing        last commit: 2026-03-20 (41 days ago)
  fix/stale-fix            last commit: 2026-02-28 (61 days ago)

Protected (skipped):
  main, develop, release/v2.1

Skipped (open PR):
  feature/in-review (#142)
```

If no candidates exist in any scope, say so and stop.

If `--dry-run` is set, present the table and stop. Do not delete anything.

### Step 5: Approve and execute

**Local deletion (no extra approval needed):**
Delete each local candidate branch:
```
git branch -D <branch-name>
```

**Remote deletion (explicit approval required):**
Before deleting ANY remote branch, present a prominent warning:

```
WARNING: Remote branch deletion is permanent and affects all collaborators.
The following N remote branches will be deleted from origin:
  <list each branch>

This cannot be undone. Type "yes" to confirm, anything else to abort.
```

Wait for the user to explicitly confirm. If they do not confirm, skip
remote deletion entirely and report that it was skipped.

Delete each confirmed remote candidate:
```
git push origin --delete <branch-name>
```

### Step 6: Report

Summarize what was deleted:

```
Deleted N local branch(es): <list>
Deleted M remote branch(es): <list>
Skipped K branch(es): <reasons>
```

## Error Handling

- If `gh` is not available and `--remote` is set, warn that open-PR detection
  is unavailable and require the user to confirm they want to proceed without
  that safety check
- If a branch deletion fails (e.g., branch is checked out in another
  worktree), report the error and continue with remaining branches
- Never force-delete a branch that is checked out anywhere; report it as
  skipped with the reason

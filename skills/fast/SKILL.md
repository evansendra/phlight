---
name: phlight-fast
description: Condensed workflow for quick fixes, bug fixes, chores, and small features - same guardrails, minimal ceremony. Use when the task is too small to justify full architecture
argument-hint: <description or task-id> [--noconfirm]
---

# Fast

Single-session condensed workflow. Same guardrails as the full pipeline (task
tracking, quality gates, naming conventions, code review) with minimal ceremony.
Use for bug fixes, chores, small features, and anything too small to justify
full architecture.

Fast mode is inherently auto-chaining. There are no separate steps to invoke
manually - the entire flow runs in one session with minimal human stops.

## Usage

```
/phlight-fast <description or task-id>
/phlight-fast <description or task-id> --noconfirm
```

## Help

If `$ARGUMENTS` (trimmed) exactly matches one of `--help`, `-h`, `-help`,
`--h`, `help`, or `h`, print the help screen below and stop. Do not run any
other step.

```
phlight-fast - condensed single-session workflow for small changes

Usage:
  /phlight-fast <description or task-id>
  /phlight-fast <description or task-id> --noconfirm

Flags:
  --noconfirm             skip merge confirmation at the end
  --help, -h, help        show this help screen

Prerequisites:
  Required: ## Task Management, ## Quality Gates

Runs task tracking, quick scope, implementation, quality gates, code review,
PR, and merge in one session. Use for bug fixes, chores, and small features.
For larger work, use /phlight-architect instead.
```

## Flags

- `--noconfirm`: skip merge confirmation at the end

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`
- `## Quality Gates`

## Human Stops

Even in this condensed flow, the following require human input:

1. **Manual test** - after implementation, the human must verify
2. **Merge confirmation** - unless --noconfirm is set
3. **Project-specific interventions** - any step that loaded project context
   says requires human action (migrations, deployments, etc.)

## Process

### Step 1: Task tracking

Read `## Task Management` config. If `tool` is not `none`:
- If a task ID is provided (matches configured `id-format`), fetch it and set
  status to "in progress" (via subagent)
- If a description is provided, search for matching tasks. If found, confirm
  with the user and set to "in progress". If not found, create a new task
  (draft title + short body, preview, get approval, create) and set to
  "in progress"

If `tool: none`, skip.

### Step 2: Quick scope

Write a brief scope definition (NOT a full architecture doc):

```
## Scope: <title>
**Task:** <task-id or "none">
**Type:** fix | feat | chore | refactor
**What:** <1-3 sentences describing the change>
**Files likely touched:** <list>
**Verification:** <how to test it>
```

Present to the user for confirmation. Adjust if needed. This is the only
planning step.

### Step 3: Implement

Create a worktree and branch via `git worktree add .worktrees/<branch-name>`.
Worktrees MUST live in `.worktrees/` at the project root (ensure it is
gitignored). Do NOT use the EnterWorktree tool as it ignores this location.
Use conventional branch naming from the `## Task Management` config:
`{type}/{task-id}-short-name`.

Implement the change directly. No superpowers:executing-plans, no detailed
plan file. Just write the code. Commit along the way.

**Project-specific interventions:** Scan loaded context for human-intervention
requirements. If the implementation touches any such area (e.g., migrations),
stop and follow the documented procedure before continuing.

Stop for manual test. Include the full absolute path to the worktree.

### Step 4: Quality gates

Read `## Quality Gates` config. Run all configured commands. Fix any failures
before proceeding.

### Step 5: Quick review

Dispatch a single `pr-review-toolkit:code-reviewer` agent with a focused
prompt:

```
Review changes on the current branch. Focus only on:
- Actual bugs or logic errors
- Dead code or debugging artifacts left behind
- Security issues

Skip style, structure, and simplification concerns. This is a quick fix.

Run: git diff {DEFAULT}...HEAD
Verdict: CLEAN / NEEDS CHANGES (with specific issues only)
```

If NEEDS CHANGES with critical issues, fix them and re-run quality gates.
If CLEAN or only non-critical findings, proceed.

### Step 6: PR and merge

Create a PR using `gh`. Wait for CI checks to pass.

**Confirmation gate** (skip if `--noconfirm`):
- Present PR URL
- Ask to confirm merge
- Wait for explicit confirmation

Merge (squash), cleanup local worktree/branch. Do not delete remote branch.

### Step 7: Task completion

If task tracking is active, mark task done and comment the PR URL (via
subagent).

## Scope Guard

If at any point during implementation the scope grows beyond the original
quick scope (touching significantly more files than planned, discovering the
change requires architectural decisions, estimating the diff will exceed
`pr-target` from `## Plans` config), stop and tell the user:

> This is growing beyond quick-fix scope. Consider switching to the full
> pipeline: `/phlight-architect <description>`

Do not continue expanding a fast-mode session into a large feature.

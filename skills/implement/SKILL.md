---
name: phlight-implement
description: Use when handing off a plan to an executing agent - injects standard execution instructions after a plan initiation prompt
argument-hint: <plan path or initiation prompt> [--auto] [--noconfirm]
---

# Implement Plan

Inject standard execution instructions after the user's plan initiation
message. The user provides the task context (plan file paths, worktree notes)
and this skill appends the execution guidelines.

## Usage

```
/phlight-implement <plan initiation prompt>
/phlight-implement <plan path> --auto
/phlight-implement <plan path> --auto --noconfirm
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--auto`: auto-chain to review at completion (after manual test passes)
- `--noconfirm`: propagated forward, skips merge confirmation at end of chain

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`

Optional (have defaults):
- `## Plans` (for `pr-target`, default 400)

## Injected Prompt

Append the following after the user's initiation message:

---

**FOR AGENTS:** TASK TRACKER INTEGRATION: Read `## Task Management` config from
loaded context. If `tool` is not `none`, verify a task ID is associated with
this work - check the plan file header, user's message, branch name, and
surrounding context. If no ID found:
1. Search for matching tasks using the configured provider
2. If no match exists, STOP and ask the user to provide a task ID or create one
3. Do NOT proceed without a confirmed task

Once confirmed, set the task status to "in progress" (via subagent, using the
provider's tools).

If `tool: none`, skip task tracking and proceed.

**FOR AGENTS:** PLAN REVIEW: Before implementing, critically evaluate this plan.
Check for:
- Logical inconsistencies (tasks referencing artifacts that aren't created)
- Missing dependencies or ordering issues
- Scope that exceeds a reasonable single-PR size (read `pr-target` from
  `## Plans` config, default 400 lines; if the plan looks like it will produce
  significantly more than pr-target + 200 lines of implementation, flag it)
- Assumptions that don't match the current codebase

If issues are found, present them clearly and wait for the user to decide
whether to proceed, adjust, or re-plan. Do not silently proceed past problems.

**FOR AGENTS:** REQUIRED SUB-SKILL: Once the plan is approved, use
superpowers:executing-plans to implement it task-by-task

**FOR AGENTS:** PLAN SEQUENCE CHECK: Before starting, inspect the plan file for
references to a parent plan or plan sequence (e.g. "Part N of M", a
`parent_plan` field, references to sibling plan files). If the plan does NOT
appear to be part of a sequence with a parent plan file, emit a visible warning:

> **WARNING:** This plan does not appear to be part of a plan sequence (no
> parent plan file detected). If this was split from a larger plan via
> `phlight-split`, the parent plan file may be missing or unlinked. Confirm with
> the user before proceeding.

**FOR AGENTS:** MANUAL TEST INSTRUCTIONS: Whenever stopping for manual testing,
always include the **full absolute path to the worktree** being used, so the
user knows exactly where to run commands or inspect files.

**FOR AGENTS:** PROJECT-SPECIFIC INTERVENTIONS: Scan loaded project context
(CLAUDE.md, rules files) for any steps that explicitly require human
intervention (e.g., migration application, manual deployments, secret rotation).
When the plan includes such a step, STOP and present the documented procedure
to the user. Wait for explicit confirmation before continuing. This applies
even in --auto mode.

**FOR AGENTS:** MIGRATION SAFETY: If the plan includes database migration steps,
do NOT auto-apply migrations to any remote or shared database. Create the
migration file, then STOP and present the user with the project's documented
migration workflow. If no migration workflow is documented in loaded context,
present the migration file path and ask the user how to apply it. Wait for
explicit confirmation before proceeding with any work that depends on schema
changes.

Report which local services (if any) need to be running for manual testing.
Stop along the way when there is potentially demonstrable work. Focus on the
final outcome of the feature itself.

Commit along the way. Create worktrees via `git worktree add .worktrees/<branch-name>`.
Worktrees MUST live in `.worktrees/` at the project root (ensure it is
gitignored). Do NOT use the EnterWorktree tool as it ignores this location.
When creating a worktree/branch for this work:
- **If the plan file specifies a `Branch:` field**, use that exact branch name.
  This is critical for split plans where each sub-plan has a unique branch.
- **Otherwise**, read the `## Task Management` config for the task ID format
  and use conventional branch naming: `feat/{task-id}-short-name`,
  `fix/{task-id}-short-name`, or `refactor/{task-id}-short-name`. If the task
  ID is missing or ambiguous, ask the user.

## Completion

After the user confirms manual testing passes:

1. Set task status to "ready for review" (if task tracking is active, via
   subagent)

**If --auto is set:** Invoke `/phlight-review --auto [--noconfirm]`

**If --auto is not set:** Suggest next step based on change size:
- If diff exceeds pr-target lines: recommend `/phlight-review` before merge
- If diff is small/clean: suggest either `/phlight-review` or `/phlight-merge`

---
name: phlight-merge
description: Use when manual testing passes and you want to create a PR, wait for checks, merge, and cleanup the worktree/branch
argument-hint: [--auto] [--noconfirm]
---

# Merge

The completion counterpart to `phlight:implement`. The user has verified the work
manually and wants it merged into the codebase.

## Usage

```
/phlight:merge
/phlight:merge --noconfirm
/phlight:merge --auto
/phlight:merge --auto --noconfirm
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--auto`: if part of a multi-plan sequence, auto-chain to implement for the
  next split plan after merge completes
- `--noconfirm`: skip the human confirmation step before merging

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`
- `## Quality Gates`

## Injected Prompt

Append the following after the user's message:

---

Manual tests pass. Do the following:

0. **Task tracker check**: Read `## Task Management` config. If `tool` is not
   `none`, verify a task ID is associated with this work (check branch name,
   commit messages, context). If no ID found, search for matching tasks and
   suggest them. If no match, ask the user to provide a task ID or say "skip".
   If `tool: none`, skip task tracking.

1. **Run quality gates locally BEFORE creating the PR.** Read the
   `## Quality Gates` config. Run each configured command (test, lint, format,
   build) in sequence. If any check fails, fix the issue and re-run. Do NOT
   proceed to PR creation until all pass.

2. Create a PR using the `gh` CLI.

3. Wait for GitHub status checks to pass (poll with `gh`).

4. **Confirmation gate** (skip if `--noconfirm`):
   - Present the PR URL to the user
   - Ask to confirm ready to merge
   - Do NOT proceed until explicit confirmation

5. Merge the PR (squash) and cleanup the local worktree/branch (worktrees live
   in `.worktrees/` at the project root). Do not delete the remote branch.

6. **Task tracker update** (if task tracking is active): Infer the task ID from
   the branch name or commit messages using the configured `id-format`. Mark
   the task done and comment the PR URL using the provider's tools (via
   subagent). If the task ID is ambiguous, ask the user.

## Completion

Check if this work is part of a multi-plan sequence (look for sibling split
plan files, parent plan references, or a `PR: N of M` field in the plan).

**If more plans remain in the sequence:**
- Announce the absolute path to the next plan file
- If --auto is set: invoke `/phlight:implement {next-plan-path} --auto
  [--noconfirm]`
- If --auto is not set: suggest running `/phlight:implement` for the next plan

**If this was the final plan (or not part of a sequence):**
- Announce completion
- If part of a sequence, confirm all plans have been merged

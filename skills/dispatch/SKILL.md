---
name: phlight-dispatch
description: Send a task to an implementing agent in another tmux pane with communication protocol, env prep, and scope constraints. Use when coordinating multi-agent work across tmux panes
argument-hint: <task or issue-id> [--pane N] [--skill fast|implement]
---

# Dispatch

Send a self-contained task to an implementing agent running in another tmux
pane. Generates a complete prompt with communication protocol, environment
setup, scope constraints, and report-back conventions.

The implementing agent has zero context from this conversation. The dispatch
prompt must be entirely self-contained.

## Usage

```
/phlight-dispatch <task description or issue-id>
/phlight-dispatch <task description or issue-id> --pane 2
/phlight-dispatch <task description or issue-id> --skill implement
```

## Help

If `$ARGUMENTS` (trimmed) exactly matches one of `--help`, `-h`, `-help`,
`--h`, `help`, or `h`, print the help screen below and stop. Do not run any
other step.

```
phlight-dispatch - send a task to an implementing agent in another tmux pane

Usage:
  /phlight-dispatch <task or issue-id>
  /phlight-dispatch <task or issue-id> --pane 2
  /phlight-dispatch <task or issue-id> --skill implement

Flags:
  --pane N                target tmux pane (default: 1)
  --skill fast|implement  which phlight skill the implementer uses (default: fast)
  --overseer N            this pane's number for report-back (default: 0)
  --help, -h, help        show this help screen

Prerequisites:
  Required: ## Task Management
  Required: active tmux session with target pane running a coding agent
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--pane N`: target tmux pane number (default: 1)
- `--skill fast|implement`: which phlight skill to use (default: fast)
- `--overseer N`: this pane's number for report-back (default: 0)

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`

Required environment (verify before generating prompt):
- Active tmux session: `tmux display-message -p '#S'`
- Target pane exists: `tmux list-panes -F '#{pane_index}'`

## Process

### Step 1: Resolve task

Read `## Task Management` config. If input matches `id-format`, fetch task
details (title, body, labels) from the configured provider. Otherwise treat
input as a plain description.

### Step 2: Determine branch name

Using `## Task Management` config:
- Infer type from task context (fix, feat, chore, refactor)
- Build branch name using configured `branch-format` if available, otherwise
  `{type}/{task-id}-short-description`

### Step 3: Prep environment

1. Check if `.env` exists at project root. If so, include a copy instruction
   in the dispatch prompt (implementer copies it to worktree after creation)
2. Scan loaded context (CLAUDE.md, rules files) for auth instructions or
   deployment setup the implementer will need. Include relevant sections
   verbatim in the prompt

### Step 4: Build dispatch prompt

Assemble a single prompt following this template. Adapt the constraints
section to the specific task - be explicit about what NOT to do based on
the task scope.

```
Use the phlight:{skill} skill. Task: {task-id} {task-title}

## What
{task description from issue body or user input}

## Constraints
{task-specific scope limits}
- Do NOT add tests unless the task explicitly requires them
- Do NOT refactor adjacent code
- Do NOT touch files outside the stated scope

## Branch
{branch-name}

## Environment
{auth instructions, .env copy notes, or "No special setup needed"}

## Report Protocol
All communication goes through tmux. Do NOT present interactive questions,
confirmations, or prompts - the user is not watching your pane.

- Done: tmux send-keys -t {overseer} "DONE: {branch-name}" Enter
- Question: tmux send-keys -t {overseer} "QUESTION: <your question>" Enter
  Then STOP and WAIT for a response before proceeding.
- Problem: tmux send-keys -t {overseer} "PROBLEM: <description>" Enter
  Then STOP and WAIT for instructions.
```

### Step 5: Preview and send

Present the generated prompt to the overseer. After approval:

1. Send via: `tmux send-keys -t {pane} "{prompt}" Enter`
2. Escape any double quotes in the prompt body before sending
3. If the prompt is too long for a single tmux send-keys (over ~1500 chars),
   write it to a temp file and have the implementer read it:
   write prompt to `/tmp/phlight-dispatch-{task-id}.md`, then send
   `tmux send-keys -t {pane} "Read /tmp/phlight-dispatch-{task-id}.md and
   execute the task described there" Enter`

### Step 6: Confirm dispatch

After sending, print the expected report-back messages:

```
Dispatched to pane {pane}. Waiting for:

  DONE: {branch}      -> review diff, then merge/promote
  QUESTION: <text>     -> answer via tmux send-keys -t {pane}
  PROBLEM: <text>      -> diagnose and redirect
```

Do not poll or sleep. Wait for the agent to report back.

## Handling Responses

When a report-back message arrives:

**DONE:** Review the work before proceeding:
1. `git diff origin/main...origin/{branch} --stat` - verify only expected
   files changed
2. `git diff origin/main...origin/{branch}` - review the actual diff
3. `git log origin/{branch} --oneline -5` - check commit messages
4. If clean, suggest next step (PR to staging, direct merge, etc.)
5. If issues found, send corrections back to the implementer

**QUESTION:** Help formulate an answer, then relay it:
`tmux send-keys -t {pane} "{answer}" Enter`

**PROBLEM:** Assess severity. Either redirect the implementer with new
instructions, or take over the work locally.

## Follow-up Dispatches

Common follow-up tasks after DONE (send as new dispatches to the same pane):

**Merge + monitor staging:**
```
Merge PR #{n} into staging with: gh pr merge {n} --squash. Then monitor
staging deploy for 5 minutes. {include auth instructions}. If healthy,
report: tmux send-keys -t {overseer} "STAGING HEALTHY" Enter.
If problems: tmux send-keys -t {overseer} "STAGING PROBLEM: <desc>" Enter
```

**Promote staging to main:**
```
Open a promotion PR from staging to main and merge with --merge (not
--squash). Report: tmux send-keys -t {overseer} "PROMOTED: staging to
main" Enter
```

**Monitor production:**
```
Monitor production deploy for 5 minutes. {include auth instructions}.
Report: tmux send-keys -t {overseer} "PROD HEALTHY" Enter or
tmux send-keys -t {overseer} "PROD PROBLEM: <desc>" Enter
```

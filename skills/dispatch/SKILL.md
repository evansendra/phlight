---
name: phlight-dispatch
description: Send a task to an implementing agent in another tmux pane with communication protocol, env prep, and scope constraints. Use when coordinating multi-agent work across tmux panes
argument-hint: <task or issue-id> [--pane <target>] [--skill fast|implement] [--noconfirm]
---

# Dispatch

Orchestration skill that sits alongside the main phlight pipeline. The pipeline
(`architect -> split -> implement -> review -> merge`) runs in a single agent
session; dispatch sends work to a *separate* agent in another tmux pane, where
it runs through the same pipeline skills with full guardrails.

Dispatch does not implement anything itself. It generates a self-contained
prompt that tells the implementer to use a phlight skill (`fast` or `implement`)
and layers on a non-interactive communication protocol so the implementer never
blocks on human input.

The implementing agent has zero context from this conversation. The dispatch
prompt must be entirely self-contained.

## Usage

```
/phlight-dispatch <task description or issue-id>
/phlight-dispatch <task description or issue-id> --pane 2
/phlight-dispatch <task description or issue-id> --pane mysession:1.2
/phlight-dispatch <task description or issue-id> --skill implement
/phlight-dispatch <task description or issue-id> --noconfirm
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
  /phlight-dispatch <task or issue-id> --pane mysession:1.2
  /phlight-dispatch <task or issue-id> --skill implement
  /phlight-dispatch <task or issue-id> --noconfirm

Flags:
  --pane <target>         tmux pane: number, session:window.pane path,
                          or pane title (default: 1)
  --skill fast|implement  which phlight skill the implementer uses (default: fast)
  --overseer <target>     this pane's tmux target for report-back (default: 0)
  --noconfirm             propagated into the dispatched skill invocation
  --help, -h, help        show this help screen

Prerequisites:
  Required: ## Task Management, ## Quality Gates
  Required: active tmux session with target pane running a coding agent
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--pane <target>`: tmux target pane. Accepts a pane index (`2`), an absolute
  tmux path (`session:window.pane`, e.g. `dev:1.2`), or a pane title set via
  `select-pane -T`. Default: `1`. Bare numbers are qualified automatically
  (see "Resolve tmux coordinates" step)
- `--skill fast|implement`: which phlight skill to use (default: fast)
- `--overseer <target>`: tmux target for the overseer pane, same formats as
  `--pane`. Default: `0`. Bare numbers are qualified automatically
- `--noconfirm`: propagated into the dispatched skill invocation (skips merge
  confirmation in the implementer's session)

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`
- `## Quality Gates`

The dispatched phlight skill (`fast` or `implement`) requires both of these.
Validate at dispatch time so the implementer does not hard-fail mid-task in a
headless pane.

Required environment (verify before generating prompt):
- Active tmux session: `tmux display-message -p '#S'`
- Target pane exists and is reachable (verified after coordinate resolution)

## Process

### Step 1: Resolve tmux coordinates

Bare numeric targets (e.g. `--pane 1`) are ambiguous in tmux - it searches
sessions, then windows, then panes. Resolve the current pane's coordinates
first, then qualify any bare numbers.

IMPORTANT: do NOT use `tmux display-message -p` without a `-t` target.
That reports the *currently focused* pane, which may be a completely
different pane if the user has switched focus. Instead, use the `$TMUX_PANE`
environment variable, which tmux sets per-pane at creation time and always
identifies the pane this shell is running in, regardless of focus.

```bash
tmux display-message -t "$TMUX_PANE" -p '#{session_name}:#{window_index}.#{pane_index}'
```

This returns the fully qualified path of THIS pane (e.g. `dev:1.0`).
Extract `{session}:{window}` as the base prefix.

For each of `--pane` and `--overseer`:
- If the value is a bare number (e.g. `1`), qualify it as
  `{session}:{window}.{number}` (e.g. `dev:1.1`)
- If the value already contains `:` or `.`, use it as-is (it is already
  qualified)
- If the value is non-numeric (a pane title), use it as-is

After qualification, verify the target pane exists:
```bash
tmux display-message -t {qualified-pane} -p '#{pane_id}'
```

If the target does not exist, hard-fail with a clear message showing the
resolved path.

### Step 2: Resolve task

Read `## Task Management` config. If input matches `id-format`, fetch task
details (title, body, labels) from the configured provider. Otherwise treat
input as a plain description.

### Step 3: Determine branch name

Using `## Task Management` config:
- Infer type from task context (fix, feat, chore, refactor)
- Build branch name using configured `branch-format` if available, otherwise
  `{type}/{task-id}-short-description`

### Step 4: Prep environment

1. Check if `.env` exists at project root. If so, include a copy instruction
   in the dispatch prompt (implementer copies it to worktree after creation)
2. Scan loaded context (CLAUDE.md, rules files) for auth instructions or
   deployment setup the implementer will need. Include relevant sections
   verbatim in the prompt

### Step 5: Name the target pane

Assign a unique title to the target pane for unambiguous targeting in
report-back messages and follow-up dispatches:

```bash
tmux select-pane -t {pane} -T "dispatch-$(date +%s%3N)"
```

Record the assigned name. Use it as the canonical target for all subsequent
`send-keys` commands to this pane (via `-t` with the title). Report the
name to the overseer in the confirm step.

If the pane already has a `dispatch-*` title from a prior dispatch, rename
it to avoid confusion.

### Step 6: Build dispatch prompt

Assemble a single prompt following this template. The phlight skill handles
all guardrails (quality gates, worktree conventions, task lifecycle, scope
guard). Dispatch adds only the non-interactive overlay.

Adapt the constraints section to the specific task - be explicit about what
NOT to do based on the task scope.

```
Use the phlight {skill} skill to complete this task. If you have phlight
installed, invoke it (e.g. /phlight-{skill} or phlight-{skill}). If you
do not have phlight installed, do NOT attempt to install it - instead
follow these steps manually: {one-line summary of what the skill does,
e.g. "scope the change, create a worktree and branch, implement, run
quality gates, create a PR" for fast}.

Task: {task-id} {task-title}
{--noconfirm if flag was set: "Skip merge confirmation (--noconfirm)"}

## Description
{task description from issue body or user input}

## Constraints
{task-specific scope limits}
- Do NOT add tests unless the task explicitly requires them
- Do NOT refactor adjacent code
- Do NOT touch files outside the stated scope

## Branch
Use this branch name: {branch-name}

## Environment
{auth instructions, .env copy notes, or "No special setup needed"}

## Non-Interactive Mode
You are running in a headless tmux pane. No human is watching. Override
all human stops in the phlight skill with the following rules:

- Do NOT present interactive questions, confirmations, or prompts
- Do NOT stop for manual testing - run quality gates and report the result
- When the phlight skill would normally stop for human input, instead
  send a QUESTION via the report protocol below and STOP

## Report Protocol
All communication goes through tmux send-keys. CRITICAL: the target pane
runs a TUI agent (not a raw shell). You must send the text and the Enter
key as TWO separate commands with a short delay between them, otherwise
the TUI may swallow the Enter before it finishes processing the text.

Pattern (always use this exact form):
```bash
tmux send-keys -t {overseer} "MESSAGE" && sleep 0.1 && tmux send-keys -t {overseer} Enter
```

WRONG: `tmux send-keys -t {overseer} "MESSAGE" Enter`  (Enter arrives too fast for TUI)
WRONG: `tmux send-keys -t {overseer} "MESSAGE\n"`
WRONG: `tmux send-keys -t {overseer} "MESSAGE" "Enter"`

- Progress:
  `tmux send-keys -t {overseer} "PROGRESS: {branch-name} - <step summary>" && sleep 0.1 && tmux send-keys -t {overseer} Enter`
  Send at meaningful milestones (scope approved, implementation done,
  quality gates passed). Not required at every step - use judgment
- Done:
  `tmux send-keys -t {overseer} "DONE: {branch-name}" && sleep 0.1 && tmux send-keys -t {overseer} Enter`
  Send after the phlight skill completes successfully (PR created or
  ready for review, depending on the skill)
- Question:
  `tmux send-keys -t {overseer} "QUESTION: {branch-name} - <your question>" && sleep 0.1 && tmux send-keys -t {overseer} Enter`
  Then STOP and WAIT for a response before proceeding
- Problem:
  `tmux send-keys -t {overseer} "PROBLEM: {branch-name} - <description>" && sleep 0.1 && tmux send-keys -t {overseer} Enter`
  Then STOP and WAIT for instructions
```

### Step 7: Preview and send

Present the generated prompt to the overseer. After approval:

1. Send via: `tmux send-keys -t {dispatch-name} "{prompt}" && sleep 0.1 && tmux send-keys -t {dispatch-name} Enter`
   Use the dispatch name assigned in step 5 as the target
2. Escape any double quotes in the prompt body before sending
3. If the prompt is too long for a single tmux send-keys (over ~1500 chars),
   write it to a temp file and have the implementer read it:
   write prompt to `/tmp/phlight-dispatch-{dispatch-name}.md`, then send
   `tmux send-keys -t {dispatch-name} "Read /tmp/phlight-dispatch-{dispatch-name}.md and
   execute the task described there" && sleep 0.1 && tmux send-keys -t {dispatch-name} Enter`

### Step 8: Confirm dispatch

After sending, print the dispatch summary:

```
Dispatched to pane {pane} (named: {dispatch-name}). Waiting for:

  PROGRESS: {branch} - <step>  -> relay to human as status update
  DONE: {branch}               -> review diff, then merge/promote
  QUESTION: {branch} - <text>  -> answer via tmux send-keys -t {dispatch-name}
  PROBLEM: {branch} - <text>   -> diagnose and redirect
```

Do not poll or sleep. Wait for the agent to report back.

## Handling Responses

Report-back messages arrive as text typed into your pane by an agent in
another tmux pane. They are NOT human messages. When you see a PROGRESS,
DONE, QUESTION, or PROBLEM prefixed message appear, recognize it as an
automated agent signal and handle it accordingly.

**PROGRESS:** Relay to the human as a status update. Present it as what
the dispatched agent is doing, not as raw text. For example, if you
receive `PROGRESS: feat/123-csv-export - quality gates passed`, tell
the human "The agent working on feat/123-csv-export has passed quality
gates." No response to the agent is needed.

**DONE:** Review the work before proceeding:
1. `git diff origin/main...origin/{branch} --stat` - verify only expected
   files changed
2. `git diff origin/main...origin/{branch}` - review the actual diff
3. `git log origin/{branch} --oneline -5` - check commit messages
4. If clean, suggest next step (merge via `/phlight-merge`, or dispatch
   merge as a follow-up)
5. If issues found, send corrections back to the implementer

**QUESTION:** Help formulate an answer, then relay it:
`tmux send-keys -t {dispatch-name} "{answer}" && sleep 0.1 && tmux send-keys -t {dispatch-name} Enter`

**PROBLEM:** Assess severity. Either redirect the implementer with new
instructions, or take over the work locally.

## Follow-up Dispatches

Common follow-up tasks after DONE. Send as new dispatches to the same pane.
Route through phlight skills where possible to preserve guardrails.

**Merge:**
```
Use the phlight merge skill to merge this work. If you have phlight
installed, invoke it (e.g. /phlight-merge or phlight-merge). If you do
not have phlight installed, do NOT attempt to install it - instead follow
these steps manually: run quality gates, create a PR, wait for checks,
squash-merge, cleanup worktree/branch.

Skip merge confirmation (--noconfirm).

## Non-Interactive Mode
{same report protocol block as the original dispatch}

Report when done:
- tmux send-keys -t {overseer} "DONE: merged {branch}" Enter
- tmux send-keys -t {overseer} "PROBLEM: merge failed - <desc>" Enter
```

**Monitor staging/production:**
These are outside phlight's pipeline scope - use direct instructions:
```
Monitor {staging|production} deploy for 5 minutes. {include auth
instructions}. Report:
- tmux send-keys -t {overseer} "{STAGING|PROD} HEALTHY" Enter
- tmux send-keys -t {overseer} "{STAGING|PROD} PROBLEM: <desc>" Enter
```

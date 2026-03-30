---
name: phlight-review
description: Use after phlight:implement when code is ready - opinionated PR fitness review focused on bloat, anti-patterns, and simplification, with a brief pre-merge sanity checklist
argument-hint: [--auto] [--noconfirm]
---

# Review

Quality gate between `phlight:implement` and `phlight:merge`. Review the full diff
for PR fitness - not lint or test correctness (assumed passing), but whether the
PR is tight, clean, and free of unnecessary baggage.

## Usage

```
/phlight:review
/phlight:review --auto
/phlight:review --auto --noconfirm
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--auto`: if verdict is CLEAN, auto-chain to merge
- `--noconfirm`: propagated forward, skips merge confirmation

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`

## Task Tracker Integration

Read `## Task Management` config. If `tool` is not `none`:

1. Verify a task ID is associated with this branch (check branch name, commit
   messages, context)
2. If no ID found, search for matching tasks using the configured provider
3. If no match, warn: "No task found for this branch. Provide a task ID or say
   'skip'." Then wait.

If `tool: none`, skip task tracking and proceed.

## Assumptions

- Tier 1 quality gates (lint, format, build, tests) already pass
- The human has been testing incrementally during `phlight:implement`
- This is a judgment-based review, not an automated checklist

## Process

### Step 1: Identify the diff and worktree

Determine the absolute worktree path. Include it in the final report header.

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
DEFAULT=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
DEFAULT=${DEFAULT:-main}
git diff "$DEFAULT"...HEAD --stat
git log "$DEFAULT"..HEAD --oneline
```

If nothing to review, report "Nothing to review" and stop.

Build a brief summary of what was implemented from the commit history.

### Step 2: Dispatch review agents (parallel)

Launch both agents in parallel using the Agent tool.

#### Agent 1: `pr-review-toolkit:code-reviewer`

Prompt template:

```
Review the code changes on the current branch for PR fitness.

What was implemented: {summary from commits}
Base: {DEFAULT branch}
Head: HEAD

Run: git diff {DEFAULT}...HEAD

Your review lens - focus ONLY on these:
- Dead code, unused imports, commented-out code, leftover debugging artifacts
- Unnecessary files or test padding that inflates the PR without adding value
- Anti-patterns, poor abstractions, code that will confuse the next reader
- Actual bugs or logic errors (not theoretical edge cases)
- Code that duplicates existing utilities or patterns in the codebase

Explicitly IGNORE:
- Style preferences and formatting nits
- Performance optimizations that only matter at scale
- "You could also do it this way" alternative suggestions
- Missing comments or docstrings (unless genuinely confusing without them)
- Theoretical concerns that aren't real problems today

Every finding must be meaningful - something a senior reviewer would actually
flag. If you wouldn't request-changes over it, don't report it.

Use file:line references. Categorize as Critical/Important only.
No Minor category - if it's minor, skip it.
Give a clear verdict: CLEAN / NEEDS CHANGES
```

#### Agent 2: `pr-review-toolkit:code-simplifier`

Prompt template:

```
Review changes on the current branch for simplification opportunities.

Run: git diff {DEFAULT}...HEAD

Focus on meaningful simplification - things that genuinely reduce complexity
or remove dead weight. Every suggestion should pass the bar of "a senior
reviewer would flag this":
- Over-engineering: abstractions that only serve one call site
- Dead code paths or unreachable branches introduced in this PR
- Test bloat: tests that don't add meaningful coverage beyond existing tests
- Unnecessary indirection or wrapper layers

Future considerations (not blockers):
- Refactoring outside the PR's diff that would benefit from patterns introduced
  here
- Tests that are fine now but may become redundant as the feature evolves

Do NOT suggest:
- Optimizations that trade readability for marginal performance
- Breaking changes to simplify
- Trivial reductions that save a line or two without meaningful clarity gain

Only report opportunities where the simplification is clearly better, not just
different.
```

### Step 3: Code size snapshot

```bash
git diff "$DEFAULT"...HEAD --shortstat
git diff "$DEFAULT"...HEAD --name-only | xargs scc 2>/dev/null || echo "(scc not available)"
```

### Step 4: Synthesize and report

Combine agent results into a single report. Deduplicate findings flagged by
both agents.

### Step 5: Pre-merge sanity checklist

Generate a brief "before you merge, confirm:" block based on the full diff.

Rules:
- Prioritize by blast radius (most embarrassing if broken)
- Focus on end-to-end flows touching multiple changed files
- Skip things fully covered by automated tests with no UI component
- For things not worth manually testing, note what gives confidence instead
- Aim for roughly 5 items. More than 5 suggests the PR may need splitting

## Output Format

```
## Review: {branch-name}
**Worktree:** `{absolute worktree path}`

### Code Snapshot
{lines added} added, {lines deleted} deleted across {N} files
{condensed scc table if available}

### Findings

#### Critical
- [file:line] Description
  Why it matters / suggested fix

#### Important
- [file:line] Description
  Why it matters / suggested fix

#### Simplification Opportunities
- [file:line] Description
  What could be simpler

#### Future Considerations
- [description] (not a blocker)

(Omit empty categories)

### Pre-Merge Sanity Check

Before merging, confirm:
- [ ] {thing to verify} - {how to verify it}
...

### Verdict
**CLEAN** / **NEEDS CHANGES**
{One-line reasoning}
```

## Rules

- No Minor/nitpick category - if it's not worth fixing before merge, skip it
- Assume the human is competent and has been testing
- Findings should be actionable, not advisory
- Keep the report concise
- If the PR is clean, say so and move on

## Completion

**If verdict is CLEAN:**
- If --auto is set: invoke `/phlight:merge --auto [--noconfirm]`
- If --auto is not set: suggest `/phlight:merge`

**If verdict is NEEDS CHANGES:**
- Present the findings. The chain pauses here regardless of --auto.
- After the user addresses the issues, they can re-run `/phlight:review` or
  proceed to `/phlight:merge`.

---
name: phlight-architect
description: Use when starting a feature or task that needs design thinking before implementation - brainstorms and plans interactively, producing a plan for phlight:implement
argument-hint: <task description or context> [--auto] [--noconfirm]
---

# Architect

The thinking counterpart to `phlight:implement`. Brainstorm and plan interactively
with the user. Implementation is handled separately.

## Usage

```
/phlight:architect <task description or context>
/phlight:architect <task description> --auto
/phlight:architect <task description> --auto --noconfirm
```

## Flags

Parse and strip from `$ARGUMENTS` before processing:

- `--auto`: auto-chain to split or implement at completion
- `--noconfirm`: propagated forward, skips merge confirmation at end of chain

## Prerequisites

Required config sections (hard-fail if missing):
- `## Task Management`

Optional (have defaults):
- `## Plans` (defaults to `docs/plans/`, `pr-target: 400`)

## Task Tracker Integration

Read `## Task Management` config. If `tool` is not `none`:

1. Check if a task ID is provided in the user's message or context
2. If no ID found, search for matching tasks using the configured provider
3. If no match exists, ask the user to provide a task ID or create one, then
   wait
4. Include the confirmed task ID in the plan file header

If `tool: none`, skip task tracking and proceed.

## Process

### Phase 1: Brainstorm

**REQUIRED SUB-SKILL:** Use superpowers:brainstorming

Run the full brainstorming process without shortcuts:
- Explore project context
- Ask clarifying questions one at a time
- Propose 2-3 approaches with trade-offs and recommendation
- Present design sections, get user approval
- Write design doc

### Phase 2: Plan

**REQUIRED SUB-SKILL:** Use superpowers:writing-plans

Create the implementation plan with bite-sized TDD tasks, exact file paths, and
complete code.

**Override:** When writing-plans offers execution choices at the end, skip that.
The plan file is the deliverable.

### Phase 3: Plan Size Assessment

After writing the plan, estimate the total lines of implementation (excluding
tests and generated code). Read `pr-target` from `## Plans` config (default:
400).

Apply the PR size gradient:
- **Below pr-target**: plan is PR-sized. Suggest proceeding to implement.
- **pr-target to +200**: borderline. Note that it's on the larger side but
  likely fine as a single PR.
- **+200 to +400**: large. Recommend splitting but note it could work as one
  PR if the scope is cohesive.
- **Above +400**: split needed. Recommend splitting before implementation.

Present the assessment to the user with your recommendation.

## Plan File Location

Read `## Plans` config for the target directory. Default to `docs/plans/` from
the project root if no config exists.

All plan files use the naming format `YYYY-MM-DD-<feature-name>.md`. Never
write plans inside service directories, worktrees, or other locations.

## Scope Boundary

**Do NOT** dispatch execution subagents, write any implementation code, or
create worktrees/branches. The job ends when the plan file is written and
assessed.

## Completion

Announce the plan file's absolute path and the size assessment.

**If --auto is set:**
- If split is recommended: invoke `/phlight:split {path} --auto [--noconfirm]`
- If PR-sized: invoke `/phlight:implement {path} --auto [--noconfirm]`

**If --auto is not set:**
- If split is recommended: suggest `/phlight:split {path}`
- If PR-sized: suggest `/phlight:implement {path}`

---
name: phlight-project-init
description: Detect, report, and configure project context for phlight workflow skills. Use when setting up a new project, when skills report missing config, or when the user asks about phlight configuration status
---

# Project Init

Detect available project context, report which phlight skills are operational,
and configure missing sections through guided setup.

## Usage

```
/phlight-project-init              # full health check + guided setup
/phlight-project-init --check      # report only, no changes
```

## Process

### Step 1: Scan existing config

Search project-level CLAUDE.md and rules files for recognized config sections.
Only check files within the project directory - do not read global user config
(`~/.claude/CLAUDE.md`) or any files outside the project root.

Files to check:
- `CLAUDE.md` (project root)
- `.claude/CLAUDE.md`
- `.claude/rules/*.md`

Look for these sections:

- `## Task Management`
- `## Quality Gates`
- `## Plans`

For each section found, record its location (which file) and contents. For each
section missing, note it as unconfigured.

### Step 2: Auto-detect project context

For each missing config section, attempt automatic detection:

**Task Management:**
- Check for MCP tools in session: `clickup_*`, `linear_*`
- Check for CLI tools: `which gh`, `which linear`
- Scan recent branch names (`git branch --list`) for task ID patterns
  (CU-xxx, TEAM-xxx, #xxx, PROJECT-xxx)
- Check for provider config files in the repo

**Quality Gates:**
- Parse `package.json` for test/lint/format scripts
- Parse `pyproject.toml` for pytest/ruff/black/mypy config
- Parse `Makefile` or `justfile` for check/lint/test targets
- Read `.github/workflows/*.yml` or `.gitlab-ci.yml` for CI steps
- Probe for common tools: `which pytest`, `which ruff`, `which eslint`,
  `which vitest`

**Plans:**
- Check for existing `docs/plans/` directory
- Check for other plan-like directories (`plans/`, `.plans/`)

### Step 3: Detect tool availability

Check whether key tools used by phlight skills are available:

- `gh` (used by merge for PR operations)
- `scc` (used by review for code size snapshots)
- `superpowers:*` skills (used by architect, implement)
- `pr-review-toolkit:*` agents (used by review)

### Step 4: Report

Present a status report:

```
## phlight Config Status

| Section            | Status       | Source                          |
|--------------------|--------------|---------------------------------|
| Task Management    | Configured   | .claude/rules/CLAUDE.local.md   |
| Quality Gates      | Missing      | -                               |
| Plans              | Default      | (using default: docs/plans/)    |

## Tool Availability

| Tool               | Status       | Used By            |
|--------------------|--------------|--------------------|
| gh                 | Available    | merge              |
| scc                | Available    | review             |
| superpowers:*      | Available    | architect, implement|
| pr-review-toolkit  | Available    | review             |

## Skill Readiness

| Skill              | Status  | Blocked By              |
|--------------------|---------|-------------------------|
| /phlight-architect | Ready   | -                       |
| /phlight-implement | Ready   | -                       |
| /phlight-review    | Ready   | -                       |
| /phlight-merge     | Blocked | Quality Gates           |
| /phlight-split     | Ready   | -                       |
| /phlight-fast      | Blocked | Quality Gates           |
| /phlight-task      | Ready   | -                       |
| /phlight-ask       | Ready   | (always ready)          |
| /phlight-project-init | Ready | (always ready)         |
```

If `--check` was passed, stop here.

### Step 5: Guided setup

For each missing or incomplete config section:

1. Present what auto-detection found (if anything)
2. Ask the user to confirm or adjust the detected values
3. Ask where to save the config:
   - **Project (shared)**: `CLAUDE.md` or `.claude/CLAUDE.md` - committed,
     available to the whole team
   - **Per-user-per-project**: `.claude/rules/CLAUDE.local.md` - gitignored,
     only for this user in this project
   - **Global user**: `~/.claude/CLAUDE.md` - applies to all projects for
     this user
4. Write the config section to the chosen file

If a section already exists at one scope but the user wants to override at
another, explain how scope precedence works and confirm before writing.

### Step 6: Verify

After writing config, re-run the status check and display the updated table.
Confirm all skills are now operational.

## Rules

- Never write credentials or secrets into config files
- If auto-detection finds multiple plausible values, present all options rather
  than guessing
- Respect existing config; do not overwrite unless explicitly asked
- If the project has no task tracker, suggest `tool: none` rather than forcing
  one
- When writing to a file that already has other config sections, append the new
  section at an appropriate location rather than overwriting the file

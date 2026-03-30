---
name: phlight-task
description: Manage tasks in the configured provider - create, view, and list tasks. Use when the user wants to create a task, view task details, list tasks, or references /phlight:task
argument-hint: <subcommand> [args] | <task-id>
---

# Task

Unified interface for task management operations.

## Usage

```
/phlight:task                              # help screen
/phlight:task create <description>         # create a new task
/phlight:task view <task-id>               # view task details
/phlight:task list [filters]               # list tasks
/phlight:task <task-id>                    # shorthand for view
/phlight:task help                         # help screen
/phlight:task --help | -h | h | --h | -help  # help screen
/phlight:task <subcommand> --help          # help for that subcommand
```

## Prerequisites

This skill requires a `## Task Management` section in loaded context. If not
found, STOP and show this error:

> No `## Task Management` config found in any loaded CLAUDE.md or rules file.
> Run `/phlight:project-init` for guided setup, or add manually at whichever scope
> fits:
>
> - **Project (shared)**: `CLAUDE.md` or `.claude/CLAUDE.md`
> - **Per-user-per-project**: `.claude/rules/CLAUDE.local.md`
> - **Global user**: `~/.claude/CLAUDE.md`

Then stop. Do not proceed without config.

If `tool: none`, stop and tell the user: "Task tracking is disabled
(`tool: none`). Update the `## Task Management` config to use a provider."

## Argument Routing

Parse `$ARGUMENTS` and route:

1. **Empty, `help`, `--help`, `-h`, `h`, `--h`, `-help`**: Show help screen
2. **`create <description>`**: Run Create subcommand
3. **`view <task-id>`**: Run View subcommand
4. **`list [filters]`**: Run List subcommand
5. **`<subcommand> --help`** (or `-h`, `help`, etc.): Show help for that
   subcommand only
6. **Bare task ID** (matches the configured `id-format` pattern): Treat as
   `view <task-id>`

If the argument doesn't match any of the above, show the help screen with a
note: "Unknown subcommand: `<arg>`. See usage above."

## Help Screen

When showing help, display:

```
phlight:task - manage tasks in the configured provider

Usage:
  /phlight:task <subcommand> [args]
  /phlight:task <task-id>            shorthand for view

Subcommands:
  create <description>            draft and create a new task
  view <task-id>                  view task details
  list [filters]                  list tasks

Options:
  --help, -h, help                show this help screen

Provider: <configured provider> (<tool value from config>)

Run /phlight:task <subcommand> --help for subcommand details.
```

## Subcommand: create

Draft and create a task based on the user's description.

### Drafting

1. Analyze the description and any relevant conversation context
2. Scale the body to the task's complexity:
   - Trivial fix or documentation tweak: 2-4 sentences
   - Moderate bug or feature: short Problem / Proposed fix structure
   - Larger initiative: `## Problem` / `## Proposed approach` / `## Notes`
     sections
3. Draft a **title** and **body**
4. Map labels/tags according to the provider's conventions from the config

**Title rules:**
- Phrase as a problem statement or request (not an imperative or conventional
  commit)
- No prefixes like "fix:", "feat:", "docs:", etc.
- Under 70 characters when possible

**Body rules:**
- Scale proportionally - never pad for length
- No em dashes; prefer colons, commas, or regular dashes
- No attribution lines
- No "we" language

**Labels / Tags:**
- Apply any defaults from the config
- Suggest additional labels/tags if the task clearly fits, but don't over-label

### Preview and approval

Present the draft:

```
Title: <the title>

Body:
<the body>

Tags: <if any>
```

Then ask: "Create this task, or want to adjust anything?"

Do NOT create the task until the user explicitly approves. Revise and re-preview
on request.

### Creation

After approval, create the task using the provider's tools. Adapt field names to
the provider's conventions (e.g. GitHub "labels" = ClickUp "tags", GitHub "body"
= ClickUp "description").

**Tool selection:**
- MCP tools if available (e.g. `clickup_*`, `linear_*`): delegate to a
  general-purpose subagent to keep verbose API responses out of main context
- CLI tools via Bash if available (e.g. `gh` for GitHub)
- Manual fallback: present the formatted task and ask the user to create it

Return the task URL or ID when done.

### create --help

```
phlight:task create - draft and create a new task

Usage:
  /phlight:task create <description>

Drafts a task from your description, previews it for approval, then creates
it in the configured provider. Scales the body to match the task's complexity.
```

## Subcommand: view

Fetch and display details for a single task.

### Process

1. Parse the task ID from the argument
2. Fetch the task using the provider's tools (delegate MCP calls to a
   general-purpose subagent)
3. Present a concise summary:

```
## <title>

**ID:** <task-id>    **Status:** <status>    **Assignee:** <assignee or "unassigned">
**Priority:** <priority>    **Created:** <date>

### Description
<description, truncated to first ~200 words if very long>

### Tags
<tags/labels if any>

### Recent Activity
<last 3-5 comments or status changes, if available>
```

Keep output concise. If the description is very long, truncate and note
"(truncated - full description in <provider>)".

### view --help

```
phlight:task view - view task details

Usage:
  /phlight:task view <task-id>
  /phlight:task <task-id>            shorthand

Fetches and displays a concise summary of the task: title, status, assignee,
description, tags, and recent activity.
```

## Subcommand: list

List tasks with optional filters.

### Filters

Parse filter arguments. Supported filters:

- `--mine` / `--assigned-to-me`: tasks assigned to the current user
- `--status <status>`: filter by status (e.g. "in progress", "open", "done")
- `--recent [N]`: most recently updated tasks (default: 10)
- No filters: sensible default per provider (typically: open tasks assigned to
  the current user, most recent first, limit 10)

Filters can be combined: `/phlight:task list --mine --status "in progress"`

### Process

1. Parse filter arguments
2. Query the provider (delegate MCP calls to a general-purpose subagent)
3. Present results as a table:

```
## Tasks (showing N of M)

| ID        | Title                          | Status      | Assignee | Updated    |
|-----------|--------------------------------|-------------|----------|------------|
| CU-xxx    | Fix login redirect loop        | in progress | evan     | 2026-03-24 |
| CU-yyy    | Add export CSV button          | open        | evan     | 2026-03-23 |
...
```

If no results, say so clearly: "No tasks found matching filters: <filters>"

### list --help

```
phlight:task list - list tasks

Usage:
  /phlight:task list [filters]

Filters:
  --mine                  tasks assigned to me
  --status <status>       filter by status
  --recent [N]            most recently updated (default: 10)

No filters defaults to: open tasks assigned to me, most recent first, limit 10.
```

## Provider Abstraction

All subcommands follow the same tool selection pattern:

1. MCP tools if available: delegate to a general-purpose subagent (MCP
   responses are verbose and fill context quickly)
2. CLI tools via Bash if available
3. Manual fallback: tell the user what to look up and where

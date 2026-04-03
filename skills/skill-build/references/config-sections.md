# Config Sections

Reference for all config sections used by phlight skills. Each section can live
at any CLAUDE.md scope (project, per-user-per-project, global user). Skills
check for required config on startup and hard-fail if missing, directing the
user to `/phlight-project-init` for guided setup. This is a one-time cost per
project - once configured, skills work every time.

## Task Management

The single source of config for task/issue tracking. A "task" is a unit of work
regardless of what the provider calls it (ClickUp task, GitHub issue, Jira
ticket, Linear issue). Used by all phlight workflow skills: architect, implement,
review, merge, split, and task.

```
## Task Management
- tool: <provider>
- <provider-specific fields>
```

### Required fields

- `tool` - the task tracker provider (clickup, linear, github, jira, none)

Use `none` to explicitly disable task tracking. If the entire section is absent,
skills hard-fail and direct the user to configure it.

### Provider-specific fields

**ClickUp:**
```
- tool: clickup
- workspace: <workspace-id>
- id-format: CU-xxx
```

**Linear:**
```
- tool: linear
- team: <team-key>
- id-format: <TEAM>-xxx
```

**GitHub Issues:**
```
- tool: github
- repo: <owner/repo>   (defaults to current repo)
- id-format: #xxx
```

**Jira:**
```
- tool: jira
- project: <project-key>
- id-format: <PROJECT>-xxx
```

### How skills use this

- Detect task IDs in branch names, commit messages, and user messages using
  `id-format` as a pattern
- Search for tasks, update statuses, and post comments via the provider's tools
- Route API calls through provider abstraction: MCP tools > CLI > manual fallback
- If `tool: none`, skip all task-tracking steps
- If section absent, hard-fail with setup instructions

---

## Quality Gates

Commands to run before merging. Used by merge; referenced by review.

```
## Quality Gates
- test: <command>
- lint: <command>
- format: <command>
- build: <command>          # optional
```

All fields except `build` are required when the section exists. Commands should
be runnable from the project root. Chain multiple commands with ` && `.

### How skills use this

- `phlight-merge` runs all configured gates before creating a PR
- `phlight-review` assumes these gates already pass
- If absent, `phlight-merge` hard-fails with setup instructions

---

## Plans

Controls where plan files are stored.

```
## Plans
- directory: docs/plans
- pr-target: 400
```

### Fields

- `directory` - where plan files are stored (default: `docs/plans`)
- `pr-target` - target lines of implementation per PR, excluding tests and
  generated code (default: 400). Used by architect for plan size assessment,
  split for PR boundary decisions, and implement for review suggestions.

### Defaults

If absent, defaults to `docs/plans/` and `pr-target: 400`.

Plan naming: `YYYY-MM-DD-<feature>.md`
Split plan naming: `YYYY-MM-DD-<feature>-pr<N>-<short-label>.md`

### How skills use this

- `phlight-architect` writes plan files to the configured directory
- `phlight-split` reads from and writes to the configured directory
- Plan files are local-only working documents, never committed to git

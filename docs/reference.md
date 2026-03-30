# phlight Skill Reference

Quick reference for all phlight skills. For detailed explanations, see the [User Guide](guide.md).

OpenCode users: replace `/phlight:` with `phlight-` and colons with hyphens throughout.

---

## architect

```
/phlight:architect <description> [--auto] [--noconfirm]
```

| | |
|---|---|
| **Args** | `description` (required) - feature or task to design |
| **Flags** | `--auto` chains to split/implement on completion; `--noconfirm` forwarded to merge |
| **Requires** | `## Task Management` |
| **Input** | Natural language description or task ID |
| **Output** | Plan file at `docs/plans/YYYY-MM-DD-<feature>.md` |
| **Human stops** | Plan approval |

---

## split

```
/phlight:split <plan-path> [--auto] [--noconfirm]
```

| | |
|---|---|
| **Args** | `plan-path` (required) - path to the plan file to split |
| **Flags** | `--auto` skips per-PR approval, chains to implement for first plan; `--noconfirm` forwarded |
| **Requires** | `## Task Management` |
| **Input** | Plan file path |
| **Output** | Multiple plan files: `YYYY-MM-DD-<feature>-pr<N>-<label>.md` + parallelization analysis |
| **Human stops** | Per-PR approval (skipped with `--auto`) |

---

## implement

```
/phlight:implement <plan-path-or-description> [--auto] [--noconfirm]
```

| | |
|---|---|
| **Args** | `plan-path-or-description` (required) - plan file path or initiation prompt |
| **Flags** | `--auto` chains to review on completion; `--noconfirm` forwarded |
| **Requires** | `## Task Management` |
| **Input** | Plan file path or natural language prompt |
| **Output** | Code on a new branch in `.worktrees/`, commits, worktree path |
| **Human stops** | Manual testing, project-specific interventions (migrations, etc.) |

---

## review

```
/phlight:review [--auto] [--noconfirm]
```

| | |
|---|---|
| **Args** | None |
| **Flags** | `--auto` chains to merge if verdict is CLEAN; `--noconfirm` forwarded |
| **Requires** | `## Task Management` |
| **Input** | Current branch diff (auto-detected) |
| **Output** | Review report with verdict (CLEAN / NEEDS CHANGES), code snapshot, pre-merge checklist |
| **Human stops** | NEEDS CHANGES verdict pauses chain regardless of `--auto` |

---

## merge

```
/phlight:merge [--auto] [--noconfirm]
```

| | |
|---|---|
| **Args** | None |
| **Flags** | `--auto` chains to implement for next split plan if in a sequence; `--noconfirm` skips merge confirmation |
| **Requires** | `## Task Management`, `## Quality Gates` |
| **Input** | Current branch (auto-detected) |
| **Output** | Squash-merged PR, cleaned up worktree/branch, task marked done |
| **Human stops** | Merge confirmation (skipped with `--noconfirm`) |

---

## fast

```
/phlight:fast <description-or-task-id> [--noconfirm]
```

| | |
|---|---|
| **Args** | `description-or-task-id` (required) - what to fix/build, or a task ID |
| **Flags** | `--noconfirm` skips merge confirmation |
| **Requires** | `## Task Management`, `## Quality Gates` |
| **Input** | Natural language description or task ID |
| **Output** | Squash-merged PR, cleaned up worktree/branch, task marked done |
| **Human stops** | Scope approval, manual testing, merge confirmation (unless `--noconfirm`) |

---

## task

```
/phlight:task <subcommand> [args]
/phlight:task <task-id>
```

### Subcommands

**create**
```
/phlight:task create <description>
```
| | |
|---|---|
| **Args** | `description` (required) |
| **Output** | Drafted task (previewed for approval), then created in provider. Returns task URL/ID |

**view**
```
/phlight:task view <task-id>
/phlight:task <task-id>
```
| | |
|---|---|
| **Args** | `task-id` (required) |
| **Output** | Task summary: title, status, assignee, description, tags, recent activity |

**list**
```
/phlight:task list [--mine] [--status <status>] [--recent [N]]
```
| | |
|---|---|
| **Args** | All optional |
| **Flags** | `--mine` assigned to me; `--status` filter by status; `--recent [N]` most recent (default 10) |
| **Output** | Table of matching tasks |

**help**
```
/phlight:task --help
/phlight:task <subcommand> --help
```

| | |
|---|---|
| **Requires** | `## Task Management` (all subcommands) |

---

## ask

```
/phlight:ask <question>
```

| | |
|---|---|
| **Args** | `question` (required) - anything about the project |
| **Flags** | None |
| **Requires** | Nothing (uses `## Task Management` if available) |
| **Input** | Natural language question |
| **Output** | Conversational analysis with file/line references |
| **Human stops** | None (read-only, no side effects) |

---

## project-init

```
/phlight:project-init [--check]
```

| | |
|---|---|
| **Args** | None |
| **Flags** | `--check` report only, no changes |
| **Requires** | Nothing |
| **Input** | None |
| **Output** | Config status table, tool availability, skill readiness. Without `--check`: guided setup prompts |
| **Human stops** | Config approval during guided setup |

---

## skill-build

```
/phlight:skill-build
```

| | |
|---|---|
| **Args** | None (interactive) |
| **Flags** | None |
| **Requires** | Nothing |
| **Input** | Interactive conversation |
| **Output** | New skill files + rules file entry |
| **Human stops** | Discovery questions, design approval, plan approval |

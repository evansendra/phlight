# phlight User Guide

This is the human-readable guide. The skills themselves contain detailed agent instructions, but this doc is for you - the person driving the thing.

For exact signatures, flags, args, inputs, and outputs, see the **[Skill Reference](reference.md)**.

## The Big Idea

phlight is a pipeline: **architect -> split -> implement -> review -> merge**. You can run it end-to-end with `--auto`, or invoke any skill individually at any point. The pipeline is designed around one core principle: agents handle the grunt work, humans make the decisions.

## The Pipeline

```
/phlight-architect  ->  /phlight-split  ->  /phlight-implement  ->  /phlight-review  ->  /phlight-merge
     |                    (if needed)              |                       |                    |
     |                                             |                       |                    |
  writes a plan                              writes code              reviews diff         merges PR
  file in docs/plans/                        in a worktree            dispatches 2         squash merge
                                                                      review agents        + cleanup
```

### You can enter anywhere

The pipeline isn't a rigid sequence you have to start from the beginning. Already have code on a branch? Skip straight to `/phlight-review`. Already reviewed? Go to `/phlight-merge`. Have a plan file from somewhere else? Hand it to `/phlight-implement`.

Each skill checks its own prerequisites (config sections) but doesn't care what came before it.

## Flags

Two flags work across all pipeline skills:

### `--auto`

Chains skills together automatically. After each skill completes (and any required human stop is cleared), it invokes the next skill in the pipeline.

```
/phlight-architect my feature --auto
```

This will: architect -> (you approve the plan) -> split if needed -> implement -> (you test manually) -> review -> (if clean) -> merge -> (you confirm) -> done.

```
/phlight-architect my feature --auto --noconfirm
```

Same thing, but skips the merge confirmation at the end.

You can attach `--auto` at any entry point:

```
/phlight-implement path/to/plan.md --auto        # implement -> review -> merge
/phlight-review --auto                            # review -> merge (if clean)
```

### `--noconfirm`

Skips the merge confirmation step. Only affects the final merge - all other human stops (plan approval, manual testing) are always enforced. Gets passed forward through the chain when combined with `--auto`.

### `--help`

Every skill accepts `--help` (also `-h`, `-help`, `--h`, `help`, `h`) to print its usage screen and exit without running. Handy when you forget which flags a skill takes or what its prerequisites are.

```
/phlight-architect --help
/phlight-task create --help
```

## Human Stops

These are the moments where the pipeline always pauses and waits for you, even in `--auto` mode. This is by design - agents handle execution, you handle judgment.

| When | What happens | You need to |
|---|---|---|
| **architect**: plan complete | Agent presents the finished plan | Read it, approve or request changes |
| **implement**: code ready for testing | Agent stops and shows you the worktree path | Go to the worktree, run the app, test manually, confirm it works |
| **implement**: project-specific intervention | Agent detects something in your config that requires human action (migrations, deployments, etc.) | Follow the documented procedure, confirm when done |
| **merge**: PR ready | Agent shows you the PR URL | Confirm you want to merge (skipped with `--noconfirm`) |
| **review**: verdict is NEEDS CHANGES | Agent found issues in the code review | Fix the issues, then re-run review or proceed to merge |

**Everything else is autonomous.** Task creation, branch/worktree setup, quality gate execution, PR creation, CI polling, worktree cleanup - the agent handles all of it without asking.

## Skills Overview

Ten skills, split into two groups:

**Pipeline skills** (chain together with `--auto`):

| Skill | One-liner |
|---|---|
| **architect** | Brainstorm a design, write an implementation plan |
| **split** | Break a big plan into PR-sized chunks |
| **implement** | Execute a plan with subagent-driven development |
| **review** | Dispatch two review agents, produce a verdict |
| **merge** | Quality gates, PR, CI, squash merge, cleanup |

**Standalone skills:**

| Skill | One-liner |
|---|---|
| **fast** | Full pipeline in one session for small changes |
| **task** | Create, view, list tasks (has `--help` per subcommand) |
| **ask** | Read-only project Q&A - no side effects, ever |
| **project-init** | Detect and configure project context |
| **skill-build** | Interactive workflow to build new phlight skills |

For exact signatures, flags, args, inputs, and outputs, see the **[Skill Reference](reference.md)**.

A few things worth calling out that you won't get from the reference:

- **fast** has a scope guard: if the work grows beyond the quick scope, the agent stops and tells you to switch to the full pipeline. It won't let a "quick fix" silently become a large feature.
- **review** skips style nits, formatting opinions, and theoretical concerns. If a senior reviewer wouldn't request-changes over it, it's not in the report.
- **implement** is split-plan-aware: if you're on PR 2 of 5, it knows about the sequence and chains to the next plan after merge.
- **task** subcommands each support `--help` (e.g. `/phlight-task create --help`).

## Configuration Quick Reference

All config lives in your CLAUDE.md or rules files. Run `/phlight-project-init` to set up interactively, or add manually.

### Required: Task Management

```markdown
## Task Management
- tool: github
- repo: owner/repo
- id-format: #xxx
```

Providers: `clickup`, `linear`, `github`, `jira`, `none`

Set `tool: none` to explicitly skip task tracking. If the section is missing entirely, skills that need it will hard-fail with setup instructions.

### Required for merge/fast: Quality Gates

```markdown
## Quality Gates
- test: npm test
- lint: npm run lint
- format: npm run format
- build: npm run build
```

`build` is optional. Everything else is required. Commands run from project root.

### Optional: Plans

```markdown
## Plans
- directory: docs/plans
- pr-target: 400
```

Defaults to `docs/plans/` and 400 lines per PR if not specified. `pr-target` is lines of implementation code (excluding tests and generated code).

### Where to put config

- **Project (shared with team):** `CLAUDE.md` or `.claude/CLAUDE.md` - committed to git
- **Per-user-per-project:** `.claude/rules/CLAUDE.local.md` - gitignored, just for you
- **Global:** `~/.claude/CLAUDE.md` - applies to all your projects

## Platform Differences

Skill names use hyphens (`/phlight-architect`, `/phlight-fast`, etc.) on both Claude Code and OpenCode.

### OpenCode invocation

OpenCode doesn't support direct `/skill-name args` invocation (yet). Your alternatives:

- **Just tell the agent in plain English:** "use phlight-implement on docs/plans/2026-03-30-feature.md --auto" works perfectly. The agent calls the skill tool behind the scenes.
- **Use `/skills` picker:** Type `/skills`, start typing `phlight-`, select the skill, then enter your arguments.
- **Let auto-chaining do the work:** Once you kick off the first skill (e.g. architect with `--auto`), the chain handles all subsequent skill invocations for you. You only need to manually invoke the first one.

### Config file locations

| Scope | Claude Code | OpenCode |
|---|---|---|
| Project (shared) | `CLAUDE.md` or `.claude/CLAUDE.md` | `opencode.md` or `.opencode/opencode.md` |
| Per-user-per-project | `.claude/rules/CLAUDE.local.md` | `.opencode/rules/*.local.md` |
| Global | `~/.claude/CLAUDE.md` | `~/.config/opencode/opencode.md` |

The config sections themselves (`## Task Management`, `## Quality Gates`, `## Plans`) are identical across both platforms.

## Common Workflows

### "I have a feature idea and want it done"

```
/phlight-architect add CSV export to reports --auto --noconfirm
```
Full autopilot. You'll still approve the plan and test manually, but everything else chains automatically.

### "I have a feature idea and want to stay hands-on"

```
/phlight-architect add CSV export to reports
```
Then after approving the plan:
```
/phlight-implement docs/plans/2026-03-30-csv-export.md
```
Then after testing:
```
/phlight-review
```
Then:
```
/phlight-merge
```

### "I already wrote the code, just review and merge it"

```
/phlight-review --auto
```

### "Quick bug fix, minimal ceremony"

```
/phlight-fast fix the off-by-one error in pagination
```

### "I need to think before I build"

```
/phlight-ask what would it take to support multi-tenant auth?
```

### "What's broken in my setup?"

```
/phlight-project-init --check
```

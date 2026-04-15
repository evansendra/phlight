# phlight

A shitty little set of workflow skills that aspires to be a controlled, modular workflow for your AI coding agent. Built on [Superpowers](https://github.com/obra/superpowers).

**[User Guide](docs/guide.md)** - how it works, flags, human stops, platform differences, common workflows
**[Skill Reference](docs/reference.md)** - args, flags, inputs, outputs for every skill

## Skills

| Skill | Purpose |
|---|---|
| **architect** | Brainstorm and plan interactively, producing a plan file |
| **implement** | Execute a plan with subagent-driven development |
| **review** | Opinionated PR fitness review focused on bloat and anti-patterns |
| **merge** | Create PR, wait for checks, merge, cleanup |
| **split** | Break large plans into PR-sized chunks with dependency tracking |
| **fast** | Condensed single-session workflow for quick fixes |
| **task** | Create, view, and list tasks in your configured provider |
| **ask** | Read-only Q&A - ideation, triage, architecture questions |
| **project-init** | Detect and configure project context for all skills |
| **skill-build** | Interactive workflow for building new phlight skills |

## Pipeline

```
architect -> split (if needed) -> implement -> review -> merge
                                      |                    |
                                      +-- next split plan -+
```

Use `--auto` to chain the full pipeline. Required human stops (plan approval, manual testing, merge confirmation) are always respected.

Every skill accepts `--help` (also `-h`, `help`) to print its usage screen and exit without running.

## Installation

### Dependencies

Install these first:
- [Superpowers](https://github.com/obra/superpowers) - brainstorming, writing-plans, executing-plans skills
- [pr-review-toolkit](https://github.com/anthropics/claude-plugins-official) - code-reviewer, code-simplifier agents

### Claude Code (via Plugin Marketplace)

Register the marketplace:

```bash
/plugin marketplace add evansendra/phlight
```

Then install the plugin:

```bash
/plugin install phlight@phlight-marketplace
```

### Claude Code (local development)

```bash
claude --plugin-dir /path/to/phlight
```

### OpenCode

Add to your `opencode.json` (project-level or `~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["phlight@git+https://github.com/evansendra/phlight.git"]
}
```

Pin a specific version:

```json
{
  "plugin": ["phlight@git+https://github.com/evansendra/phlight.git#v0.1.0"]
}
```

### Verify Installation

Start a new session and run:

```
/phlight-project-init --check
```

(OpenCode: `phlight-project-init --check`)

## Configuration

phlight uses project-specific config sections in your CLAUDE.md or rules files. Run `/phlight-project-init` for guided setup, or add manually:

### Task Management (required)

```markdown
## Task Management
- tool: github
- repo: owner/repo
- id-format: #xxx
```

Supported providers: `clickup`, `linear`, `github`, `jira`, `none`

### Quality Gates (required for merge/fast)

```markdown
## Quality Gates
- test: npm test
- lint: npm run lint
- format: npm run format
```

### Plans (optional)

```markdown
## Plans
- directory: docs/plans
- pr-target: 400
```

## Quick Start

```
/phlight-fast fix the login redirect loop on the /callback route
```

Or for larger work:

```
/phlight-architect add CSV export to the reports dashboard --auto
```

## License

MIT

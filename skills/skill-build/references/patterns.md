# phlight Plugin Design Patterns

These patterns govern how skills in the phlight plugin are built. Read this file
when designing a new skill to ensure consistency.

## Core principle: config over hardcoding

Anything project-specific lives in the user's CLAUDE.md or rules context, not in
the plugin. The plugin's job is to define the workflow; the context defines the
environment.

**Project-specific (belongs in CLAUDE.md at any scope):**
- Provider/tool selection (e.g. which issue tracker, which CI system)
- Repo/workspace/project identifiers
- Naming conventions, label taxonomies, branch strategies
- Team-specific style preferences

**Generic (belongs in the plugin):**
- The workflow itself (what steps to follow)
- Output formatting rules (e.g. "scale body to complexity")
- Universal quality standards (e.g. "no conventional commit prefixes in issue titles")
- Interaction patterns (e.g. "preview before creating")

## Config section convention

Each skill that needs project-specific context should expect a named section
in any loaded CLAUDE.md or rules file:

```
## <Feature Name>
- tool: <provider>
- <provider-specific fields>
```

The skill's prerequisites section checks for this and provides actionable
guidance if missing, including scope options:

- **Project** (shared): `CLAUDE.md` or `.claude/CLAUDE.md`
- **User** (personal, all projects): `~/.claude/CLAUDE.md`
- **Per-user-per-project**: `.claude/rules/CLAUDE.local.md` (gitignored via `*.local.md` pattern)

## Provider abstraction

Skills should not assume a specific provider. Instead:

1. The config declares `tool: <provider>`
2. The skill adapts its behavior to the provider
3. Tool selection follows this priority:
   - MCP tools if available in the session (e.g. `clickup_*`, `linear_*`)
   - CLI tools via Bash if available (e.g. `gh`, `linear`)
   - Manual fallback: present formatted output and ask the user to create it themselves

## Interaction patterns

### Preview and approval
Any action with external side effects (creating issues, opening PRs, posting
messages) must be previewed and explicitly approved before execution.

### Chunked presentation
For plans or multi-part output, present one section at a time and check in
with the user rather than dumping everything at once. This keeps the user in
control and catches misalignment early.

### Scale to complexity
Output should be proportional to the task. A one-liner fix doesn't need three
sections. A multi-component feature doesn't deserve two sentences.

## File structure conventions

- `commands/` for user-invoked slash commands (simple, single .md file)
- `skills/` for skills that benefit from bundled references, scripts, or assets
- `references/` for detailed docs loaded on demand (not at startup)
- Keep SKILL.md lean; move detailed patterns to references/

## Frontmatter conventions

Every SKILL.md must include:
- `name`: prefixed with `phlight-`, matching the directory name with prefix
  (e.g. directory `architect/` gets `name: phlight-architect`). This is required
  for OpenCode compatibility. Claude Code derives the display name from the
  directory and prepends the plugin namespace (`phlight:`), so the `name` field
  does not affect Claude Code's naming.
- `description`: specific enough for agents to select the skill appropriately

Optional:
- `argument-hint`: shown next to the skill name in Claude Code's skill list
- `disable-model-invocation: true`: prevents auto-invocation, user-only

## Hard-fail on missing config

Skills must hard-fail when required config sections are absent from loaded
context. Do not silently skip integrations or gracefully degrade. The pattern:

1. Check for the required config section(s) in loaded context
2. If found, use it fully
3. If absent, STOP immediately with a clear error:
   - Name the missing section(s)
   - Show the minimum config needed
   - Direct the user to `/phlight:project-init` for guided setup
   - List the scope options (project, per-user-per-project, global user)

This is a one-time cost per project. Once configured, the skill works every
time. Hard-failing prevents skills from running in a half-configured state
where important integrations are silently skipped.

## Auto-chaining (--auto flag)

Pipeline skills (architect, split, implement, review, merge) accept `--auto`.
When present, the skill auto-invokes the next skill in the pipeline at
completion, passing `--auto` (and `--noconfirm` if set) forward.

Pipeline order:

```
architect -> split (if needed) -> implement -> review -> merge
                                      |                    |
                                      +-- next split plan -+
```

Required human stops (even in --auto):
- **architect**: plan approval
- **implement**: manual test confirmation
- **implement/any**: project-specific interventions from loaded context (e.g.,
  migration application, manual deployment). Skills must scan loaded context
  for human-intervention requirements and respect them in auto mode.
- **merge**: merge confirmation (skipped only with --noconfirm)

Auto mode chains agent work, not human decisions. If a step produces a result
that needs human judgment (NEEDS CHANGES from review, test failure), the chain
pauses and waits for the human.

## PR size guidance

A single configured value (`pr-target` in `## Plans` config, default 400
lines of implementation excluding tests and generated code) governs PR sizing
decisions across all skills consistently.

Gradient relative to pr-target (default 400):
- **Below target**: do not split. Merge overhead is not worth it.
- **Target to +200**: ideal range. Split only if natural boundaries exist.
- **+200 to +400**: acceptable for single-concern PRs, but flag it.
- **Above +400**: split required.

Splitting should have clear value: the plan is genuinely too large to review
as one PR, or it naturally parallelizes into independent streams. Do not split
mechanically. The overhead of managing multiple PRs and branches must be
justified by the benefit.

## Config section reference

See `references/config-sections.md` for the full specification of all config
sections: Task Management, Quality Gates, Plans.

## Writing style

- Imperative form in skill instructions ("Analyze the input", not "You should analyze")
- No em dashes; use colons, commas, or regular dashes
- No attribution lines in generated content
- No "we" language in generated content

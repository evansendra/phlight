---
name: phlight-skill-build
description: Use when the user wants to build a new skill, create a command, add a skill to the phlight plugin, or design a new workflow command. Also use when the user says "skill-build" or references building/planning plugin skills
---

# Skill Builder

Interactive workflow for designing and building new skills for the phlight
plugin. Guides the user from idea through plan to implementation, one chunk at
a time.

Before starting, read `references/patterns.md` for the phlight plugin's design
patterns. Every decision in this workflow should be consistent with those
patterns.

## Phase 1: Discovery

Start by understanding what the user wants. Ask focused questions, but don't
front-load too many at once. Start with the essentials:

1. **What does this skill do?** Get the core purpose in one or two sentences
2. **When is it invoked?** User-triggered (`/phlight:name`) vs model-triggered (auto-detected from context)
3. **What external tools or services does it touch?** APIs, CLIs, MCP tools, file systems

If the user already has a clear picture (e.g. from earlier conversation), skip
the questions and summarize your understanding for confirmation instead.

## Phase 2: Design

Work through these decisions with the user. Present each as a short proposal,
get a thumbs up or adjustment, then move on.

### 2a: Project-specific vs generic

Classify every input the skill needs:

- **Generic** (lives in the skill): workflow steps, output format, quality rules,
  interaction patterns
- **Project-specific** (lives in CLAUDE.md/rules context): provider selection,
  identifiers, naming conventions, team preferences

For anything project-specific, define the config section the skill will expect.
Follow the convention from `references/patterns.md`:

```
## <Feature Name>
- tool: <provider>
- <provider-specific fields>
```

Present this to the user: "Here's what the skill handles vs what it'll expect
from your config."

### 2b: Skill type and structure

Based on the invocation style from Phase 1:

- **Command** (`commands/name.md`): user-invoked via `/phlight:name`. Best for
  explicit actions with clear start/end (creating things, running workflows).
  Simpler structure, single file.
- **Skill** (`skills/name/SKILL.md`): can be model-invoked or user-invoked.
  Better when bundled references, scripts, or assets are needed. Use the
  `disable-model-invocation: true` frontmatter flag if it should only be
  user-invoked.

Recommend one, explain why, let the user override.

Propose the file layout:

```
commands/name.md
```

or

```
skills/name/
├── SKILL.md
├── references/    (if detailed docs are needed)
├── scripts/       (if deterministic/repeated code is needed)
└── assets/        (if templates or output resources are needed)
```

Only include directories that are actually needed. Don't create empty structure
for future hypotheticals.

### 2c: Naming

Skill names must:
- Be lowercase alphanumeric with single hyphens as separators
- Not start/end with hyphens
- Match the containing directory name

The plugin namespace (`phlight:`) is prepended automatically by Claude Code.
For OpenCode compatibility, the `name` field in SKILL.md frontmatter should
use the `phlight-` prefix (e.g. `name: phlight-myskill`).

### 2d: Tool access

Determine what `allowed-tools` the skill needs:
- Bash with specific command prefixes (e.g. `Bash(gh *)`)
- Agent (for delegating to subagents)
- AskUserQuestion (for interactive skills)
- MCP tools (reference by name pattern)
- Read, Write, Edit, Glob, Grep (for file operations)

Be specific with Bash patterns rather than allowing all Bash access.

## Phase 3: Plan presentation

Compile the design into a concrete plan. Present it as:

```
## Skill: phlight:<name>

**Type**: command | skill
**Invocation**: /phlight:<name> [args]
**Tools**: <list>

### Config required (CLAUDE.md)
<the config section users need to add, or "None">

### Files to create
<file list with one-line descriptions>

### Workflow
1. <step>
2. <step>
...
```

Ask: "Look good, or want to change anything before I build it?"

Do NOT proceed to implementation until the user approves.

## Phase 4: Implementation

After approval, build the skill file(s). Follow these rules:

- Use imperative form ("Analyze the input", not "You should analyze")
- Include `name: phlight-<skillname>` in SKILL.md frontmatter (required for
  OpenCode compatibility)
- Include a Prerequisites section if the skill needs CLAUDE.md config
- Include a Preview and approval section if the skill has external side effects
- Keep SKILL.md under 2000 words; move detail to references/
- No em dashes; use colons, commas, or regular dashes

After writing the skill files, add a one-liner to the project's CLAUDE rules
file (e.g. `.claude/rules/CLAUDE.local.md`) describing when to use the new
skill. This is required because skills appear in system-reminder messages that
only the top-level conversation receives - spawned agents (Agent tool, phlight
workflows) inherit rules files but not system-reminders, so without this
reference they will never know the skill exists.

After that, show the user a summary of what was created and how to test it.
If using `--plugin-dir`, remind them to run `/reload-plugins` to pick up
changes.

## Edge cases

- If the user wants something that overlaps with an existing phlight skill,
  point that out and discuss whether to extend the existing skill or create
  a new one
- If the user's idea is purely project-specific with no reusable workflow,
  suggest a `.claude/rules/` file or CLAUDE.md section instead of a plugin skill
- If the skill would need credentials or secrets, never store them in the plugin;
  guide the user to environment variables or their provider's secret management

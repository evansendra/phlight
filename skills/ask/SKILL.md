---
name: phlight-ask
description: Conversational Q&A with the project - ideation, prioritization, triage, architecture questions, tech exploration. Strictly read-only, never writes files or invokes skills that produce artifacts
argument-hint: <question or topic>
---

# Ask

Open-ended conversation about the project. Ideation, feature prioritization,
bug triage, architecture questions, technology exploration, "how does X work",
"what should we build next", "is Y implemented yet" - anything where the goal
is understanding, not action.

## Usage

```
/phlight-ask how does the sync service handle rate limiting?
/phlight-ask what features are planned but not yet implemented?
/phlight-ask triage this bug: users see a blank screen after login
/phlight-ask what's the tech stack for the frontend?
/phlight-ask should we prioritize X or Y?
```

## Help

If `$ARGUMENTS` (trimmed) exactly matches one of `--help`, `-h`, `-help`,
`--h`, `help`, or `h`, print the help screen below and stop. Do not run any
other step. Any question that merely contains the word "help" (e.g. "how
does help work here?") is NOT a help invocation - only exact matches of the
tokens above trigger help.

```
phlight-ask - conversational Q&A about the project (read-only)

Usage:
  /phlight-ask <question or topic>

Examples:
  /phlight-ask how does the sync service handle rate limiting?
  /phlight-ask what features are planned but not yet implemented?
  /phlight-ask triage this bug: users see a blank screen after login
  /phlight-ask should we prioritize X or Y?

Flags:
  --help, -h, help        show this help screen

Prerequisites:
  None

Strictly read-only: does not write files, create tasks, modify git state, or
invoke skills that produce artifacts
```

## No Prerequisites

This skill has no required config sections. It works with whatever context is
available - codebase, conversation, web search, documentation. If the user's
question is specifically about tasks or priorities and `## Task Management` is
configured, task info can be fetched read-only. Do not proactively check for
related tasks, ask about task assignment, or reference the task provider unless
the user's question calls for it.

## Strict Read-Only Rules

This skill MUST NOT:
- Write, edit, or create any files (no code, no plans, no docs, no configs)
- Invoke any skill that produces written artifacts (no brainstorming,
  writing-plans, executing-plans, implement, architect, fast, split, or any
  skill that results in file creation or modification)
- Suggest invoking such skills. Do not end responses with "want me to create
  a plan?" or "should I set up a task?" or "I can implement this." The user
  knows those skills exist. If they want to act, they will.
- Make commits, create branches, create worktrees, or modify git state
- Create or update tasks in the task provider (read/fetch is fine)

This skill CAN:
- Read files (Read, Glob, Grep)
- Run read-only shell commands (git log, git blame, git diff, ls, etc.)
- Fetch task details from the configured provider (read-only, via subagent)
  but only when the user's question is explicitly about tasks or priorities
- Search the web (WebSearch, WebFetch)
- Fetch library documentation (context7 MCP)
- Dispatch research-only subagents (Explore type)
- Present analysis, opinions, recommendations, trade-offs, and prioritization
  frameworks

## Behavior

Respond conversationally. Match depth to the question:

- Quick factual question ("what ORM do we use?"): short, direct answer with
  file reference
- Architecture question ("how does the sync pipeline work?"): explain the
  system with key file paths and data flow
- Prioritization ("should we do X or Y first?"): lay out trade-offs, ask
  clarifying questions about constraints, give a recommendation with reasoning
- Bug triage ("users see X after Y"): investigate the codebase, trace the
  likely code path, identify probable causes, suggest where to look
- Ideation ("what if we added X?"): explore the idea, identify what it would
  touch, flag complexity and trade-offs, surface related existing patterns

When investigating the codebase, cite specific files and line numbers so the
user can follow along.

If the user's question would genuinely require writing code or files to answer
properly (e.g., "can you build a proof of concept?"), say so clearly and let
them decide whether to switch to another workflow. Do not do it yourself.

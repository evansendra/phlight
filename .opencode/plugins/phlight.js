/**
 * Phlight plugin for OpenCode
 *
 * Registers phlight skills directory via config hook and injects
 * bootstrap context via system prompt transform.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PhlightPlugin = async () => {
  const phlightSkillsDir = path.resolve(__dirname, '../../skills');

  const getBootstrapContent = () => {
    return `<PHLIGHT_CONTEXT>
**Phlight - Structured Development Workflow**

Phlight skills are installed and available. Use OpenCode's native skill tool
to list and load them (skill names are prefixed with phlight-).

**Tool Mapping for OpenCode:**
When phlight skills reference tools or other skills, substitute OpenCode equivalents:
- \`/phlight:architect\` -> \`phlight-architect\`
- \`/phlight:implement\` -> \`phlight-implement\`
- \`/phlight:review\` -> \`phlight-review\`
- \`/phlight:merge\` -> \`phlight-merge\`
- \`/phlight:split\` -> \`phlight-split\`
- \`/phlight:fast\` -> \`phlight-fast\`
- \`/phlight:task\` -> \`phlight-task\`
- \`/phlight:ask\` -> \`phlight-ask\`
- \`/phlight:project-init\` -> \`phlight-project-init\`
- \`/phlight:skill-build\` -> \`phlight-skill-build\`
- \`superpowers:brainstorming\` -> \`brainstorming\`
- \`superpowers:writing-plans\` -> \`writing-plans\`
- \`superpowers:executing-plans\` -> \`executing-plans\`
- \`pr-review-toolkit:code-reviewer\` -> \`code-reviewer\`
- \`pr-review-toolkit:code-simplifier\` -> \`code-simplifier\`
- \`TodoWrite\` -> \`todowrite\`
- \`Task\` tool with subagents -> Use OpenCode's subagent system (@mention)
- \`Skill\` tool -> OpenCode's native \`skill\` tool
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` -> Your native tools
- \`EnterWorktree\` -> Do not use; create worktrees via git CLI

**Skills location:**
Phlight skills are in \`${phlightSkillsDir}/\`

**Context/config references:**
When skills mention "CLAUDE.md" or "rules files", these map to OpenCode's
context and rules files at the equivalent scopes.
</PHLIGHT_CONTEXT>`;
  };

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(phlightSkillsDir)) {
        config.skills.paths.push(phlightSkillsDir);
      }
    },

    'experimental.chat.system.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (bootstrap) {
        (output.system ||= []).push(bootstrap);
      }
    }
  };
};

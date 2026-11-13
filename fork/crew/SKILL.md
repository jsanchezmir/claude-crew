---
name: crew
description: Runs the savvy-flow orchestrated delivery flow (plan, delegate to tiered workers, independent review); invoke as /crew <task>.
disable-model-invocation: true
argument-hint: <task description>
---

# Crew

Launcher for the savvy-flow playbook plus the fork's overrides. Do nothing else first.

1. Read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-kit/plugins/savvy-flow/skills/savvy-flow/SKILL.md` with the Read tool before anything else.
2. Then read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-kit/fork/crew/OVERRIDES.md` with the Read tool.
3. Follow the playbook in full as your own instructions, as if it had been invoked as `/savvy-flow:savvy-flow`, and ignore that file's YAML frontmatter. Apply the overrides file on top of it: where the two conflict, the overrides win.
4. The playbook's own "Task from the user:" line holds a placeholder that is not filled in when read from disk. The task is the one at the end of this file.
5. If either file cannot be read, stop and tell the user which path is missing (the fork may have moved). Do not improvise a flow.

Task from the user: $ARGUMENTS

---
name: supercrew
description: Runs the savvy-flow flow like /crew but with a cheaper review policy (Haiku reviews for medium tasks, final review only for light tasks without dependents) and waits for the user to approve the plan before any work starts; invoke as /supercrew <task>.
disable-model-invocation: true
argument-hint: <task description>
---

# Supercrew

Launcher for the savvy-flow playbook with the fork's overrides, the crew overrides and the supercrew overrides. Do nothing else first.

1. Read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-crew/plugins/savvy-flow/skills/savvy-flow/SKILL.md` with the Read tool before anything else.
2. Then read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-crew/fork/crew/OVERRIDES.md` with the Read tool.
3. Then read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-crew/fork/supercrew/OVERRIDES.md` with the Read tool.
4. Follow the playbook in full as your own instructions, as if it had been invoked as `/savvy-flow:savvy-flow`, and ignore that file's YAML frontmatter. Apply the crew overrides on top of it, then the supercrew overrides on top of both: where they conflict, the later file wins.
5. The playbook's own "Task from the user:" line holds a placeholder that is not filled in when read from disk. The task is the one at the end of this file.
6. If any of the three files cannot be read, stop and tell the user which path is missing (the fork may have moved). Do not improvise a flow.

Task from the user: $ARGUMENTS

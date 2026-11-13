---
name: small-crew
description: Cheaper savvy-flow run (Haiku workers, Sonnet reviewers) that waits for the user to approve or edit the plan before any work starts; invoke as /small-crew <task>.
disable-model-invocation: true
argument-hint: <task description>
---

# Small crew

Launcher for the savvy-flow playbook with the fork's overrides and the small-crew overrides. Do nothing else first.

1. Read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-kit/plugins/savvy-flow/skills/savvy-flow/SKILL.md` with the Read tool before anything else.
2. Then read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-kit/fork/crew/OVERRIDES.md` with the Read tool.
3. Then read `/Users/jordi.sanchez/Development/Glovo/Claude/claude-kit/fork/small-crew/OVERRIDES.md` with the Read tool.
4. Follow the playbook in full as your own instructions, as if it had been invoked as `/savvy-flow:savvy-flow`, and ignore that file's YAML frontmatter. Apply the crew overrides on top of it, then the small-crew overrides on top of both: where they conflict, the later file wins.
5. The playbook's own "Task from the user:" line holds a placeholder that is not filled in when read from disk. The task is the one at the end of this file.
6. If any of the three files cannot be read, stop and tell the user which path is missing (the fork may have moved). Do not improvise a flow.

Task from the user: $ARGUMENTS

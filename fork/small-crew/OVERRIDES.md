# Small-crew overrides

Applied after the upstream savvy-flow SKILL.md and `fork/crew/OVERRIDES.md`. Where those conflict with this file, this file wins. Everything not mentioned here stays as they say.

The plan approval gate (the plan step, the approval wait and the `plan` progress phase) comes from `fork/crew/OVERRIDES.md`. Under small-crew the plan must state "workers on Haiku, reviews on Sonnet" as its models.

## Models: Haiku workers, Sonnet reviewers

- When you present the plan, call `mcp__savvy-progress__models` (crew's progress-bar rule: ToolSearch first if deferred) with `workers: "Haiku"`, so planned rows show Haiku.
- Every worker runs on **Haiku**: on every Agent call to a tier agent (`savvy-fable`, `savvy-heavy`, `savvy-careful`, `savvy-medium`, `savvy-light`, with or without the `savvy-flow:` prefix), pass `model: "haiku"`. This includes return rounds. The agent files keep their own model; the call parameter overrides it.
- Every review runs on **Sonnet**: spawn `savvy-reviewer` without a `model` parameter (its file sets Sonnet). Ignore the crew rule that moves Fable-tier or sensitive reviews to Opus; for those, say in the plan that the review stays on Sonnet in this flow.
- Tiers still matter: they pick the agent, and with it the effort and the worker's rules. Keep the crew tier table and heuristics, reading its model column as Haiku for every tier.
- Haiku has a lower ceiling. If a task looks beyond it (subtle concurrency, hard root-cause debugging, wide unfamiliar architecture), still plan it, but flag it in the plan as "risky on Haiku" and suggest `/crew` for it. After two failed return rounds on a task, stop and ask the user whether to continue on Haiku, rerun that task on Sonnet, or re-plan.

## Override: "## 6. Close"

Add to the close: that workers ran on Haiku and reviews on Sonnet, and which tasks, if any, you would rerun with `/crew`.

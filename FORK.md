# claude-crew

**claude-crew** is a fork of [JohnnyVizz/claude-kit](https://github.com/JohnnyVizz/claude-kit). GitHub: `jsanchezmir/claude-crew`. The fork's remote is `upstream` (JohnnyVizz). The local folder keeps its own name, `claude-kit`; installs use the local clone path, not the repo name.

## Keeping the fork in sync

```bash
git fetch upstream
git merge upstream/main
fork/check.sh
```

Fork logic lives in fork-owned files, and upstream files get only one-line hooks, so a merge conflicts rarely and only on those hooks.

## Layout rule

Put fork logic in fork-owned files (they never conflict). Touch upstream files only with one-line hooks.

| Fork-owned path | What |
|---|---|
| `FORK.md` | This file |
| `fork/check.sh` | Post-merge sanity checks |
| `fork/crew/SKILL.md` | `/crew` launcher (absolute paths inside) |
| `fork/crew/OVERRIDES.md` | Overrides for savvy-flow sections 0, Progress bar, 1 step 4 (plan-approval gate), 3, 5, 6 |
| `fork/small-crew/SKILL.md` | `/small-crew` launcher (three absolute paths inside) |
| `fork/small-crew/OVERRIDES.md` | Haiku workers, Sonnet reviews, "risky on Haiku" flag; overrides section 6 (plan-approval gate comes from crew) |
| `fork/supercrew/SKILL.md` | `/supercrew` launcher (three absolute paths inside) |
| `fork/supercrew/OVERRIDES.md` | Review policy per tier; overrides section 5 and 6 (workers and gate come from crew) |
| `fork/crew/UPSTREAM_SKILL.sha256` | Hash of the upstream SKILL.md that OVERRIDES.md was last checked against |
| `fork/avatar-templates/` | Pixel templates for drawing costumes |
| `plugins/savvy-flow/agents/savvy-reviewer.md` | Reviewer agent |
| `plugins/savvy-progress/hooks/fork.tsx` | All panel logic (costumes, orchestrator row, tier maps, `models` tool) |

## Skills

Three launchers add a plan-approval gate and a reviewer step on top of upstream's savvy-flow playbook. A fourth command runs upstream unchanged.

All three launchers read the upstream playbook at its absolute path (`plugins/savvy-flow/skills/savvy-flow/SKILL.md`) first, then their overrides files. The upstream SKILL.md and README.md are never edited.

### `/crew <task>`

- Playbook: upstream savvy-flow plus `fork/crew/OVERRIDES.md`.
- Workers: Sonnet, except Fable tier on Opus. The orchestrator calls `models` with no `workers` argument, so each tier keeps its own model label.
- Plan gate: presents the plan and waits for the user to approve or edit it before delegating.
- Review: an independent `savvy-reviewer` runs for every task (Sonnet; Opus for Fable-tier and sensitive changes). When the flow had more than one task, one more review runs over the whole change.
- Findings: the orchestrator triages them. Two return rounds per task.
- Invoke: `/crew <task>`.

### `/small-crew <task>`

- Playbook: upstream plus `fork/crew/OVERRIDES.md` plus `fork/small-crew/OVERRIDES.md`.
- Workers: every worker Agent call passes `model: "haiku"`. Tiers still pick the agent, effort and rules.
- Reviews: stay on Sonnet, never Opus.
- Risk flag: tasks that look beyond Haiku are marked "risky on Haiku" in the plan. The orchestrator calls `models` with `workers: "Haiku"`.
- Failure: after two failed return rounds, the orchestrator asks whether to continue on Haiku, rerun on Sonnet, or re-plan.
- Plan gate: inherited from crew.
- Invoke: `/small-crew <task>`.

### `/supercrew <task>`

- Playbook: upstream plus `fork/crew/OVERRIDES.md` plus `fork/supercrew/OVERRIDES.md`. Workers, tiers and the plan gate are the same as crew.
- Review policy (cheaper):
  - light tasks: no per-task review, unless another task depends on them; then a Haiku review runs before the dependent task starts;
  - medium tasks: Haiku review;
  - careful, heavy and fable: as crew;
  - changes to auth, payments or user data never rely on Haiku alone; a Sonnet review is required.
- Final review: Sonnet at `effort: "xhigh"`, run when any task skipped its own review or the flow had more than one task. If the Agent tool has no effort parameter, it runs at the reviewer's own effort and the plan says so.
- Invoke: `/supercrew <task>`.

### `/savvy-flow:savvy-flow <task>`

- Upstream playbook, unmodified: no plan-approval gate for existing projects (new projects still get upstream's SPEC.md and PLAN.md approval in section 1a), and no independent `savvy-reviewer`, only the orchestrator's own section 5 review.
- Uses the fork's agent model lines (fable Opus; the other tiers Sonnet).
- Upstream's "model names in description" lines are intentionally left unchanged.
- Invoke: `/savvy-flow:savvy-flow <task>`.

## Panel (savvy-progress)

- The orchestrator (main session) row is pinned first, showing model, context and cost.
- Orchestrator costumes by effort: low silver crown, medium gold crown, high jeweled crown and scepter, xhigh Age of Empires "wololo" priest.
- Reviewer costumes by effort: low pink, medium lavender, high bluish-lilac, xhigh reddish octopus.
- Reviewer tier has its own color.
- Planned rows are labeled with the flow's worker model, set by the `models` tool. Until it is called, planned rows use `FORK_TIER_MODEL` (Sonnet/Opus).
- Effort mapping: Fable/Mythos model or effort `max` wears the xhigh costume; a reviewer on Opus wears xhigh; unknown effort maps to high.
- A worker whose turn answers successfully has its steps closed to `total/total` with the note cleared. A failed worker keeps its last step and note.

## Touch points in upstream files

### Worker agents (`plugins/savvy-flow/agents/savvy-{fable,heavy,careful,medium,light}.md`)

| Location | Change | On conflict |
|---|---|---|
| frontmatter `model:` | fable `opus`; the other four `sonnet` | Keep upstream, then set the value again |

Efforts are unchanged (fable high, heavy xhigh, careful high, medium medium, light low).
`description:` lines are intentionally left upstream (they still name old models). `OVERRIDES.md` says its tier table is authoritative.

### `plugins/savvy-progress/hooks/register.tsx`

Find all with `grep -nE "// fork|FORK_CRAB_CSS|forkCostume\(a, costumeOf\)" register.tsx` (16 lines).

| Location | Fork adds | On conflict |
|---|---|---|
| imports, after `import type {...} from '../types'` | `import {...} from './fork' // fork` | Re-add; keep the name list equal to what is used |
| `TIER_COLOR` | `...FORK_TIER_COLOR,` before `other` | Re-add the line |
| `TIER_MODEL` | `...FORK_TIER_MODEL,` as last entry | Re-add the line |
| `tierOf`, first line | `if (forkTierOf(type)) return FORK_ORCH` | Re-add as first line |
| `register`, first statement | `forkRegister(on, now) // fork` (registers the `models` tool; `now` lets it trigger a redraw) | Re-add as first statement |
| `tierModel`, first line | `const m = forkTierModel(tier, TIER_MODEL[tier]) // fork` (replaces `const m = TIER_MODEL[tier]`) | Re-add on that line |
| `CRAB_CSS` template, before `@media` | `${FORK_CRAB_CSS}` (no comment possible) | Re-add on its own line before `@media` |
| `COSTUMES`, before `other` | `...FORK_COSTUMES,` | Re-add the line |
| `agentSvg`, `rowCrab(...)` | `costumeOf(a.type)` becomes `forkCostume(a, costumeOf)` (inside a template, no comment) | Take upstream line, swap the argument |
| `compactSvg`, `icons`, two list lines | same swap, with `// fork` | Same |
| `turn.step` handler | `if (!agentId && usage) return forkOrchestratorStep(...)` before `if (!agentId \|\| !usage) return result` | Re-add before that line |
| `turn.complete` handler | `await forkTurnDone($, agents, now, agentId, e.reason)` before final `return next(e)`: orchestrator row done; a subagent that answered gets its steps closed (`total/total`, note cleared) | Re-add |
| Pane render, after `finished` is computed | `forkPinFirst(running), forkPinFirst(finished)` | Re-add |
| band, `crew` and `isWorking` | use `forkWorkers(list)` instead of `list` | Take upstream lines, wrap `list` |

### Files the fork no longer touches

- `plugins/savvy-flow/skills/savvy-flow/SKILL.md`: fork content lives in `fork/crew/OVERRIDES.md`, applied by `/crew`.
- `plugins/savvy-flow/README.md`: fork docs live here in `FORK.md`.

Plain `/savvy-flow:savvy-flow` runs upstream's playbook unmodified (no reviewer step, upstream model names in its table); only the launchers apply the overrides.

## Merge procedure

```bash
git fetch upstream
git merge upstream/main
fork/check.sh
```

`check.sh` WARNs when upstream's savvy-flow SKILL.md changed: `OVERRIDES.md` replaces whole sections, so upstream edits inside them merge without any conflict. Read `git diff ORIG_HEAD HEAD -- plugins/savvy-flow/skills`, port what matters into `OVERRIDES.md`, then refresh `fork/crew/UPSTREAM_SKILL.sha256` (command in the WARN).

General rule for a conflict: keep upstream's version of the line, then re-apply the one-line touch point from the tables above. Never port fork logic into upstream files; it goes in `fork.tsx`. Never edit upstream's SKILL.md or README.md.

Special cases:

- **Upstream renames or moves a function with a touch point**: apply the touch point to the new location; update the "Location" cell above; `check.sh` count must still match.
- **Upstream changes tier names, the costume/CSS mechanism or `CRAB_CSS` structure**: adapt `FORK_TIER_*`, `FORK_COSTUMES`, `FORK_CRAB_CSS`, `forkCostume` in `fork.tsx` (the logic is all there), then check the panel visually.
- **Upstream renames SKILL.md headings**: update the quoted headings in the overrides files (`## 0. Preconditions`, `## 1. Understand and plan (orchestrator only)`, `## 3. Tiering`, `## 5. Adversarial review (orchestrator only)`, `## 6. Close`, and `## Progress bar`). `check.sh` reads them from the OVERRIDES.md files. Re-read the new upstream text for changed semantics.
- **Upstream adds its own reviewer or changes models**: decide whether to adopt it. If both coexist, rename the fork's agent or drop the override; update `FORK_TIER_MODEL`, `check.sh` expected models and `OVERRIDES.md`.
- **Upstream changes `hooks.json` modules**: the fork relies on `./register.tsx` being the only module, importing `./fork`. If modules are split, the import must go in whichever file owns the touched code.
- After resolving: bump `EXPECTED_TOUCH_POINTS` in `fork/check.sh` only if you deliberately added or removed a touch point.

## Local install (per machine, not in git)

Replace `<clone>` with the local clone path, `/Users/jordi.sanchez/Development/Glovo/Claude/claude-kit`.

1. `~/.claude/settings.json`, under `env`:
   ```json
   "CLAUDE_CODE_PLUGIN_DIRS": "<clone>/plugins/savvy-flow:<clone>/plugins/savvy-progress:<clone>/plugins/session-band"
   ```
2. Skills (symlinks; `-n` replaces an existing link instead of linking into it):
   ```bash
   ln -sfn <clone>/fork/crew ~/.claude/skills/crew
   ln -sfn <clone>/fork/small-crew ~/.claude/skills/small-crew
   ln -sfn <clone>/fork/supercrew ~/.claude/skills/supercrew
   ```
3. The absolute paths inside the launchers must match the clone location: `fork/crew/SKILL.md` (two), `fork/small-crew/SKILL.md` (three), `fork/supercrew/SKILL.md` (three). If the clone moves, redo 1 and 2 and edit these paths.

Restart the session after any change.

## Known risks and assumptions

- The `models` label is session state. It resets at session start or on a `models` call, and is not reset when a flow that does not call `models` starts (plain `/savvy-flow:savvy-flow`). Planned rows then keep the previous label; running rows always show the real model.
- `/supercrew`'s final review passes `effort: "xhigh"` on the Agent call. This is unverified. With a Claude Code version whose Agent tool lacks `effort`, it falls back to the reviewer's own effort (high).
- `fork.tsx` is loaded via a relative import from `register.tsx`. This is unverified against Claude Code's mod loader (`bun build` passes, which proves nothing about the loader). Fallback: paste the contents of `fork.tsx` at the end of `register.tsx` and drop the import.
- The repo's own tests need `claude-code/testing`, which is not installed here; they were not run.
- Cost figures use upstream's price table (Sonnet/Opus rates as upstream defines them).
- `effort: xhigh` on Sonnet (`savvy-heavy`) is unverified; the model may ignore or reject it. Same for the tier efforts under `/small-crew`, where those agents run on Haiku.
- Planned rows show the flow's worker model only after the orchestrator calls the `models` tool. All three playbooks call it; only `/small-crew` passes `workers: "Haiku"`, while `/crew` and `/supercrew` call it without `workers`, so their planned rows keep `FORK_TIER_MODEL`. Until the call, the rows also use `FORK_TIER_MODEL`.
- Costumes are drawn from code, so the only preview is the running panel. A GIF preview script exists outside the repo and is not maintained.

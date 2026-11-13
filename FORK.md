# claude-crew

**claude-crew** is a fork of [JohnnyVizz/claude-kit](https://github.com/JohnnyVizz/claude-kit). GitHub: `jsanchezmir/claude-crew`. The fork's remote is `upstream` (JohnnyVizz). The local clone lives in `claude-crew`; installs use the local clone path.

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
| `fork/crew/OVERRIDES.md` | Overrides for savvy-flow sections 0, Progress bar, 1 step 4 (plan-approval gate: `AskUserQuestion` Approve / Refine / Reject), 3, 5, 6 |
| `fork/small-crew/SKILL.md` | `/small-crew` launcher (three absolute paths inside) |
| `fork/small-crew/OVERRIDES.md` | Haiku workers, Sonnet reviews, "risky on Haiku" flag; overrides section 6 (plan-approval gate comes from crew) |
| `fork/supercrew/SKILL.md` | `/supercrew` launcher (three absolute paths inside) |
| `fork/supercrew/OVERRIDES.md` | Review policy per tier; overrides section 5 and 6 (workers and gate come from crew) |
| `fork/crew/UPSTREAM_SKILL.sha256` | Hash of the upstream SKILL.md that OVERRIDES.md was last checked against |
| `fork/session-band/UPSTREAM_ROW.sha256` | Hash of the upstream session-band row JSX (unreachable after the `forkRow` line) that `fork.tsx` was last synced with |
| `fork/avatar-templates/` | Pixel templates for drawing costumes |
| `plugins/savvy-flow/agents/savvy-reviewer.md` | Reviewer agent |
| `CLAUDE.md` | Repo rules for Claude: English only, read `FORK.md` first |
| `plugins/savvy-progress/hooks/fork.tsx` | All panel logic (costumes, agent names, orchestrator row, tier maps, `forkSessionStart` with the `models` tool, band `FORK_DISMISS` and `forkBand`) |
| `plugins/session-band/hooks/fork.tsx` | `forkBand`: draws the whole session-band row, tooltips, other mods' bands below |

## Skills

Three launchers add a plan-approval gate and a reviewer step on top of upstream's savvy-flow playbook. A fourth command runs upstream unchanged.

All three launchers read the upstream playbook at its absolute path (`plugins/savvy-flow/skills/savvy-flow/SKILL.md`) first, then their overrides files. The upstream SKILL.md and README.md are never edited.

### `/crew <task>`

- Playbook: upstream savvy-flow plus `fork/crew/OVERRIDES.md`.
- Workers: Sonnet, except Fable tier on Opus. The orchestrator calls `models` with no `workers` argument, so each tier keeps its own model label.
- Plan gate: presents the plan, then an `AskUserQuestion` with Approve / Refine / Reject (fallback: a one-line question). Refine = typed changes or a follow-up ask, then the plan is re-presented. Reject = nothing implemented, progress `finished: true`. Nothing is delegated before Approve. `/small-crew` and `/supercrew` inherit it.
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
- Every agent row starts with the agent's name (12 px, weight 900), then the task on its own line. The orchestrator is always `Wololo`; workers get Catalan names (27) and reviewers English names (30) (`WORKER_NAMES`, `REVIEWER_NAMES` in `fork.tsx`). A name is picked by hash of type + task description, skipping names already in use while any are left, so a task's later rounds keep their name. Names live in module state: after a reload they are handed out again, mostly the same. Planned rows have no name (no agent yet). In the terminal the name goes before the task on the header line.
- The orchestrator always shows the xhigh Age of Empires "wololo" priest costume, whatever its effort. The effort costumes (low silver crown, medium gold crown, high jeweled crown and scepter) stay in code, unused.
- Reviewer costumes by effort: low pink, medium lavender, high bluish-lilac, xhigh reddish octopus.
- Reviewer tier has its own color.
- Planned rows are labeled with the flow's worker model, set by the `models` tool. Until it is called, planned rows use `FORK_TIER_MODEL` (Sonnet/Opus).
- Effort mapping (reviewer): Fable/Mythos model or effort `max` wears the xhigh costume; a reviewer on Opus wears xhigh; unknown effort maps to high. The orchestrator ignores effort and model: always xhigh.
- A worker whose turn answers successfully has its steps closed to `total/total` with the note cleared. A failed worker keeps its last step and note.

## Band (session-band)

- The row is drawn by `forkBand` in `plugins/session-band/hooks/fork.tsx`. Other mods' AbovePrompt bands (`next(e)`, engine placeholder filtered out) are drawn below it, so the session-band + savvy-progress box sits above the Glovo LiteLLM band (LiteLLM draws its own row below whatever `next(e)` returns; upstream swallowed `next(e)`).
- Desktop icons are interactive Svgs with English `<title>` tooltips. Desktop only: the terminal has no hover and vscode ignores `isInteractive`.
- savvy-progress band: close button same as session-band (`×`, plain, dimColor); desktop bar fills up to the `×N` button, which sits flush against the band's avatar (no gap, the free width goes to the bar; `crewGroup` in `forkBand`); `paddingX 1` like session-band; `rowGap 1` to the band below only when there is one. session-band does the same, so the spacing is identical whichever of the two mods runs outer (no ordering guarantee between plugins), and there is a blank line before the LiteLLM band too. Button widths on desktop are estimates; unverified visually.

## Touch points in upstream files

Rule for new touches: one line each, marked `// fork`, and any logic goes in `fork.tsx`. Keep `register.tsx` at one `session.start` handler (the plugin validator rejects two).

Rule for `fork.tsx`: it must not receive state atoms as parameters. It declares its own references to `agents` and `now` with the same literal plugin and key as `register.tsx` (the state scan rejects atoms passed as parameters, and a rejected module means the panel does not load). If `register.tsx`'s atom keys or defaults change upstream, update the copies in `fork.tsx`. `fork/check.sh` runs the validator.

### Worker agents (`plugins/savvy-flow/agents/savvy-{fable,heavy,careful,medium,light}.md`)

| Location | Change | On conflict |
|---|---|---|
| frontmatter `model:` | fable `opus`; the other four `sonnet` | Keep upstream, then set the value again |

Efforts are unchanged (fable high, heavy xhigh, careful high, medium medium, light low).
`description:` lines are intentionally left upstream (they still name old models). `OVERRIDES.md` says its tier table is authoritative.

### `plugins/savvy-progress/hooks/register.tsx`

Find all with `grep -nE "// fork|FORK_CRAB_CSS|forkCostume\(a, costumeOf\)|forkName\(a\)" register.tsx` (28 lines).

| Location | Fork adds | On conflict |
|---|---|---|
| imports, after `import type {...} from '../types'` | `import {...} from './fork' // fork`, and a second line `import { FORK_DISMISS, forkBand, forkSessionStart } from './fork' // fork` | Re-add both; keep the name list equal to what is used. The second line is its own so the long list never conflicts with it |
| `TIER_COLOR` | `...FORK_TIER_COLOR,` before `other` | Re-add the line |
| `TIER_MODEL` | `...FORK_TIER_MODEL,` as last entry | Re-add the line |
| `tierOf`, first line | `if (forkTierOf(type)) return FORK_ORCH` | Re-add as first line |
| `register`, first statement | `forkRegister(on) // fork` (registers the `tool.call` handler for `models`; it uses fork.tsx's own `now` reference to trigger a redraw) | Re-add as first statement |
| `register`, its own `session.start` handler, before `return started` | `await forkSessionStart($) // fork` (resets the worker model to per-tier and registers the `models` tool) | Re-add as the last statement before `return started` |
| `tierModel`, first line | `const m = forkTierModel(tier, TIER_MODEL[tier]) // fork` (replaces `const m = TIER_MODEL[tier]`) | Re-add on that line |
| `const CRAB_SCALE` | `const CRAB_SCALE = 2.1 // fork` (upstream: `1.1`); avatars about twice as big | Re-add with value 2.1 |
| `CRAB_CSS` template, before `@media` | `${FORK_CRAB_CSS}` (no comment possible) | Re-add on its own line before `@media` |
| `COSTUMES`, before `other` | `...FORK_COSTUMES,` | Re-add the line |
| `agentSvg`, `const stats` | `const stats = forkStats(...) // fork` (stats line shortened to fit the bar: drops the context label, then the cost) | Take upstream's `const stats` line out and re-add the hook line in its place |
| `agentSvg`, name line | `<text ...>${xml(fitText(forkName(a), 12, textW))}</text>` as the first text line, before the task line (inside a template, no comment) | Take upstream's lines, re-add the name line and the fork geometry below |
| Pane render, the two `agentSvg` `Svg`s | `alt` starts with `${forkName(a)}, ` (inside JSX, no comment) | Take upstream, prefix the alt |
| terminal `row`, header | `<Text bold>{forkName(a)}</Text>` before the description `Text`, which loses `bold` (inside JSX, no comment) | Re-add the line |
| `agentSvg`, `rowCrab(...)` | `costumeOf(a.type)` becomes `forkCostume(a, costumeOf)` (inside a template, no comment) | Take upstream line, swap the argument |
| `compactSvg`, `icons`, two list lines | same swap, with `// fork` | Same |
| `turn.step` handler | `if (!agentId && usage) return forkOrchestratorStep($, e, usage, windowOf, costOf, result) // fork` before `if (!agentId \|\| !usage) return result` | Re-add before that line |
| `turn.complete` handler | `await forkTurnDone($, agentId, e.reason) // fork` before final `return next(e)`: orchestrator row done; a subagent that answered gets its steps closed (`total/total`, note cleared) | Re-add |
| Pane render, after `finished` is computed | `forkPinFirst(running), forkPinFirst(finished)` | Re-add |
| band, `crew` and `isWorking` | use `forkWorkers(list)` instead of `list` | Take upstream lines, wrap `list` |
| band (AbovePrompt), before the row | `const fb = forkBand(...) // fork` (`forkBand(bodyColumns, crewLabel, hasBelow, rtl)`) | Re-add; check the args are still in scope |
| band, dismiss `Button` | `{...FORK_DISMISS} // fork` replaces upstream `label="✕"` and `plain` | Take upstream, swap those two props |
| band, desktop `const width` | `const width = fb.svgWidth // fork` (replaces upstream formula) | Re-add on that line |
| band, terminal `const width` | `const width = fb.barWidth(titleW) // fork` | Re-add on that line |
| band JSX (no marker) | `{...fb.column}` and `{...fb.row}` spreads; `<Box {...fb.crewGroup}>` wrapper around the `<Box {...fb.svgBox}>` (wrapping the `Svg`) and the `{crewButton}`, so the `×N` button sits flush against the avatar | Take upstream JSX, re-add the spreads and both wrappers |

Band geometry: desktop width is computed tightly in `forkBand` (8 px/cell, padding + gaps + button estimates + 12 px safety, cap 3200); terminal bar width is uncapped (`cols - titleW - 34`).

Geometry lines in `agentSvg`, `plannedSvg`, `compactSvg` and the Pane render (upstream row heights 66/46/32, text offset) are upstream lines changed without `// fork` markers; on conflict keep upstream's structure and re-apply the fork sizes below (avatar scale 2.1, text and bars at x 76, icon spacing 70).

- Fork row heights: agent rows (running and finished) 96, planned rows 74, compact strip 68.
- Agent rows: avatar y 16 (vertically centered on the text block), name y 20 (12 px, weight 900), task y 37 (12 px, weight 600), tier and meta y 53, steps y 69 (full bar width), stats y 82 (right-aligned to the bar end), progress bar y 88 (height 4), status mark y 15, separator y 95.5.

### `plugins/session-band/hooks/register.tsx` and `types/index.d.ts`

Find all with `grep -n "// fork" hooks/register.tsx` (2 lines).

| Location | Fork adds | On conflict |
|---|---|---|
| imports | `import { forkBand } from './fork' // fork` | Re-add |
| AbovePrompt hook, before upstream `return (` | `const forkRow = await forkBand($, e, next, { ...kit }); if (forkRow) return forkRow // fork`; the kit is `s, level, cacheColor, cacheText, tier, icon, gap, speed, turnCost, usd, SPEED, MONEY, SPEED_ICON, MONEY_ICON, contextIcon, contextBar, cacheIcon` | Re-add before `return (`; keep the kit equal to what upstream defines |

- KEY risk: the upstream row JSX after the `forkRow` line is unreachable. Upstream edits there merge without conflict but are silently ignored: port them into `forkBand` in `fork.tsx`. `check.sh` WARNs on a change (hash in `fork/session-band/UPSTREAM_ROW.sha256`).
- A rename of any local passed in the kit (`GAPS`, `contextBar`, `cacheIcon`, `usd`, ...) breaks the call.
- `fork.tsx` redeclares `isHidden` with the same literal key and default as `register.tsx`; if upstream changes the default, update `fork.tsx`.

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

`check.sh` also WARNs when session-band's unreachable upstream row JSX changed. Read `git diff ORIG_HEAD HEAD -- plugins/session-band/hooks/register.tsx`, port what matters into `forkBand` in `plugins/session-band/hooks/fork.tsx`, then refresh `fork/session-band/UPSTREAM_ROW.sha256` (command in the WARN).

General rule for a conflict: keep upstream's version of the line, then re-apply the one-line touch point from the tables above. Never port fork logic into upstream files; it goes in `fork.tsx`. Never edit upstream's SKILL.md or README.md.

Special cases:

- **Upstream renames or moves a function with a touch point**: apply the touch point to the new location; update the "Location" cell above; `check.sh` count must still match.
- **Upstream changes tier names, the costume/CSS mechanism or `CRAB_CSS` structure**: adapt `FORK_TIER_*`, `FORK_COSTUMES`, `FORK_CRAB_CSS`, `forkCostume` in `fork.tsx` (the logic is all there), then check the panel visually.
- **Upstream renames SKILL.md headings**: update the quoted headings in the overrides files (`## 0. Preconditions`, `## 1. Understand and plan (orchestrator only)`, `## 3. Tiering`, `## 5. Adversarial review (orchestrator only)`, `## 6. Close`, and `## Progress bar`). `check.sh` reads them from the OVERRIDES.md files. Re-read the new upstream text for changed semantics.
- **Upstream adds its own reviewer or changes models**: decide whether to adopt it. If both coexist, rename the fork's agent or drop the override; update `FORK_TIER_MODEL`, `check.sh` expected models and `OVERRIDES.md`.
- **Upstream changes `hooks.json` modules**: the fork relies on `./register.tsx` being the only module, importing `./fork`. If modules are split, the import must go in whichever file owns the touched code.
- After resolving: bump `EXPECTED_TOUCH_POINTS` (savvy-progress) or `EXPECTED_SB_REG` / `EXPECTED_SB_TYPES` (session-band) in `fork/check.sh` only if you deliberately added or removed a touch point.

## Local install (per machine, not in git)

Replace `<clone>` with the local clone path, `/Users/jordi.sanchez/Development/Glovo/Claude/claude-crew`.

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

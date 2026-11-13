// Fork additions to savvy-progress, kept out of register.tsx so that merging upstream
// changes into register.tsx conflicts as little as possible. No runtime logic lives in
// register.tsx for these features: it only imports from here and has one-line touch points.
//
// This file must not import register.tsx (no cycle). Whatever it needs from there (costOf,
// windowOf, costumeOf, `$`) is passed in as arguments. The `agents` and `now` atoms are the
// exception: they are declared here with register.tsx's plugin and key, because the plugin's
// state scan cannot follow atoms passed in as parameters (the validator rejects that).
//
// Touch points in register.tsx (find them with `grep -n "// fork\|FORK_" register.tsx`):
//   - the import from './fork'
//   - `...FORK_TIER_COLOR,` in TIER_COLOR (reviewer and orchestrator colors)
//   - `...FORK_TIER_MODEL,` as the last entry of TIER_MODEL (overrides the upstream values)
//   - the first line of tierOf (forkTierOf)
//   - `forkRegister(on) // fork` as the first statement of `register` (the `models` tool)
//   - `const m = forkTierModel(tier, TIER_MODEL[tier]) // fork` in tierModel (planned rows)
//   - `${FORK_CRAB_CSS}` inside CRAB_CSS, before the @media line (a template line cannot
//     carry a `// fork` comment, so it is only found through FORK_)
//   - `...FORK_COSTUMES,` in COSTUMES, before `other`
//   - `const stats = forkStats(...) // fork` in agentSvg (stats line fitted to the bar width)
//   - the three `forkCostume(a, costumeOf)` call sites: agentSvg's row crab (inside a
//     template, so no comment) and the two icon lines of compactSvg
//   - turn.step: one line before `if (!agentId || !usage) return result` (orchestrator row)
//   - turn.complete: one line before `return next(e)` (forkTurnDone: orchestrator row done;
//     a subagent's steps closed when its turn answered)
//   - the Pane render: one line after `finished` is computed (orchestrator pinned first)
//   - the band: the `crew` and `isWorking` lines (forkWorkers excludes the orchestrator row)
//
// Exports that register.tsx reads while it loads (FORK_TIER_COLOR, FORK_TIER_MODEL,
// FORK_CRAB_CSS, FORK_COSTUMES) are plain values, available at import time.
//
// Panel decisions made here: the orchestrator always wears the xhigh "wololo" costume,
// whatever its effort (the other orchestrator costumes stay in EFFORT_COSTUMES, unused).
// Avatars are twice the upstream size: `CRAB_SCALE = 2.0 // fork` in register.tsx. The row
// geometry that goes with it (row heights 80/74/68, text at x 76) is upstream's lines,
// changed without markers; see FORK.md.
import { atom, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRun } from '../types'

// register.tsx's `agents` and `now` atoms, referenced here by the same literal plugin/key:
// the plugin's state scan cannot follow atoms passed in as parameters.
const agents = atom({ plugin: 'savvy-progress', key: 'agents' } as const, [])
const now = atom({ plugin: 'savvy-progress', key: 'now' } as const, 0)

const CLAY = '#D97757'
const INK = '#1F1E1D'

type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

// The main session (the orchestrator) has no agentId, so its row is keyed by this id.
export const FORK_ORCH = 'orchestrator'

// The independent reviewer and the main session get their own row's color.
export const FORK_TIER_COLOR: Record<string, string> = {
  reviewer: '#C2569B',
  orchestrator: '#D4A72C',
}

// What each savvy tier runs on in this fork; overrides the upstream values.
export const FORK_TIER_MODEL: Record<string, [model: string, effort: string]> = {
  fable: ['Opus', 'high'],
  heavy: ['Sonnet', 'xhigh'],
  careful: ['Sonnet', 'high'],
  medium: ['Sonnet', 'medium'],
  light: ['Sonnet', 'low'],
}

// ORCH for the orchestrator's row type; undefined for every other type (upstream decides).
export const forkTierOf = (type: string): string | undefined => (type === FORK_ORCH ? FORK_ORCH : undefined)

// The model all workers run on in the current flow, as the orchestrator declared it with the
// `models` tool. null: each tier keeps its own model (the crew default). Only planned rows read
// it; running rows show the model the run really reports.
let forkWorkerModel: string | null = null

// The model label for a tier's planned row: the flow's worker model when one is declared, with
// the tier's own effort; otherwise `base`, the upstream TIER_MODEL entry (undefined for an unknown tier).
export const forkTierModel = (tier: string, base: [model: string, effort: string] | undefined): [model: string, effort: string] | undefined => {
  if (forkWorkerModel && base) return [forkWorkerModel, base[1]]
  return base
}

// Trimmed. Empty, longer than 24 characters, or holding anything but letters, digits, spaces,
// dots and dashes: no model declared (null).
const MODEL_MAX = 24
const MODEL_CHARS = /^[A-Za-z0-9 .-]+$/
const cleanWorkerModel = (raw: unknown): string | null => {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return s && s.length <= MODEL_MAX && MODEL_CHARS.test(s) ? s : null
}

// --- Effort costumes for the orchestrator and the reviewer (the user's designs).

// A crab of any color, with eyes that blink (`key`/`kl`, or `kre`/`krl` that also look
// around) and arms in their own groups so they can wave.
type CrabSpec = {
  color: string
  bigEyes?: boolean
  lookAround?: boolean
  armL?: [x: number, y: number, w: number, h: number]
  armR?: [x: number, y: number, w: number, h: number]
  armRCls?: string
  // [x, top, height] of each leg, `la` legs first, then `lb`; feet are [x, y, w, h] that step with `lb`.
  legsA?: [number, number, number][]
  legsB?: [number, number, number][]
  feet?: [number, number, number, number][]
  // Light suckers under the tentacles, each riding the group it hangs from (`kal`, `kar` or `lb`).
  suckers?: Partial<Record<'kal' | 'kar' | 'lb', [number, number][]>>
}
// Light grey for parts that are white in the designs: visible on a white panel too.
const PALE = '#E3E3E3'
const anyCrab = (f: Fill, s: CrabSpec): void => {
  const c = s.color
  f(7, 10, 16, 12, c)
  const [lx, ly, lw, lh] = s.armL ?? [3, 14, 4, 4]
  const [rx, ry, rw, rh] = s.armR ?? [23, 14, 4, 4]
  f(lx, ly, lw, lh, c, 'kal')
  f(rx, ry, rw, rh, c, s.armRCls ?? 'kar')
  const eye = s.lookAround ? 'kre' : 'key'
  const lid = s.lookAround ? 'krl' : 'kl'
  const eyes: [number, number, number][] = s.bigEyes ? [[9, 12, 3], [18, 12, 3]] : [[9, 12, 2], [19, 12, 2]]
  for (const [x, y, n] of eyes) {
    f(x, y, n, n, INK, eye)
    f(x, y + n - 1, n, 1, INK, lid)
  }
  for (const [x, y, h] of s.legsA ?? [[7, 22, 4], [17, 22, 4]]) f(x, y, 2, h, c, 'la')
  for (const [x, y, h] of s.legsB ?? [[11, 22, 4], [21, 22, 4]]) f(x, y, 2, h, c, 'lb')
  for (const [x, y, w, h] of s.feet ?? []) f(x, y, w, h, c, 'lb')
  for (const [cls, dots] of Object.entries(s.suckers ?? {})) for (const [x, y] of dots ?? []) f(x, y, 1, 1, PALE, cls)
}

// Pixel rows with a legend: each letter is [color, group].
const paint = (f: Fill, x0: number, y0: number, rows: string[], legend: Record<string, [string, string?]>): void =>
  rows.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      const l = legend[ch]
      if (l) f(x0 + dx, y0 + dy, 1, 1, l[0], l[1])
    }),
  )

// Silver and gold crowns share one shape: seven teeth, three gems and a band on the brow.
const flatCrown = (f: Fill, metal: string, gem: string, band: string): void =>
  paint(f, 7, 6, ['c..c.c.cc.c.c..c', 'cccccccccccccccc', 'cggccccggccccggc', 'cccccccccccccccc', 'bbbbbbbbbbbbbbbb'], {
    c: [metal, 'kcr'],
    b: [band, 'kcr'],
    g: [gem, 'kgm'],
  })

// Octopus legs: `la` pair, `lb` pair, and the curled tips of the bigger octopi.
const SHORT_LEGS: Pick<CrabSpec, 'legsA' | 'legsB'> = { legsA: [[7, 22, 3], [17, 22, 3]], legsB: [[11, 22, 4], [21, 22, 4]] }

const EFFORT_COSTUMES: Record<string, (f: Fill, t: string) => void> = {
  // Orchestrator low: silver crown; it jiggles as the crab walks.
  'orchestrator-low': f => {
    anyCrab(f, { color: CLAY })
    flatCrown(f, '#CDD1D7', '#FB5361', '#9FA4AB')
  },
  // Orchestrator medium: the same crown in gold with amber gems.
  'orchestrator-medium': f => {
    anyCrab(f, { color: CLAY })
    flatCrown(f, '#FFE852', '#FFBB00', '#C9C9C9')
  },
  // Orchestrator high: a floating jeweled crown and a golden scepter that shakes.
  'orchestrator-high': f => {
    paint(f, 24, 3, ['.o.', 'ojo', '.o.'], { o: ['#FFE852', 'kst'], j: ['#CD36FF', 'kst'] })
    f(25, 6, 1, 15, '#C99A1E', 'kst')
    anyCrab(f, { color: CLAY, armRCls: 'kst' })
    paint(f, 7, 5, ['.gg....gg....gg.', 'gggg..gggg..gggg', 'gppggggeeggggrrg', 'gggggggggggggggg', 'hhhhhhhhhhhhhhhh'], {
      g: ['#FFE852', 'kcr'],
      h: [PALE, 'kcr'],
      p: ['#CD36FF', 'kgm'],
      e: ['#36FF65', 'kgm'],
      r: ['#FF6565', 'kgm'],
    })
  },
  // Orchestrator xhigh: the Age of Empires priest. White hair, blue robe, a crook that
  // shakes with a soft blue glow pulsing behind its top, and a swaying sleeve.
  'orchestrator-xhigh': f => {
    const C = CLAY
    const GLOW = 'rgba(1,175,255,.2)'
    paint(f, 23, 5, ['..ggg..', '.ggggg.', 'ggggggg', 'ggggggg', '.ggggg.', '..ggg..'], { g: [GLOW, 'kgl'] })
    paint(f, 24, 6, ['.sss.', 'sssss', 'sssss', '.sss.'], { s: [GLOW, 'kgs'] })
    paint(f, 25, 7, ['sss', 's.s'], { s: ['#4A3719', 'kst'] })
    f(25, 9, 1, 16, '#4A3719', 'kst')
    f(11, 8, 7, 3, C)
    f(7, 8, 4, 3, PALE); f(18, 8, 5, 3, PALE)
    f(7, 11, 16, 4, C)
    f(23, 11, 4, 4, C, 'kst')
    for (const x of [9, 19]) {
      f(x, 12, 2, 2, INK, 'key')
      f(x, 13, 2, 1, INK, 'kl')
    }
    paint(f, 3, 13, ['wbww', 'wbww', 'wbww', 'wbww'], { w: ['#E6D8B8', 'kal'], b: ['#3E48A2', 'kal'] })
    paint(f, 7, 15, ['BBBBBBBGGBBBBBBB', 'BBBBBBBBBBBBBBBB', 'GGGBBBBBBBBBBGGG', 'GGGBBBBBBBBBBGGG', 'GGGBBBBBBBBBBGGG', 'BBBBBBBBBBBBBBBB', 'BBBBBBBGGBBBBBBB', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG'], {
      B: ['#3E48A2'],
      G: ['#D8C7A3'],
    })
    f(7, 24, 2, 2, C, 'la'); f(17, 24, 2, 2, C, 'la')
    f(11, 24, 2, 1, C, 'lb'); f(21, 24, 2, 1, C, 'lb')
  },
  // Reviewer low: pink octopus; arms wave, eyes scan and blink.
  'reviewer-low': f => anyCrab(f, { color: '#D59BFF', lookAround: true, armL: [3, 15, 4, 2], armR: [23, 16, 4, 2], ...SHORT_LEGS }),
  // Reviewer medium: lavender octopus with one arm up.
  'reviewer-medium': f =>
    anyCrab(f, {
      color: '#9C6EFF',
      lookAround: true,
      armL: [3, 13, 4, 3],
      armR: [23, 14, 4, 3],
      ...SHORT_LEGS,
      suckers: { kal: [[3, 16], [5, 16]], kar: [[24, 17], [26, 17]] },
    }),
  // Reviewer high: bluish-lilac octopus, big eyes, a long arm and curled tentacles.
  'reviewer-high': f =>
    anyCrab(f, {
      color: '#6C27FF',
      bigEyes: true,
      lookAround: true,
      armL: [4, 14, 3, 2],
      armR: [23, 15, 6, 2],
      legsA: [[7, 22, 3], [17, 22, 3]],
      legsB: [[11, 22, 4], [21, 22, 4]],
      feet: [[10, 26, 3, 2], [23, 24, 2, 2]],
      suckers: { kal: [[4, 16], [6, 16]], kar: [[24, 17], [26, 17]], lb: [[22, 26], [24, 26]] },
    }),
  // Reviewer xhigh: reddish octopus, big eyes, both arms long and curled tentacles.
  'reviewer-xhigh': f =>
    anyCrab(f, {
      color: '#FF2768',
      bigEyes: true,
      lookAround: true,
      armL: [2, 14, 5, 2],
      armR: [23, 15, 7, 2],
      legsA: [[7, 22, 3], [17, 22, 3]],
      legsB: [[11, 22, 3], [21, 22, 4]],
      feet: [[9, 25, 4, 2], [23, 24, 2, 2]],
      suckers: { kal: [[2, 16], [4, 16]], kar: [[24, 17], [26, 17], [28, 17]], lb: [[9, 27], [11, 27]] },
    }),
}
// Without an effort (a planned task, an old run) both show their high costume.
EFFORT_COSTUMES[FORK_ORCH] = EFFORT_COSTUMES['orchestrator-high'] as (f: Fill, t: string) => void
EFFORT_COSTUMES.reviewer = EFFORT_COSTUMES['reviewer-high'] as (f: Fill, t: string) => void

// The fork's CSS rules, spliced into CRAB_CSS by register.tsx, before its @media line.
export const FORK_CRAB_CSS = `.kl,.krl,.kgs{opacity:0}
.run .kcr,.run .kgm{animation:st .5s steps(1) infinite}
.run .kgl{animation:shake .5s steps(1) infinite,off 1s steps(1) infinite}.run .kgs{animation:shake .5s steps(1) infinite,on 1s steps(1) infinite}
.run .key{animation:shut 1s steps(1) infinite}.run .kl{animation:lid 1s steps(1) infinite}
.run .kre{animation:shut 1s steps(1) infinite,look 1s steps(1) infinite}.run .krl{animation:lid 1s steps(1) infinite,look 1s steps(1) infinite}
.run .kst{animation:shake .5s steps(1) infinite}
.run .kal{animation:st .5s steps(1) infinite -.25s}.run .kar{animation:st .5s steps(1) infinite}
@keyframes on{50%{opacity:1}}@keyframes off{50%{opacity:0}}@keyframes look{50%{transform:translateX(-1px)}}
@keyframes shut{87.5%,100%{opacity:0}}@keyframes lid{87.5%,100%{opacity:1}}
@keyframes shake{25%,50%{transform:translateX(-1px)}75%,100%{transform:translateX(1px)}}`

// What register.tsx spreads into COSTUMES: one costume per effort, plus the two aliases.
export const FORK_COSTUMES: Record<string, (f: Fill, t: string) => void> = EFFORT_COSTUMES

// The reviewer dresses by the effort its run reports. Max effort, or a Fable/Mythos model,
// wears the xhigh costume; so does a reviewer moved to Opus (the playbook does that for
// Fable-tier and sensitive tasks). The orchestrator does not use this: it always wears xhigh.
const effortLevel = (a: AgentRun, base: string): string => {
  if (/fable|mythos/i.test(a.model) || a.effort === 'max') return 'xhigh'
  if (base === 'reviewer' && /opus/i.test(a.model)) return 'xhigh'
  return a.effort === 'low' || a.effort === 'medium' || a.effort === 'high' || a.effort === 'xhigh' ? a.effort : 'high'
}
// `costumeOf` is register.tsx's own (upstream) type-to-costume function.
// The orchestrator always returns the wololo costume (xhigh), whatever its effort or model.
export const forkCostume = (a: AgentRun, costumeOf: (type: string) => string): string => {
  const base = costumeOf(a.type)
  if (base === FORK_ORCH) return 'orchestrator-xhigh'
  return base === 'reviewer' ? `${base}-${effortLevel(a, base)}` : base
}

type ForkUsage = {
  model?: string
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}
type ForkStepEvent = { model?: string; effort?: unknown }

// turn.step of the main session (no agentId): feeds the orchestrator's own row.
// Returns `result` untouched, so register.tsx can `return` this call as is.
export async function forkOrchestratorStep<R,>(
  $: any,
  e: ForkStepEvent,
  usage: ForkUsage,
  windowOf: (model: string) => number,
  costOf: (model: string, u: any, isRequest: boolean) => number,
  result: R,
): Promise<R> {
  const model = (usage.model || e.model) as string
  const at = await $.clock.now()
  const prompt =
    (usage.input_tokens || 0) +
    (usage.cache_read_input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.output_tokens || 0)
  await update($, agents, (list: AgentRun[]) => {
    const prev = list.find(a => a.id === FORK_ORCH)
    const run: AgentRun = {
      id: FORK_ORCH,
      type: FORK_ORCH,
      description: 'Main session · plan & review',
      startedAt: prev?.startedAt ?? at,
      round: 1,
      model,
      effort: typeof e.effort === 'string' ? e.effort : prev?.effort,
      status: 'running',
      endedAt: undefined,
      contextTokens: prompt,
      contextMax: windowOf(model),
      tokens: (prev?.tokens ?? 0) + prompt,
      costUsd: (prev?.costUsd ?? 0) + costOf(model, usage, true),
      steps: (prev?.steps ?? 0) + 1,
    }
    return prev ? list.map(a => (a.id === FORK_ORCH ? run : a)) : [run, ...list]
  })
  return result
}

// turn.complete of the main session (no agentId): its row waits as done until the next request.
async function forkOrchestratorDone($: any): Promise<void> {
  const at = await $.clock.now()
  await update($, agents, (list: AgentRun[]) => list.map((a): AgentRun => (a.id === FORK_ORCH ? { ...a, status: 'done', endedAt: at } : a)))
  await update($, now, () => at)
}

// turn.complete of any run, after upstream has set its status. The main session goes through
// forkOrchestratorDone. A subagent whose turn answered (reason 'answer', status 'done') has its
// steps closed: done = total, note cleared. A failed run keeps its steps and note.
export async function forkTurnDone($: any, agentId: string | undefined, reason: string | undefined): Promise<void> {
  if (!agentId) return forkOrchestratorDone($)
  if (reason !== 'answer') return
  await update($, agents, (list: AgentRun[]) =>
    list.map((a): AgentRun => (a.agentId === agentId && a.stepTotal ? { ...a, stepDone: a.stepTotal, stepNote: undefined } : a)),
  )
}

// Pins the orchestrator's row first, reordering `list` in place (the rest keep their order).
export const forkPinFirst = (list: AgentRun[]): AgentRun[] => {
  const orch = list.filter(a => a.id === FORK_ORCH)
  if (orch.length === 0) return list
  list.splice(0, list.length, ...orch, ...list.filter(a => a.id !== FORK_ORCH))
  return list
}

// The subagents only: the band's crew count and working state leave out the main session's row.
export const forkWorkers = (list: AgentRun[]): AgentRun[] => list.filter(a => a.id !== FORK_ORCH)

// The stats line under an agent's bar: drops the context label, then the cost, until it fits the bar width.
export const forkStats = (ctxLabel: string, ctx: number, tokens: string, cost: string, time: string, barW: number, textWidth: (text: string, size: number) => number): string => {
  let stats = `${ctxLabel} ${ctx}% · ${tokens}  ${cost}  ${time}`
  if (textWidth(stats, 11) > barW) stats = `${ctx}% · ${tokens}  ${cost}  ${time}`
  if (textWidth(stats, 11) > barW) stats = `${ctx}% · ${tokens}  ${time}`
  return stats
}

// The `models` tool: the orchestrator declares the flow's worker model (e.g. "Haiku") so the
// planned rows show it. Called from register's own session.start handler. The mod has one such handler: the plugin
// validator rejects two registrations of the same event without a matcher.
export async function forkSessionStart($: any): Promise<void> {
  // A new or reloaded session starts with each tier's own model until a flow declares otherwise.
  forkWorkerModel = null
  await $.tool.register({
    name: 'models',
    description:
      'For the main session only: declare the model all savvy-flow workers run on in this flow (e.g. "Haiku"), ' +
      'so the agents panel shows it on the planned tasks. Call it when presenting the plan. Leave `workers` out when ' +
      'each tier keeps its own model. A call from a subagent is ignored.',
    inputSchema: {
      type: 'object',
      properties: {
        workers: {
          type: 'string',
          description: "Model all workers run on in this flow, e.g. \"Haiku\". Omit or empty to show each tier's own model.",
        },
      },
    },
  })
}

// Registered from register's first statement. The handler is the fork's own; it touches the
// fork's `now` reference so the panel and band redraw with the new label.
export const forkRegister = (on: Parameters<Register>[0]): void => {
  on('tool.call', { tool: 'mcp__savvy-progress__models' }, async ($, e) => {
    // Same rule as `progress`: a subagent's call changes nothing.
    if (e.agentId) return { result: 'ignored: only the main session declares the worker model' }
    forkWorkerModel = cleanWorkerModel((e as unknown as { workers?: unknown }).workers)
    const at = await $.clock.now()
    await update($, now, () => at)
    return { result: `ok: workers ${forkWorkerModel ?? 'default'}` }
  })
}

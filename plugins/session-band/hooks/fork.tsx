// Fork additions to session-band, kept out of register.tsx so that merging upstream
// changes into register.tsx conflicts as little as possible.
//
// This file must not import register.tsx (no cycle). Whatever it needs from there (the icons,
// the computed row values, `$`, `e`, `next`) is passed in as arguments. State atoms are the
// exception: they are declared here with register.tsx's plugin and key, because the plugin's
// state scan cannot follow atoms passed in as parameters (the validator rejects that).
//
// Touch points in register.tsx and types/index.d.ts (find them with `grep -n "// fork" ...`):
//   - register.tsx: the import from './fork'
//   - register.tsx, AbovePrompt hook: one line before the upstream `return (` that returns
//     `forkBand(...)` (`if (forkRow) return forkRow`). The upstream row JSX below it stays in
//     place, never reached; it is left as is so that upstream edits to it merge cleanly.
//   - types/index.d.ts: `isCollapsed: boolean` added to the `session-band` state contract
//
// What forkBand changes against upstream's row:
//   - the row is drawn first and the other mods' bands (`next(e)`) below it in a column
//     (upstream swallowed them);
//   - a `▾`/`▸` button before the `×` collapses the row to total cost, cache and context;
//   - on desktop every icon Svg is interactive and carries an English `<title>` tooltip.
import { atom, read, update } from 'claude-code'

// register.tsx's `isCollapsed` state is declared here and only here (upstream has no such
// atom); it is part of the 'session-band' contract in types/index.d.ts.
const isCollapsed = atom({ plugin: 'session-band', key: 'isCollapsed' } as const, false)
// register.tsx's `isHidden` atom, referenced by the same literal plugin/key.
const isHidden = atom({ plugin: 'session-band', key: 'isHidden' } as const, false)

const TIPS = {
  speed: 'Output speed of the last response (tokens/s)',
  cost: 'Last turn cost | session total cost',
  costTotal: 'Session total cost',
  cache: 'Prompt cache time left (1 h from the last response)',
  context: 'Context window usage',
} as const

// Adds a `<title>` (the hover tooltip) as the first child of the SVG's root element.
const withTitle = (source: string, text: string): string => {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return source.replace(/<svg\b[^>]*>/, open => `${open}<title>${safe}</title>`)
}

// What register.tsx hands over: the values it computed for the row and its drawing helpers.
export type ForkBandKit = {
  s: { turn: number; speed: number | null; total: number; context: number }
  level: string | null
  cacheColor: string
  cacheText: string
  tier: number
  icon: number
  gap: number | undefined
  speed: string
  turnCost: string
  usd: (n: number) => string
  SPEED: string
  MONEY: string
  SPEED_ICON: string
  MONEY_ICON: string
  contextIcon: (percent: number) => string
  contextBar: (percent: number) => string
  cacheIcon: (color: string) => string
}

export async function forkBand($: any, e: any, next: (e: any) => unknown, k: ForkBandKit) {
  // Other mods' bands go below this row. Claude Code's own placeholder ({ type: 'engine' }) is
  // never nested: the desktop drops a band that nests it.
  const drawn = await Promise.resolve(next(e)).catch(() => null)
  const below = drawn && typeof drawn === 'object' && (drawn as { type?: string }).type !== 'engine' ? drawn : null

  const ui = $.ui.resolve(e)
  const { Box, Button, Text } = ui
  const Svg = 'Svg' in ui ? ui.Svg : null
  // Hover (tooltips) exists on the desktop only: the terminal's drawing stays as upstream's.
  const hasHover = e.surface !== 'terminal'
  const tip = (source: string, text: string) =>
    hasHover ? { source: withTitle(source, text), isInteractive: true } : { source }
  const collapsed = await read($, isCollapsed)
  const { s, level, cacheColor, cacheText, tier, icon, gap } = k

  const turnBox =
    !collapsed && tier <= 2 ? (
      <Box flexDirection="row" alignItems="center" columnGap={1} flexShrink={0}>
        {tier <= 1 ? <Text dimColor>Turn</Text> : <Text dimColor>#</Text>}
        <Text bold>{String(s.turn)}</Text>
      </Box>
    ) : null

  const speedBox =
    !collapsed && tier <= 3 ? (
      <Box flexDirection="row" alignItems="center" columnGap={1} flexShrink={0}>
        {Svg ? (
          <Svg {...tip(k.SPEED_ICON, TIPS.speed)} alt="speed" width={icon} height={icon} />
        ) : (
          <Text color={k.SPEED}>⚡</Text>
        )}
        <Text bold wrap="truncate-end">{tier <= 1 || s.speed === null ? k.speed : `${s.speed}/s`}</Text>
      </Box>
    ) : null

  const costBox = (
    <Box flexDirection="row" alignItems="center" columnGap={1} flexShrink={0}>
      {Svg ? (
        <Svg {...tip(k.MONEY_ICON, collapsed ? TIPS.costTotal : TIPS.cost)} alt="cost" width={icon} height={icon} />
      ) : (
        <Text color={k.MONEY}>$</Text>
      )}
      <Text bold color={collapsed ? undefined : k.MONEY}>{collapsed ? k.usd(s.total) : k.turnCost}</Text>
      {!collapsed && tier <= 2 ? <Text dimColor>|</Text> : null}
      {!collapsed && tier <= 2 ? <Text bold>{k.usd(s.total)}</Text> : null}
    </Box>
  )

  const cacheBox = (
    <Box flexDirection="row" alignItems="center" columnGap={1} flexShrink={0}>
      {Svg ? (
        <Svg {...tip(k.cacheIcon(cacheColor), TIPS.cache)} alt="cache" width={icon} height={icon} />
      ) : (
        <Text color={cacheColor}>⧗</Text>
      )}
      <Text bold color={level ?? undefined}>{cacheText}</Text>
    </Box>
  )

  const contextBox = (
    <Box flexDirection="row" alignItems="center" columnGap={1} flexShrink={0}>
      {Svg ? (
        <Svg {...tip(k.contextIcon(s.context), TIPS.context)} alt="context" width={icon} height={icon} />
      ) : null}
      {Svg && !collapsed && tier === 0 ? (
        <Svg {...tip(k.contextBar(s.context), TIPS.context)} alt={`context ${s.context}%`} width={80} height={6} />
      ) : null}
      <Text bold>{`${s.context}%`}</Text>
    </Box>
  )

  // A blank line before the band below, as savvy-progress does: the same spacing in either plugin order.
  return (
    <Box flexDirection="column" {...(below ? { rowGap: 1 } : {})}>
      <Box
        flexDirection="row"
        alignItems="center"
        columnGap={gap}
        flexWrap="nowrap"
        overflow="hidden"
        paddingX={1}
        {...(level ? { borderStyle: 'round', borderColor: level } : {})}
      >
        {turnBox}
        {speedBox}
        {costBox}
        {cacheBox}
        <Box flexGrow={1} flexShrink={1} />
        {contextBox}
        <Button
          key="collapse"
          label={collapsed ? '▸' : '▾'}
          plain
          dimColor
          onPress={() => update($, isCollapsed, c => !c)}
        />
        <Button key="hide" label="×" role="dismiss" plain dimColor onPress={() => update($, isHidden, () => true)} />
      </Box>
      {below}
    </Box>
  )
}

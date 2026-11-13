#!/usr/bin/env bash
# Sanity checks for the fork's merge touch points. Run after every `git merge upstream/main`.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

FAILS=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS + 1)); }
warn() { echo "WARN  $1"; }

REG=plugins/savvy-progress/hooks/register.tsx
FORK=plugins/savvy-progress/hooks/fork.tsx
SKILL=plugins/savvy-flow/skills/savvy-flow/SKILL.md
EXPECTED_TOUCH_POINTS=17 # 15 lines with `// fork` (CRAB_SCALE included) + `${FORK_CRAB_CSS}` + forkCostume in agentSvg

# 1. fork-owned files
missing=""
for f in FORK.md fork/check.sh fork/crew/SKILL.md fork/crew/OVERRIDES.md fork/small-crew/SKILL.md fork/small-crew/OVERRIDES.md fork/supercrew/SKILL.md fork/supercrew/OVERRIDES.md fork/avatar-templates \
  plugins/savvy-flow/agents/savvy-reviewer.md "$FORK"; do
  [ -e "$f" ] || missing="$missing $f"
done
if [ -z "$missing" ]; then pass "fork-owned files exist"; else fail "fork-owned files missing:$missing"; fi

# 2. register.tsx touch points
tp="$(grep -nE '// fork|\$\{FORK_CRAB_CSS\}|forkCostume\(a, costumeOf\)' "$REG" || true)"
n=0; [ -n "$tp" ] && n="$(printf '%s\n' "$tp" | wc -l | tr -d ' ')"
if [ "$n" -eq "$EXPECTED_TOUCH_POINTS" ]; then
  pass "register.tsx touch points: $n/$EXPECTED_TOUCH_POINTS"
else
  fail "register.tsx touch points: $n, expected $EXPECTED_TOUCH_POINTS (see FORK.md, 'Touch points in upstream files')"
  printf '%s\n' "$tp" | sed 's/^/        /'
fi

# 3. imports from './fork' are exported by fork.tsx
imports="$(grep -E "from './fork'" "$REG" | sed -E 's/.*import \{([^}]*)\}.*/\1/' | tr ',' '\n' | sed 's/ //g' | grep -v '^$' || true)"
bad=""
for name in $imports; do
  grep -qE "^export (const|async function|function) $name\b" "$FORK" || bad="$bad $name"
done
if [ -z "$imports" ]; then fail "no names imported from './fork' in register.tsx"
elif [ -z "$bad" ]; then pass "all $(printf '%s\n' "$imports" | wc -l | tr -d ' ') names imported from './fork' are exported"
else fail "imported from './fork' but not exported by fork.tsx:$bad"; fi

# 4. bundle check
if command -v bun >/dev/null 2>&1; then
  TMPDIR_CHECK="$(mktemp -d)"
  trap 'rm -rf "$TMPDIR_CHECK"' EXIT
  if out="$(bun build "$REG" --outfile "$TMPDIR_CHECK/out.js" --external claude-code --external 'react/*' 2>&1)"; then
    pass "bun build register.tsx"
  else
    fail "bun build register.tsx"; printf '%s\n' "$out" | sed 's/^/        /'
  fi
else
  warn "bun not found, skipped bundle check"
fi

# 5. worker models
for pair in fable:opus heavy:sonnet careful:sonnet medium:sonnet light:sonnet; do
  tier="${pair%%:*}"; want="${pair##*:}"
  f="plugins/savvy-flow/agents/savvy-$tier.md"
  got="$(grep -m1 '^model:' "$f" 2>/dev/null | sed 's/^model: *//' || true)"
  if [ "$got" = "$want" ]; then pass "savvy-$tier model: $want"; else fail "savvy-$tier model is '$got', expected '$want'"; fi
done
if [ -f plugins/savvy-flow/agents/savvy-reviewer.md ]; then pass "savvy-reviewer.md exists"; else fail "savvy-reviewer.md missing"; fi

# 6. headings overridden by each OVERRIDES.md still exist upstream
for ov in fork/crew/OVERRIDES.md fork/small-crew/OVERRIDES.md fork/supercrew/OVERRIDES.md; do
  heads="$(grep -E '^## Override: "## ' "$ov" | sed -E 's/^## Override: "(.*)".*$/\1/' || true)"
  if [ -z "$heads" ]; then fail "no overridden headings found in $ov"; fi
  while IFS= read -r h; do
    [ -z "$h" ] && continue
    if grep -qxF -- "$h" "$SKILL"; then pass "SKILL.md heading ($ov): $h"; else fail "SKILL.md heading missing: $h (update $ov)"; fi
  done <<< "$heads"
done

# 6b. upstream SKILL.md drift: OVERRIDES.md replaces whole sections, so upstream edits there merge silently
want="$(cat fork/crew/UPSTREAM_SKILL.sha256 2>/dev/null || true)"
have="$(shasum -a 256 plugins/savvy-flow/skills/savvy-flow/SKILL.md | cut -d' ' -f1)"
if [ "$want" = "$have" ]; then
  pass "upstream SKILL.md unchanged since OVERRIDES.md was last reviewed"
else
  warn "upstream SKILL.md changed: review it against fork/crew/OVERRIDES.md (git diff ORIG_HEAD HEAD -- plugins/savvy-flow/skills), then: shasum -a 256 plugins/savvy-flow/skills/savvy-flow/SKILL.md | cut -d' ' -f1 > fork/crew/UPSTREAM_SKILL.sha256"
fi

# 7. launchers: $ARGUMENTS once (Claude Code substitutes it anywhere) and the playbook paths they read exist
for spec in crew:2 small-crew:3 supercrew:3; do
  name="${spec%%:*}"; want_np="${spec##*:}"; f="fork/$name/SKILL.md"
  c="$( (grep -o '\$ARGUMENTS' "$f" || true) | wc -l | tr -d ' ')"
  if [ "$c" -eq 1 ]; then pass "$f has \$ARGUMENTS once"; else fail "$f has \$ARGUMENTS $c times, expected 1"; fi
  badp=""
  paths="$( (grep -oE '`/[^` ]+\.md`' "$f" || true) | tr -d '`')"
  np=0; [ -n "$paths" ] && np="$(printf '%s\n' "$paths" | wc -l | tr -d ' ')"
  [ "$np" -eq "$want_np" ] || badp=" (found $np absolute paths, expected $want_np)"
  for p in $paths; do
    [ -e "$p" ] || badp="$badp $p"
  done
  if [ -z "$badp" ]; then pass "paths in $f exist"; else fail "paths in $f missing:$badp (clone moved? edit them)"; fi
done

# 8. local symlinks (per machine)
for name in crew small-crew supercrew; do
  link="$HOME/.claude/skills/$name"
  if [ -L "$link" ] && [ "$(readlink "$link")" = "$ROOT/fork/$name" ]; then
    pass "~/.claude/skills/$name -> $ROOT/fork/$name"
  else
    warn "~/.claude/skills/$name is not a symlink to $ROOT/fork/$name (ln -sfn \"$ROOT/fork/$name\" ~/.claude/skills/$name)"
  fi
done

echo
if [ "$FAILS" -gt 0 ]; then echo "$FAILS check(s) FAILED"; exit 1; fi
echo "All checks passed"

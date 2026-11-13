# claude-crew

Fork of JohnnyVizz/claude-kit. Read `FORK.md` before changing anything: it holds the layout rule (fork logic in fork-owned files, one-line `// fork` hooks in upstream files), the touch-point tables and the merge procedure. Run `fork/check.sh` after any change to a touch point.

## Language: English only

Everything written into this repo is in English, even when the user's prompt is in Spanish or Catalan:

- code: identifiers, comments, log and error messages;
- user-facing text: tooltips, labels, tool descriptions, panel strings;
- docs: `FORK.md`, READMEs, `OVERRIDES.md`, `SKILL.md`, commit messages and PR descriptions.

Only exception: data that is meant to be in another language, such as the Catalan worker names in `plugins/savvy-progress/hooks/fork.tsx`, and upstream's own translations (Russian, Hebrew).

# Crew overrides for the savvy-flow playbook

These rules are a fork delta applied on top of the upstream savvy-flow SKILL.md. They replace the upstream sections they name.
Where upstream text conflicts with this file, this file wins. Anything not mentioned here stays exactly as upstream says.
Sections are referred to by heading text and number; if the numbering shifts upstream, match by heading text.

## Override: "## 0. Preconditions"

- Reference setup: the flow is designed for a strong orchestrator model at high effort; the reference setup is **Opus 5.5 high** (not the model named upstream). Do not try to detect or verify the session's model or effort. Whatever the session runs on is the user's deliberate choice; just orchestrate.
- Required agents: `savvy-fable`, `savvy-heavy`, `savvy-careful`, `savvy-medium`, `savvy-light`, plus the reviewer `savvy-reviewer` (in `~/.claude/agents/`, or shipped with the savvy-flow plugin, in which case the Agent tool lists them as `savvy-flow:savvy-careful` and so on). If the Agent tool does not list them, stop and tell the user.

## Override: "## Progress bar"

This section replaces the upstream one. The plan is shown to the user before anything is delegated, so the progress bar sits in phase `plan` until the user approves.

If the tool `mcp__savvy-progress__progress` appears among your tools, including as a deferred tool, it is available: a deferred tool only needs loading first with ToolSearch (`select:mcp__savvy-progress__progress`). Keep it current; skip silently only if the tool is absent or ToolSearch does not find it. Call it:
- when you present the plan (section 1, step 4): `title` (a few words), `total` (number of worker tasks), `tasks` (`[{ title, tier, after }]` in plan order; `tier` without the `savvy-` prefix, `after` the numbers of the tasks it waits for), `phase: "plan"`;
- after each change the user asks for while the plan awaits approval: the new `tasks` and `total`, `phase: "plan"`. A re-plan after delegation started (new or dropped tasks, changed tiers) goes back through step 4: send `phase: "plan"` and wait for approval again;
- once the user approves: switch to `phase: "delegate"` (or `"design"` while in section 2), before the first Agent call. Never send `"delegate"` before approval;
- each time a task is accepted in review: `done` (accepted so far); switch `phase` to `"review"` while reviewing;
- once at close: `finished: true`.
- when you present the plan (section 1, step 4), first (before the `progress` call above, so the planned rows are drawn with it) call the separate tool `mcp__savvy-progress__models` (ToolSearch first if deferred, same rule as above; skip silently if absent): with `workers` set to the model all workers run on in this flow, so planned rows show it; or with no `workers` when each tier keeps its own model (the crew default). A `models` call changes nothing else.

When delegating, pass the task's `title` verbatim as the Agent tool's `description` (a return round reuses it too): the agents panel matches runs to planned tasks by it.

## Override: "## 1. Understand and plan (orchestrator only)" step 4: the plan needs approval

Replace step 4 with:

4. Present the plan to the user and **stop**. Nothing is delegated until the user approves it.
   - Show: numbered tasks, each with its tier, a one-line brief, its dependencies, and how it will be verified; which tasks run in parallel; any "risky" flags the active variant defines; and **the models this flow uses**, stated per role: which model each worker runs on and which model each review runs on, including any rule that moves a review to another model. Under the default crew setup that means: workers on Sonnet, Fable tier on Opus, reviews on Sonnet, and reviews on Opus for Fable-tier and sensitive tasks. A variant that changes the models states its own; this gate itself does not change.
   - Write the full plan as text in the message first, then, in the same message, call `AskUserQuestion` with one question (header "Plan") and exactly three options, in this order: **Approve** (start delegating), **Refine** (change something in the plan), **Reject** (do not implement the plan). If a reading of the request would lead to materially different work, put that question as an extra question in the same call (max 4 questions in total), not as prose. Then end your turn. Do not start any worker, reviewer or file edit in the same turn. Reading files to build the plan is fine.
   - Fallback: if `AskUserQuestion` is not available in the session, end the turn with the same three options written as a one-line question, with any clarifying question in the same message.
   - Approve: start delegating in the same turn. If the user also typed notes or changes (in annotations or alongside the click), apply them first, then start without asking again. "Other" text that is a plain approval ("ok", "go") counts as Approve; any other "Other" text is Refine. If an answer to a clarifying question changes the plan materially, treat it as Refine.
   - Refine: if the user already typed what to change (the automatic "Other" free-text field, or notes), apply it; otherwise ask what they want to change (a plain chat question, or an `AskUserQuestion` with a free-text answer). Then show the full updated plan and call `AskUserQuestion` again with the same three options. Repeat until Approve or Reject. The progress bar stays at `phase: "plan"` meanwhile (resend `tasks` and `total` after each change, per the Progress bar override). Changes include add, drop, merge or split tasks, change a tier, a brief or the order.
   - Reject: implement nothing; start no worker, reviewer or file edit. Call `mcp__savvy-progress__progress` with `finished: true` (if the tool is available, same rule as the Progress bar override) and end with a one-line confirmation that the plan was dropped.
   - Only a clear approval from the user counts: a click on Approve, or in chat "ok", "adelante", "aprobado", "go", or approving with changes (apply them, then start without asking again). Silence, a question, or a new topic is not approval.
   - New project (section 1a): the user's approval of SPEC.md and PLAN.md in 1a step 8 is this gate, and it uses the same three-option `AskUserQuestion`; the summary shown there must include everything listed above, models included; do not ask a second time when you come back to step 3. The files 1a writes before that approval are allowed.
   - Re-planning after delegation started, if it adds or drops tasks or changes tiers, needs a fresh approval through this step. Fixing a brief or returning a task to a worker does not.

## Override: "## 3. Tiering" table

Replace the tier table with these rows (the heuristics below the table stay as upstream). This table is authoritative for models and effort: the agents' `description:` lines keep the upstream model names on purpose (to avoid merge conflicts), so ignore the model they mention.

| Tier | Agent | Model / effort | Use for |
|------|-------|----------------|---------|
| Fable | `savvy-fable` | Opus / high | "Hardest problems": very complex logic (subtle algorithms, concurrency, many interacting states), hard bugs that resist ordinary debugging or survived a Heavy investigation; targeted design features, only when the user asks (section 2) |
| Heavy | `savvy-heavy` | Sonnet / xhigh | "Understand and find": unfamiliar or messy code, unclear root cause, non-obvious architecture, large contexts, anything where a wrong first approach is expensive |
| Careful | `savvy-careful` | Sonnet / high | "Do it right": the approach is clear but execution is delicate. Multi-file refactors, fixes that must preserve invariants, logic with many edge cases, concurrency |
| Medium | `savvy-medium` | Sonnet / medium | Standard feature work, bug fixes with a known cause, changes confined to a few files with clear requirements |
| Light | `savvy-light` | Sonnet / low | Mechanical edits, renames, boilerplate, config, small isolated fixes, running builds/tests and reporting |

## Override: "## 5. Adversarial review (orchestrator only)"

This section is replaced entirely by the following (its heading is now "Review (independent reviewer, orchestrator decides)"). References below to "section 4" mean the upstream "## 4. Delegate" section.

Treat every worker report as a claim to be checked, not a fact. Review has two layers, and the decision to accept is always yours.

For each returned task:
1. **Your own pass.** Read the actual diff/files, not just the report. Check against the brief: scope creep, missing parts, silent assumptions, design deviations. Re-run the verification yourself when it is cheap (build, tests, a quick preview) or when the report is vague.
2. **Independent review.** Spawn `savvy-reviewer` (same naming rule as section 4). It must stay independent, so its brief contains only:
   - the task brief exactly as the worker received it (what was asked, constraints, how to verify);
   - the paths the task touched, taken from `git status`/`git diff`, not from the worker's report. Workers run in parallel on one tree, so scope the reviewer to these paths;
   - pointers to CLAUDE.md and the docs that define the project's conventions.

   Never include the worker's report or reasoning, nor your own opinion of the code. Use a distinct Agent `description`, `Review: <task title>`, never the task title itself: the panel matches runs to planned tasks by title. Run it for every task, Light tier included. For Fable-tier tasks, or changes to auth, payments or user data, pass `model: "opus"` on the Agent call so the review runs on a stronger model.
3. **Triage the findings.** The reviewer's findings are claims too. Verify each blocker and major finding in the code before acting; drop false positives. Do not pass unverified findings on to a worker.
4. Outcome per task:
   - **Accept**;
   - **Return** to the same or a higher tier with the precise list of verified defects (not a re-explanation of the task). The returned work is reviewed again;
   - **Escalate**: take over only for design fixes or one-line corrections where a round trip would cost more than the fix.

Cap at two return rounds per task; after that, re-plan or ask the user. A reviewer that keeps finding real defects after two rounds usually means the plan or the tier was wrong.

When all tasks are accepted and the flow had more than one, run one last `savvy-reviewer` over the whole change (all touched paths, the user's original request as the brief): per-task reviews cannot see how the tasks interact.

## Override: "## 6. Close"

Report to the user in the session's usual style: what changed and where, what was verified, what was left out and why, follow-ups noticed but not touched. Mention which tiers ran and how many review rounds the reviewer needed, one line, no per-task narration.

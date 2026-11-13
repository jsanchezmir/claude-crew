# Supercrew overrides

Applied after the upstream savvy-flow SKILL.md and `fork/crew/OVERRIDES.md`. Where those conflict with this file, this file wins. Everything not mentioned here stays as they say.

Workers, tiers, effort, the plan-approval gate and the progress bar all come from `fork/crew/OVERRIDES.md`, unchanged. Only the review policy differs: it replaces crew's section 5 and extends crew's section 6.

## Override: "## 5. Adversarial review (orchestrator only)" review policy per tier

This section replaces crew's section 5. Its steps are kept, except where the policy below says otherwise. References to "section 4" mean the upstream "## 4. Delegate" section.

Treat every worker report as a claim to be checked, not a fact. Review has two layers, and the decision to accept is always yours.

For each returned task:
1. **Your own pass.** Read the actual diff/files, not just the report. Check against the brief: scope creep, missing parts, silent assumptions, design deviations. Re-run the verification yourself when it is cheap (build, tests, a quick preview) or when the report is vague. This pass is done for every task, whatever its review policy below.
2. **Independent review, by tier.** Spawn `savvy-reviewer` (same naming rule as section 4) only as the table below says. Its brief contains only:
   - the task brief exactly as the worker received it (what was asked, constraints, how to verify);
   - the paths the task touched, taken from `git status`/`git diff`, not from the worker's report. Workers run in parallel on one tree, so scope the reviewer to these paths;
   - pointers to CLAUDE.md and the docs that define the project's conventions.

   Never include the worker's report or reasoning, nor your own opinion of the code. Use a distinct Agent `description`, `Review: <task title>`, never the task title itself: the panel matches runs to planned tasks by title.

   | Tier | Per-task review | Agent call |
   |------|-----------------|------------|
   | Light | None, except when another task depends on it: then a per-task review, if the task appears in another task's `after`. Every light task is still covered by the final review. | `model: "haiku"` |
   | Medium | Always | `model: "haiku"` |
   | Careful | Always | No `model` parameter (Sonnet, from its file). Pass `model: "opus"` for changes to auth, payments or user data, as crew does. |
   | Heavy | Always | No `model` parameter (Sonnet). Pass `model: "opus"` for changes to auth, payments or user data, as crew does. |
   | Fable | Always | `model: "opus"`, as crew does. |

   The Haiku reviews are cheap, fast smoke checks. The orchestrator's own pass and the final review are the safety net, so do not add a second reviewer when a Haiku one is enough.

   The dependency check for light tasks is made on the plan's `after` lists, and again after any re-plan. A light task that gets a review is reviewed and accepted before any task that depends on it starts; a light task accepted earlier without review that gains a dependent in a re-plan gets its Haiku review before that dependent starts.

   Sensitive changes (auth, payments, user data) never rely on Haiku alone: a light or medium task that touches them gets a Sonnet per-task review instead (no `model` parameter), and the plan says so.

3. **Triage the findings.** The reviewer's findings are claims too. Verify each blocker and major finding in the code before acting; drop false positives. Do not pass unverified findings on to a worker.
4. Outcome per task:
   - **Accept**;
   - **Return** to the same or a higher tier with the precise list of verified defects (not a re-explanation of the task). A returned task gets the same review rule as its first round;
   - **Escalate**: take over only for design fixes or one-line corrections where a round trip would cost more than the fix.

Cap at two return rounds per task; after that, re-plan or ask the user. A reviewer that keeps finding real defects after two rounds usually means the plan or the tier was wrong.

**Final review.** Run one `savvy-reviewer` over the whole change whenever any task skipped its own review, or the flow had more than one task. Its brief is the user's original request plus all touched paths (from `git status`/`git diff`), as in crew. It runs on Sonnet (no `model` parameter) with `effort: "xhigh"` on the Agent call (if the Agent tool offers no `effort` parameter, run it without one and say in the plan that the final review runs at the reviewer's own effort), description `Review: final`, and follows the same independence rule (no worker report, no opinion of yours). Run it after all tasks are accepted; count tasks in the final accepted plan. If its verified findings lead to fixes beyond one-line corrections, run it once more over the fixed paths.

**Plan.** The plan (crew's gate) states this review policy per task: for each task, the review it gets (`Haiku`, `Sonnet`, `Opus`, or `none, final review only`), and the final review. The models line therefore names Haiku for medium reviews, Sonnet for final review, and the Sonnet/Opus rules for careful, heavy and Fable tasks.

## Override: "## 6. Close"

Add to the close: which tasks were reviewed by Haiku, and which only by the final review (light tasks with no dependents), one line.

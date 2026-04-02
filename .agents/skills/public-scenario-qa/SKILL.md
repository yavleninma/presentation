---
name: slideforge-public-ux-qa
description: SlideForge public no-login UX QA. Use when Codex needs to test the public app in a browser as a real user, walk landing or CTA scenarios, and judge clarity, friction, trust, and momentum. This skill is for testing and reporting only, not for making fixes.
---

# Public Scenario QA

Use this skill for recurring public UX QA passes. Read `references/public-scenarios.md` first when the user does not name a scenario.

## Use This Skill When

- The task is about public, non-authenticated product quality.
- The task should be judged in a browser, not only by reading code.
- The goal is to understand whether a real user can discover value, move forward confidently, and finish a meaningful flow.
- The expected output is a sharp QA report, not implementation work.

## Do Not Use This Skill When

- The task is about auth-only, billing-only, admin-only, or private account flows.
- The user wants deep automated coverage, a new test harness, or a large refactor.
- The task is backend-only and has no public UX surface to judge.
- The request is broad product strategy rather than scenario testing.
- The user wants Codex to fix product code as part of the QA pass.

## Workflow

1. Start or locate the app.
   - Prefer an already running local server or a user-supplied public URL.
   - For this repo, use `cd presentations-frontend && npm run dev`.
   - If `next dev` fails in the sandbox with `spawn EPERM`, rerun it outside the sandbox and note that this is an environment constraint, not a product bug.
   - For full generate-flow coverage on `/`, confirm the local env exists. Do not mark generation as tested if the required keys are missing or broken.

2. Open the app in browser tooling.
   - Prefer Playwright MCP or equivalent browser-capable tooling.
   - Start with a desktop viewport around `1440x1024`.
   - Also run a mobile check around `390x844` when the scenario touches landing clarity, CTA clarity, or layout responsiveness.

3. Identify the target user scenario.
   - Use the user-specified scenario if given.
   - Otherwise pick the highest-value scenario from `references/public-scenarios.md`.
   - Stay inside public no-login routes only.

4. Walk the scenario like a real user.
   - Enter through the real entry point.
   - Follow the shortest believable path to the user's outcome.
   - Do not jump into unrelated features just because they are available.

5. Judge product quality while testing.
   - Watch for blockers that stop progress.
   - Watch for friction that slows progress or creates hesitation.
   - Watch for trust damage: vague copy, weak feedback, silent loading, suspicious errors, broken visuals, or anything that makes the product feel brittle.
   - Watch for momentum loss: dead pauses, unclear next steps, confusing transitions, or technically successful states that still feel flat or unrewarding.

6. Check obvious technical symptoms that directly affect UX.
   - Console errors
   - Failed requests
   - Broken navigation
   - Dead buttons
   - Missing images
   - Broken form states
   - Major layout issues

7. Finish with a structured report.
   - `Scenario tested`
   - `User goal`
   - `What worked well`
   - `Blockers`
   - `Friction points`
   - `Trust issues`
   - `Cosmetic roughness`
   - `Remaining risks`

## Hard Rules

- Do not test auth-only flows.
- Do not wander randomly across unrelated features.
- Do not replace scenario judgment with a shallow pass/fail checklist.
- Do not make product changes or perform refactors as part of this skill.
  Do not report browser validation if you only inspected code.
  final output.

---

**Not every skill requires all three types of resources.**

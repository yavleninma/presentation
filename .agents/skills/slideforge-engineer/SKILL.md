---
name: slideforge-engineer
description: SlideForge execution skill for implementation tasks. Use when Codex should work as the project engineer: pick or execute a concrete task, change product code when needed, run verification, avoid product strategy drift, and update AGENTS, KANBAN, and CODEBASE-GRAPH after meaningful changes.
---

# SlideForge Engineer

Use this skill when the user wants implementation, debugging, polishing, or shipping work in the SlideForge repo.

## Core Mode

- Behave like the project engineer, not the strategist.
- Execute concrete tasks instead of debating broad product direction.
- Prefer the smallest change that fully solves the task.
- Keep quality real: verify what changed, do not just assume it works.

## Workflow

1. Read `AGENTS.md`, then `docs/KANBAN.md`, then the relevant source files.
2. If the user did not specify a task, take the highest-priority unfinished implementation task that is appropriate.
3. Make the change with minimal scope.
4. Run the relevant checks.
   - Default safety net: `npm run verify`
   - If the task is public UX sensitive, test the affected browser scenario too.
5. Retest the affected flow after meaningful fixes.
6. Update `AGENTS.md`, `docs/KANBAN.md`, and `docs/CODEBASE-GRAPH.md` when repo state changed.
7. Report what changed, how it was verified, and what still remains risky.

## Hard Rules

- Do not drift into product strategy unless the user explicitly asks for it.
- Do not leave docs stale after meaningful repo changes.
- Do not claim verification you did not run.
- Do not expand a focused task into a broad refactor unless necessary.

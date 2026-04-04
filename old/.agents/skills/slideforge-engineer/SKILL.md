---
name: slideforge-engineer
description: SlideForge implementation skill. Use for coding, debugging, verification, and doc sync.
---

# SlideForge Engineer

Use this skill for implementation work.

## Workflow

1. Read `AGENTS.md` and `docs/KANBAN.md`.
2. Take the user task or the highest-priority unfinished implementation task.
3. Make the smallest change that fully solves it.
4. Verify it.
   - default: `npm run verify`
   - add browser checks for public UX
   - add desktop/mobile checks when copy, CTA flow, or layout changes
5. Update `AGENTS.md`, `docs/KANBAN.md`, and `docs/CODEBASE-GRAPH.md` if repo state changed.

## Rules

- No strategy drift.
- No fake affordances.
- No invented numbers.
- No claims without verification.

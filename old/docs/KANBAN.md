# SlideForge - Kanban

> Source of truth for status. Update this file when priorities or task states change.
>
> Priority logic: task-first speed -> "not embarrassing to show" quality -> one main job and one main CTA -> honest UX -> refinement -> export fidelity -> advanced scenarios later.

## In Progress

### EPIC-24: Public Product Guardrails Alignment
- [ ] Rewrite `/` above the fold around one main job and one main CTA
- [ ] Remove or label fake public affordances
- [ ] Replace self-referential copy with task-first copy
- [ ] Replace invented numbers with placeholders where needed
- [ ] Run desktop and mobile QA on `/` and `/demo`

## Next

### EPIC-18: Output Fidelity
- [ ] Remove hardcoded `Arial` from PPTX export
- [ ] Run preview -> PPTX parity audit
- [ ] Raise default templates to "safe to show" quality

### EPIC-06: Outline Editor
- [ ] Connect `onOutline` to UI and store
- [ ] Keep outline review lightweight
- [ ] Keep one clear outline CTA

### EPIC-16: Slide-Level Regeneration
- [ ] Keep single-slide regeneration lightweight and obvious
- [ ] Support quick rewrite actions
- [ ] Keep labels honest about what is actually supported

### EPIC-13: UX Quick Wins
- [x] Limit slide count to `1-10`
- [x] Make `minimal` the default template
- [ ] Add draft persistence
- [ ] Sync defaults across UI, client, and server

### EPIC-10: Landing And Demo Trust
- [ ] Tighten hero copy around the main work task
- [ ] Keep the primary CTA singular and obvious
- [ ] Make demos support trust, not noise

## Later

### EPIC-07: Document Upload
- [ ] Upload `DOCX`, `PDF`, `TXT`
- [ ] Parse materials into source context

### EPIC-22: Hidden Advanced Scenarios
- [ ] Add file ingestion for guided brief
- [ ] Add real prior-package reuse
- [ ] QA advanced scenario outputs

### EPIC-19: Collaboration-Safe Packaging
- [ ] Define `Private Core` / `Shared Wrapper` / `Work Edition`
- [ ] Prepare work-safe repo boundary

### EPIC-05: PDF Export
- [ ] Add `/api/export/pdf`
- [ ] Add PDF export action

### EPIC-08: Auth + Accounts
- [ ] Auth
- [ ] Presentation storage
- [ ] User history

### EPIC-09: Billing
- [ ] Payments
- [ ] Plans
- [ ] Usage tracking

### EPIC-12: Growth Mechanics
- [ ] Share flow
- [ ] Analytics
- [ ] Error monitoring

### EPIC-11: Deploy
- [x] CI + Vercel deploy wired
- [ ] Domain
- [ ] Monitoring

## Done

- [x] EPIC-23: Quick-start draft experience
- [x] EPIC-21: Decision-package reset
- [x] EPIC-20: Public QA enablement
- [x] EPIC-17: Design system upgrade
- [x] EPIC-15: Generation UX upgrade
- [x] EPIC-04: Images + PPTX export basics
- [x] EPIC-01/02/03: Core foundation

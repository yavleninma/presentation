# SlideForge - Product Strategy

> Updated: 2026-04-02 | Status: Strategic reset in progress

## Positioning

**One-liner:** SlideForge turns scattered IT updates, KPI fragments, risks, and documents into a decision package for CEOs, CFOs, steering committees, and other executive forums.

**Category claim:** not an AI presentation maker, but an AI chief-of-staff workflow for enterprise IT leadership communication.

**Core unit of value:** not "a deck", but a management package that helps the user:

- gather the point of view quickly
- translate technical material into business language
- expose status, deviations, risks, options, and recommendation
- arrive at a leadership conversation prepared for decisions

## First Wedge

**Primary ICP:** CIO-1 leader of a large transformation program or strategic IT direction inside a large Russian enterprise.

**Typical environment:**

- bank, telecom, retail, or industrial group
- many stakeholders and committees
- high political weight of materials
- constant need to speak upward in business language

**Why they care:**

- manual package assembly burns 1-2 days every cycle
- status fragments come from many owners and contradict each other
- top management punishes weak narrative more than imperfect design
- they need material that survives hard questions, not pretty slides

## Canonical V1 Scenarios

1. Steering Committee
2. Quarterly IT Review
3. Budget Defense
4. Incident / Risk Update
5. Architecture / Vendor Decision
6. Program Recovery / Rebaseline
7. Update Previous Package

## Product Laws

1. The product starts from the meeting and decision, not from slide count or theme.
2. Truth extraction comes before narrative; narrative comes before slide rendering.
3. AI must challenge weak inputs, contradictions, and vague asks.
4. Every slide must have a management role or it should not exist.
5. Headlines must contain verdicts, not topics.
6. Local regeneration must be intention-based, not random.
7. Business language beats system language; jargon belongs in appendix.
8. Regular update mode matters more than one-off generation magic.
9. The package matters more than the deck: slides, notes, appendix, follow-up logic.

## Product State After Reset

What is already live:

- scenario-first guided brief on `/`
- outline-first review with storyline options and extraction findings
- editable outline with reorder/delete/add controls before generation
- slide-by-slide streaming package generation
- slide metadata for role, archetype, verdict, question, and why-this-slide logic
- intent-based single-slide regeneration through `/api/generate/slide`
- `/demo` reframed from layout gallery into scenario-led package previews

What is still missing:

- true document/file ingestion
- real prior-package reuse and diff mode for update workflows
- export parity for the new management-package semantics
- browser-verified QA across all flagship scenarios

## Strategic Risks

1. Category drift back into "AI slide generator" language.
2. Over-investing in visual variety before fixing enterprise input depth.
3. Shipping update mode as a label without true structural reuse.
4. Letting PPTX export undermine trust after a strong in-app experience.

## Boundary Strategy

If collaboration with an employer or partner becomes necessary, default to:

- **Private Core** -> prompts, orchestration, quality logic, strategy docs
- **Shared Wrapper** -> shell, adapters, branding, integrations
- **Work Edition** -> sanitized build or repo for limited collaboration

The defense is architectural separation, not ad-hoc file hiding.

## Current Priorities

1. Harden the decision-package wedge with deeper ingestion and update mode.
2. Increase trust through browser-tested enterprise scenarios.
3. Close preview/export parity gaps.
4. Preserve the new positioning everywhere the product speaks.

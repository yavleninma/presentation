# Public Scenario Reference

Derived from the actual public app surfaces in:

- `presentations-frontend/src/app/page.tsx`
- `presentations-frontend/src/app/demo/page.tsx`
- `presentations-frontend/src/app/api/generate/route.ts`
- `presentations-frontend/src/app/api/images/search/route.ts`

## Public Surface Summary

- Public UI routes found: `/` and `/demo`
- Public UI-backed APIs found: `/api/generate` and `/api/images/search`
- No public auth flow was found in the repo
- Full generation testing on `/` depends on local `OPENAI_API_KEY` and `PEXELS_API_KEY`

## Scenario 1 - First Impression And Value Clarity On `/`

- User intent: understand what the product is and whether it is worth trying
- Entry point: open `/` on desktop
- Main steps:
  - load the page
  - scan the headline, supporting copy, prompt box, suggestion chips, slide-count control, and template picker
  - decide whether the next action is obvious
- Expected outcome: the user quickly understands that SlideForge creates presentations from a prompt and sees a clear path to try it
- Blocker:
  - blank or broken page
  - the main action is unclear
  - the product purpose is still ambiguous after a quick scan
- Friction:
  - weak hierarchy
  - unclear terminology
  - controls that feel secondary when they matter to the first decision
- Works technically but still feels bad:
  - everything renders, but the page still feels generic, risky, or low-trust
  - the CTA is visible, but the page does not create momentum to try it

## Scenario 2 - Primary CTA Path From Manual Prompt On `/`

- User intent: generate a presentation from a self-written topic
- Entry point: open `/`
- Main steps:
  - type a topic into the main textarea
  - optionally adjust slide count and template
  - click `Создать`
  - follow the flow into outline review, generation, and the finished deck
- Expected outcome: the app accepts the topic, shows believable progress, and lands in a usable deck state
- Blocker:
  - cannot submit
  - submission stalls without clear feedback
  - generation errors with no trustworthy recovery path
  - no deck appears
- Friction:
  - too much uncertainty before clicking
  - unclear loading states
  - slow or confusing transitions between plan, generation, and result
- Works technically but still feels bad:
  - generation completes, but the path feels anxious, sluggish, or overly theatrical
  - the app reaches a result, but the user still feels out of control

## Scenario 3 - Assisted CTA Path With Suggestion Chips And Controls

- User intent: start quickly without writing the prompt from scratch
- Entry point: open `/`
- Main steps:
  - click one prompt suggestion chip
  - confirm the prompt is populated
  - adjust slide count and template if useful
  - click `Создать`
- Expected outcome: suggestion chips reduce effort and move the user into generation with confidence
- Blocker:
  - chips do nothing
  - filled prompt is wrong or invisible
  - controls break submission
- Friction:
  - chips look clickable but do not clearly affect the form
  - template or slide-count controls compete with the CTA instead of supporting it
- Works technically but still feels bad:
  - the chip fills the box, but the experience still feels manual and low-leverage
  - defaults technically work, but they do not feel intentionally chosen

## Scenario 4 - Multi-Step Generation Experience

- User intent: stay confident while the deck is being assembled
- Entry point: submit a valid prompt on `/`
- Main steps:
  - watch the outline review panel
  - watch status messages and progress
  - observe the transition into live slide preview
  - confirm the user always understands what is happening next
- Expected outcome: the system feels alive, legible, and trustworthy from outline to final deck
- Blocker:
  - silent waiting
  - broken progress UI
  - slide preview never appears
  - obvious mismatch between stage labels and what the app is doing
- Friction:
  - noisy status text
  - unclear next step
  - progress that feels cosmetic rather than informative
- Works technically but still feels bad:
  - the stages exist, but the user still feels trapped in a black box
  - the outline appears, but it does not create real confidence or momentum

## Scenario 5 - Post-Generation Deck Interaction On `/`

- User intent: inspect, lightly edit, and export the generated deck
- Entry point: finish a generation run on `/`
- Main steps:
  - move between slides using arrows and thumbnails
  - inspect the right sidebar for layout, content summary, template, and speaker notes
  - try inline text editing
  - add a slide, delete a slide, and export PPTX
- Expected outcome: the user can understand and manipulate the deck without feeling lost
- Blocker:
  - navigation controls fail
  - editing does not save
  - add/delete breaks the deck
  - PPTX export button is dead or errors out immediately
- Friction:
  - editing affordance is too hidden
  - sidebars feel crowded or unclear
  - export has weak success or failure feedback
- Works technically but still feels bad:
  - the deck is editable, but the product gives little confidence that changes are safe
  - export starts, but the app does not feel polished or reassuring

## Scenario 6 - Demo Browsing On `/demo`

- User intent: inspect the slide system without committing to generation
- Entry point: open `/demo`
- Main steps:
  - browse demo slides with previous and next controls
  - switch templates
  - scan the thumbnail strip
- Expected outcome: the route works as a stable showroom for layouts and template differences
- Blocker:
  - demo route does not load
  - controls are broken
  - templates do not switch
- Friction:
  - it is hard to understand what the demo is for
  - template changes are subtle or visually weak
- Works technically but still feels bad:
  - all controls function, but the route still feels like an internal debug screen instead of a convincing showcase

## Scenario 7 - Mobile Clarity And Momentum

- User intent: understand and start the product from a small screen without losing confidence
- Entry point: open `/` on a mobile viewport
- Main steps:
  - scan the hero, textarea, chips, controls, and CTA
  - verify the primary path is still understandable
  - if feasible, start a generation run and inspect progress readability
- Expected outcome: the public flow remains clear, tappable, and emotionally coherent on mobile
- Blocker:
  - overflow or clipping that hides the CTA
  - controls too cramped to use
  - progress or outline states become unreadable
- Friction:
  - too much scrolling before the user understands the offer
  - poor spacing or hierarchy that weakens confidence
- Works technically but still feels bad:
  - the layout is responsive, but the page loses urgency or polish on mobile

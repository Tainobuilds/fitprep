# Meal Schedule — concept prototype

A working prototype of the **Meal Schedule** feature from
[`docs/meal-schedule-prd.pdf`](../docs/meal-schedule-prd.pdf) (Racheal's PRD): letting overnight
and rotating-shift workers organize their meals around their real wake/sleep routine instead of
a fixed breakfast/lunch/dinner schedule that doesn't match when they're awake.

**This is a standalone concept, not part of the FitPrep app.** It's built in Fitia's own visual
language, matching the PRD's framing: a feature Fitia itself could plausibly adopt.

> Concept prototype recreating Fitia's public meal-planning UI to demonstrate a proposed
> feature. Not affiliated with or endorsed by Fitia.

## Two real surfaces, not one guess

The PRD's own design section assumed a single dark/yellow theme based on two onboarding
screenshots. Direct research this pass found **two different real surfaces**, not one:

- **The main "Plan" screen** — light theme (cream/white cards, black bold text, gray secondary
  text, a green progress bar, yellow CTA). Confirmed by pulling the real
  `weekly-meal-plans.webp` image straight off fitia.app's own homepage.
- **The onboarding flow** — dark theme (black background, white bold headlines, gray secondary
  text, outlined nutrition stat boxes, the same yellow pill button). Confirmed from real
  screenshots of the actual Android app.

Both are real; they're just different parts of the product. This prototype matches each stage to
the surface it would actually belong to: the baseline/updated **Plan** view stays light, and the
**Meal Schedule setup/preview** flow (functionally an onboarding-style wizard) uses the dark
theme.

The one color not independently verified: the exact hex of the green progress bar (a same-origin
image read was blocked by canvas tainting). Flagged in `src/index.css` rather than presented as
confirmed. The yellow (`#FFC300`) is exact, read directly via `getComputedStyle` off Fitia's own
"Get Started" button.

## What's real vs. sample

Per the PRD's own prototype dependency: *"Use clearly identified sample meals and nutrition
data. Live Fitia APIs, account access, and production recommendation infrastructure are not
assumed available."* All meal content here is invented, clearly-fictional sample data
(`src/sampleData.ts`) — no real Fitia data, no hotlinked assets.

The **scheduling logic is real and tested**, not just a static mockup — see `src/schedule.ts` and
`tests/schedule.test.mjs`. It implements the PRD's exact acceptance scenario:

> A user wakes at 3 p.m. on September 29, works from 7 p.m. to 7 a.m., and plans to sleep at 8
> a.m. on September 30. They schedule meals at 5 p.m., 11 p.m., and 4 a.m.

## The three PRD-required prototype pieces

Per the appendix's "Use a focused prototype" guidance — one overnight example, one edit, one
error state, no backend required:

1. **The existing planner** (unchanged) — standard breakfast/lunch/dinner, light theme.
2. **Meal Schedule setup + preview, one overnight example** — wake/sleep entry, per-meal time +
   optional label, a chronological preview grouped by real calendar date before saving.
3. **The updated planner** — same meals, now grouped into one dated planning period, with a
   "next meal" indicator that has a text label (not color alone), and correctly stays visible and
   accurate after the clock crosses midnight.
4. **One error state** — equal wake/sleep times are rejected with an explicit message, never
   silently treated as a 24-hour day.
5. **One edit flow** — reopening setup preserves the saved routine and labels; editing one meal
   doesn't touch the others or lose completed context.

A meal whose time falls during the user's sleep window is flagged for **explicit confirmation**,
never silently moved or deleted — also tested directly.

## Run it

```bash
npm install
npm run dev      # http://localhost:5174
npm test         # 9 tests covering the date/midnight-crossing logic
npm run build
```

## Known gaps, matching the PRD's own Open Questions

- No accounts, no backend, no persistence — a page refresh resets everything (by design; the PRD
  explicitly says backend integration isn't required to evaluate these flows).
- The green progress-bar color is a plausible approximation, not pixel-confirmed (see above).
- Food-log/recorded-eating-time distinction, screen-reader labeling audit, and time-zone/DST
  handling are all called out as PRD Open Questions and are not built here.

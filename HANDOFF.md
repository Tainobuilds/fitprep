# FitPrep project handoff

Prepared September 24, 2026 for continued development and a teammate demo.

## Project and saved work

- Local project: `/Users/racheal.winstead/Documents/fitprep`
- Repository: https://github.com/Tainobuilds/fitprep
- Working branch: `feature/plan-my-week`
- Published branch: https://github.com/Tainobuilds/fitprep/tree/feature/plan-my-week
- Latest application/documentation commit before this handoff: `3a97cbb`.
- All seven implementation commits were successfully pushed to origin. At handoff,
  local status matched the locally recorded remote-tracking branch; no fresh remote
  fetch was performed.
- This handoff is a new local file, not part of those seven pushed commits.

## What we built

FitPrep is an original implementation inspired by one part of Fitia: meal planning.
It is a working local prototype, not a full Fitia clone, integration, or copy of
Fitia's code, branding, recipe database, or proprietary planning algorithm.

Public references used during research:
- https://fitia.app/help/articles/create-meal-plan-fitia/
- https://fitia.app/features/

Implemented workflows:
- Generate seven days of breakfast, lunch, and dinner from a selected start date.
- Set a daily calorie target and choose all foods or vegetarian meals.
- Repeat meals, rotate every three days, or rotate daily.
- Cook for one person or two people with separate calorie targets.
- View estimated calories, protein, carbohydrates, and fat for each person.
- Swap individual meals, with automatically recalculated grocery quantities.
- View recipe ingredients and cooking steps.
- Use a combined grocery checklist and a text-download action.
- View whole-week batch quantities and check off prepared recipes.
- Save one plan and its checklists in the current browser.
- Use responsive desktop and mobile layouts.

## Teammate demo: five-minute walkthrough

1. Open the frontend and choose Preferences (or Plan my week on a fresh browser).
2. Select a start date and sample calorie target. The default 2,000 kcal is a
   demonstration value, not a personalized recommendation.
3. Enable Cooking for two and use a different sample target for the partner.
4. Generate a week and switch between For you and For partner: recipes stay the
   same while portion sizes and nutrition totals change.
5. Swap a lunch and inspect the updated meal and grocery list.
6. Check off a grocery item, reload, and reopen Grocery list to show persistence.
7. Open Prep kitchen and a Batch recipe to show combined ingredient amounts.

## Findings worth discussing

- Shared recipes can support different calorie targets through individual portions.
  In this implementation, the partner's portion multiplier is partner calories
  divided by the first person's calories.
- Repeated meals can be grouped into batch quantities, and duplicate ingredients
  can be combined into a household shopping list.
- Variety is a practical tradeoff: more recipe rotation means more distinct dishes
  to prepare. Minimal variety repeats three recipes across the week.
- The current planner is deterministic. It rotates a small recipe collection and
  allocates daily calories 25% to breakfast, 35% to lunch, and 40% to dinner.
- Calorie matching is not the same as macro optimization. Protein, carbohydrate,
  and fat are reported from scaled recipes, not matched to separate targets.
- Browser storage makes a quick demonstration possible without account setup,
  but does not provide shared accounts, device syncing, or durable cloud storage.

These are implementation observations, not user-study results or claims that the
prototype reproduces Fitia's internal behavior.

## Run and verify

Use Node.js 22.12+ (24 recommended) and npm:

```bash
cd /Users/racheal.winstead/Documents/fitprep
git switch feature/plan-my-week
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173/. Vite may select another port if that port is occupied;
check the terminal output. The frontend planner works without the backend running.

```bash
cd /Users/racheal.winstead/Documents/fitprep/frontend
npm test
npm run build
```

During development, npm was absent from the shell PATH. A bundled Node executable
and a temporary npm installation were used. A new session should check its runtime
before assuming npm is available. The temporary npm directory is not a permanent
project dependency and may no longer exist.

The localhost address works only on the machine running the development server.
There is no hosted deployment. A teammate can use the pushed branch with repository
access, install dependencies, and run it locally.

## Verification and limitations

- Eight planner tests passed, covering calorie scaling, vegetarian constraints,
  variety, household grocery/batch totals, swaps, saved-data validation, invalid
  inputs, and future start dates.
- The production build passed after the final changes.
- Browser checks covered generation, partner portions, swaps, checklist persistence,
  batch details, vegetarian replanning, and future dates.
- A 390px mobile viewport had no horizontal overflow; inspected browser logs had
  no warnings or errors.
- The grocery-download action is implemented, but the automated browser did not
  confirm a download event. End-to-end download completion still needs checking.
- Nutrition values are estimates for nine original starter recipes, not a verified
  nutrition database. No allergy filtering or independent macro optimization exists.
- Only one week is saved. Generating another replaces it; swapping a meal now
  preserves unchanged shopping/prep progress and unchecks changed quantities.
  Clearing browser storage removes the saved plan.
- Data belongs to the browser profile and origin. Opening another browser or port
  will not automatically show the same saved plan.
- Batch quantities cover the whole week; users need to split cooking sessions or
  freeze later portions rather than refrigerating cooked food for a full week.
- The existing Express/Supabase scaffold is not wired to planner persistence.

## Code map

- `frontend/src/planner.ts`: recipes, generation, scaling, swaps, groceries,
  batches, and saved-plan validation.
- `frontend/src/App.tsx`: preferences, weekly view, grocery/prep screens, dialogs,
  and browser persistence.
- `frontend/src/index.css`: original responsive styling.
- `frontend/tests/planner.test.mjs`: eight regression tests.
- `README.md`: setup instructions and scope.

## Commit history and collaboration preference

The user prefers small, focused commits with detailed descriptions explaining
what changed, why it changed, validation performed, and meaningful limitations.

1. `1a4a3bd` — lock backend dependencies.
2. `37febaa` — upgrade Vite and its React plugin; lock frontend dependencies.
3. `b2f0a51` — ignore TypeScript build metadata.
4. `1b38d14` — add weekly planner logic and recipe collection.
5. `90ee6d4` — add planner regression tests.
6. `d78fd57` — build the meal-planning interface.
7. `3a97cbb` — document setup, workflows, and limitations.

The dependency upgrade used Vite 8.3.0 and @vitejs/plugin-react 6.1.1. Both
frontend and backend installs reported zero known vulnerabilities after the fix
at that time; this is not a fresh security audit.

## Starting the next conversation

Suggested opening message:

> Continue work on FitPrep in /Users/racheal.winstead/Documents/fitprep.
> Read HANDOFF.md and README.md, then inspect the current Git state before editing.
> Preserve the existing weekly planner. I prefer focused commits with detailed
> descriptions. My next change or teammate finding is: [describe it here].

No next feature has been selected yet. Ask what the user wants to explore next
rather than assuming one of the prototype limitations is the next task.

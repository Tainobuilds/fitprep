# FitPrep

**Stop cooking from scratch every day. Batch it once, eat well all week.**

## Problem

Fitness-focused individuals and couples who follow macro-based meal plans struggle to stay
consistent during busy workweeks. Standard calorie-tracking apps generate single-serving
recipes that require cooking from scratch three to four times a day — leading to meal-prep
burnout, high grocery bills, and frequent diet slip-ups. Existing single-serving trackers also
have no good way to handle two people with different macro targets sharing the same kitchen.

## Solution

FitPrep is a meal-planning app that builds weekly diets around **batch-cooked components**
instead of one-off recipes, so users spend under two hours a week in the kitchen.

**Key features:**
- **Automated batch-prep generation** — set your macro goals and prep frequency, and FitPrep
  builds a multi-day schedule around shared base components (proteins, carbs, veggies) instead
  of a new recipe for every meal.
- **Household couple macro-portioning** — two people prep the same batch of food together, and
  FitPrep calculates each person's individual serving size from their own macro targets.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite + TypeScript, Tailwind CSS |
| Backend | Node.js + Express |
| Database | Supabase (Postgres) |

## Project Structure

```
fitprep-app/
├── frontend/     # React app (Vite + TypeScript + Tailwind)
└── backend/      # Express API server
```

## Setup

Use Node.js 22.12 or newer (Node.js 24 recommended) with npm for the frontend toolchain.

**1. Clone and install dependencies**

```bash
git clone <this-repo-url>
cd fitprep-app
cd frontend && npm install
cd ../backend && npm install
```

**2. Set up environment variables**

```bash
cp .env.example .env
```

Then open `.env` and fill in your real `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`NUTRITION_API_KEY`. Never commit `.env` — it's already git-ignored.

**3. Run the app in dev mode**

In one terminal:

```bash
cd backend && npm run dev
```

In a second terminal:

```bash
cd frontend && npm run dev
```

The frontend runs on `http://localhost:5173`, the backend on `http://localhost:4000`
(or whatever `PORT` you set).

## Contributing

- `main` is always deployable — don't commit directly to it.
- Create a branch per feature or fix: `feature/short-description` (e.g. `feature/batch-plan-generator`).
- Open a pull request into `main` when your branch is ready, and get at least one review before merging.
- Keep commits small and focused, with clear messages describing *what* changed and *why*.

## Meal planner

The frontend now includes an original meal-prep workflow inspired by Fitia’s public
[planning guide](https://fitia.app/help/articles/create-meal-plan-fitia/) and
[feature list](https://fitia.app/features/).

- Select a start date, daily calorie target, food preference, and meal variety.
- Generate seven days of breakfast, lunch, and dinner; swap individual meals.
- Add a partner with a separate calorie target and view each person's portions.
- Shop from a combined ingredient list, check off items, and download a text copy.
- View batch quantities and cooking steps, and track prepared recipes.

Plans and checklists are saved in this browser's local storage. This first version
uses nine original starter recipes with estimated nutrition; it is not connected
to Fitia or a verified nutrition database. Calories scale recipe portions; protein,
carbohydrate, and fat totals are reported, not independently optimized. It supports
all-food and vegetarian plans, not allergy filtering. Recipe visuals are illustrations.
Only one week is saved at a time; generating another replaces it. Cross-device
accounts and Supabase persistence are not implemented for the planner yet.

Validation (Node.js 22.12+):

```bash
cd frontend
npm test
npm run build
```

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

## Security

- **Secrets stay server-side.** `DATABASE_URL` and `NUTRITION_API_KEY` are only ever read by the
  backend. **Never prefix a secret with `VITE_`** — Vite bundles those into the JavaScript every
  visitor downloads, so they're public even if `.env` is git-ignored.
- **The browser only talks to our backend.** Third-party calls (e.g. the nutrition API) go
  browser → our API → provider, so the key never leaves the server.
- **Supabase:** the anon key is designed to be public, but only safe with Row Level Security enabled
  on every table. Turn RLS on before storing any user data.
- **API hardening:** `helmet` security headers, CORS limited to `CORS_ORIGIN`, rate limiting
  (100 requests / 15 min / IP), a 10kb request body cap, and strict input validation.
- **Not built yet:** authentication. Routes that read or write user data (profiles, plans, partner
  sync) must verify a logged-in user before they ship.
- Run `npm audit` in both `frontend/` and `backend/` before merging.

## Contributing

- `main` is always deployable — don't commit directly to it.
- Create a branch per feature or fix: `feature/short-description` (e.g. `feature/batch-plan-generator`).
- Open a pull request into `main` when your branch is ready, and get at least one review before merging.
- Keep commits small and focused, with clear messages describing *what* changed and *why*.

# FitPrep security and PRD Pair Swap review

Reviewed September 24, 2026. Branch: `feature/plan-my-week`; application HEAD: `3a97cbb`.

## Remediation update — actions 1–3 completed locally

The findings below record the original audit. After that audit, the user authorized
only environment-file protection, saved-plan validation, and swap progress fixes:

- `.env.*` files are now ignored, with `.env.example` explicitly allowed.
  Verified root and nested environment filenames; no credential rotation or
  history rewrite was necessary based on the findings.
- Saved portions are rebuilt from validated calorie targets and eligible recipe
  IDs. Impossible calendar dates and weeks extending beyond year 9999 are rejected.
  Progress for corrected quantities is invalidated; unknown checklist IDs are
  removed. Invalid old factors clear progress because their quantities cannot
  reliably be compared. The preferences form displays validation errors.
- Swaps preserve unchanged grocery and batch checkmarks. Changed quantities are
  unchecked for review; obsolete entries are removed. The swap notification and
  README explain the new behavior.

Validation after these changes: **12/12 planner tests passed**, including both
household sizes, shared ingredients, obsolete items, saved-data repair, date
boundaries, and persistence round trips. TypeScript and the production build
passed; Git ignore checks and `git diff --check` passed. No live-browser retest
was performed for this remediation. No accounts, deletion controls, logging,
rate limiting, or paid-service integration changes were made. Changes are local
and uncommitted.

## Scope and conclusion

This review uses the user's exact five-item checklist: Secrets, Access, Input, Data, and Abuse. The earlier RSVP PRD discussion was recovered: keep meal swaps, groceries, and prep progress connected while preserving unrelated progress.

This is a local code, dependency, build, and planner-behavior review. No hosted deployment, real Supabase policies, production headers, or multi-user accounts were tested. No application code was changed. Findings distinguish current prototype limitations from future release requirements.

## Five security checks

| Check | Result | Evidence and implication |
| --- | --- | --- |
| Secrets: keep private keys on the server and out of Git history | Partial pass | No credential-pattern matches across eight locally available Git commits (148 file snapshots) or the two generated JS/CSS assets. Frontend source contains no environment-key references; the unused Supabase helper reads environment variables on the backend. `.env.example` contains placeholders. `.env` and `.env.local` are ignored, but `.env.production` and `.env.staging` are not. |
| Access: check server permissions for every protected action | Not applicable to current routes; future protection unverified | The planner has no accounts or network persistence. Express exposes only public `GET /api/health`; there are no protected actions to exercise. The Supabase helper is unused, and no schemas or row-level security policies are checked in. A household portion toggle is not account authorization. Before adding private data actions, enforce ownership on the server and test denied access with a second user. |
| Input: validate incoming data and handle database queries/page output safely | Partial pass | React renders values as text; no raw HTML/eval sinks or database queries were found in application sources. Calorie bounds, recipe eligibility, saved-plan dimensions, and JSON parsing have checks. Saved portions are not checked against calorie targets, and invalid calendar dates can pass. The health endpoint uses no user input in its response; there are no database query paths to test. |
| Data: minimize personal information and keep it out of logs | Pass for current collection/application logging; storage caveat | The planner collects calorie targets and food/household preferences, not names, emails, birth dates, or weight. It saves meals and progress locally without planner network requests. Application logging is limited to the backend startup address and a missing-configuration warning, with no plan data or key values logged. Browser storage has no user isolation or clear-plan action. Hosting/provider logs were not inspected. |
| Abuse: limit expensive requests, uploads, and paid API calls | No current paid-operation path; future controls absent | Generation and swaps run locally over nine fixed recipes and seven days. There are no upload handlers, paid nutrition/AI calls, or database operations in active routes; the nutrition API key is only a setup placeholder. Repeated Generate clicks do not call a paid service. The backend has no rate limiter, so request flooding remains possible if exposed; hosting bandwidth/compute costs and provider limits were not verified. |

Additional check outside the five-item checklist: fresh npm audits report zero known vulnerabilities for frontend and backend, including development dependencies. Production server configuration remains unverified.

Credential scanning used common private-key, cloud/GitHub/OpenAI/Supabase-secret and JWT patterns plus source review. It is not an exhaustive secret detector or a scan of remote-only Git history. No real secret values were printed. Zero advisory findings do not certify the app as vulnerability-free.

## Findings and recommended changes

### 1. Environment-file ignore gap — low current risk; fix before adding deployment credentials

`.gitignore:2–4` ignores only selected environment filenames. `git check-ignore` confirmed `.env.production` and `.env.staging` would not be ignored. Such a future file could be committed accidentally. No leaked credential was identified in this review.

Recommended change: ignore `.env.*` while explicitly allowing `.env.example`; verify the intended filenames with `git check-ignore`.

### 2. Saved-plan integrity checks are incomplete — low security severity, concrete correctness issue

`frontend/src/planner.ts:92–100` accepts any meal factor greater than zero and less than 20, regardless of the stored calorie target. In an isolated Node reproduction, a default plan with its first breakfast factor changed to 19 survived parsing and produced **11,038 kcal** for a day whose target remained **2,000 kcal**. A saved start date of `2026-02-31` also survived parsing because JavaScript normalizes the date.

This requires corrupt or manipulated local data; no remote exploit path was identified. Recommended change: reconstruct derived portions from validated settings and recipe IDs, enforce real calendar dates, and normalize checklist IDs to current ingredients/recipes. Check the last displayed date as well as the starting date.

### 3. Browser storage has no user isolation or explicit deletion — release-scope decision

`frontend/src/App.tsx:6–8,59` loads and saves the full plan in browser storage. This matches the documented prototype, but it is not a shared household account system. Add a clear-plan action and explain persistence. Before introducing private accounts, implement authenticated server access and test ownership enforcement and database policies with two separate users.

OWASP advises against storing sensitive information in localStorage because same-origin JavaScript and local browser access can read it: [HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).

### 4. Backend is a scaffold, not a verified production API

`backend/src/server.js:21–26` permits cross-origin reads and does not restrict its listening interface. CORS is not authentication; unrestricted CORS for a public health response is not itself a private-data leak. If the backend is needed for a release, verify HTTPS at the host, security headers, production error handling, endpoint-appropriate rate limits, and authentication before adding data routes. Prefer loopback binding for local-only demos. A frontend-only deployment does not need this unused backend.

Reference: [Express production security guidance](https://expressjs.com/en/advanced/best-practice-security.html).

### 5. Abuse controls must precede paid integrations

The current source has no user-triggered billable operation, upload route, or expensive server-side planner. This is a limited pass for the current prototype, not proof that a hosted demo cannot incur infrastructure charges. No load test or billing-account inspection was performed.

Before connecting a paid nutrition provider or other metered service, put calls behind server-enforced request limits, per-user quotas, bounded request sizes, and provider spending caps where supported. Reject excess work before invoking the paid service. Verify those controls with a stubbed provider so abuse tests do not themselves create charges. If uploads are added, impose size/count/type limits before accepting or processing them.

## PRD Pair Swap disconnect: confirmed, with a narrower diagnosis

The recovered prior discussion applied RSVP's connected-workflow principle to **meal swaps → groceries → prep checklists**. FitPrep does already connect the calculations: groceries and batch totals derive from the current plan. The disconnect is specifically **loss of unrelated completion state**.

`frontend/src/planner.ts:61–64` unconditionally returns `checked: []` and `prepped: []` on every swap. `frontend/src/App.tsx:93` tells the user that checklists were reset. The existing swap test explicitly expects both empty arrays, so a passing test suite currently preserves this behavior.

Reproduction against the actual planner functions:

1. Generate the default plan.
2. Check “Rolled oats, dry” and mark “Berry overnight oats” prepared.
3. Swap the first day's lunch from chicken to tofu.
4. Oat quantities remain **238.34075462854463 g** before and after, and breakfast is unchanged.
5. Both completion arrays become empty anyway.

This is a workflow/data-integrity bug, not evidence of an attacker or broken access control. Simply retaining every checkmark would create a different error: increased grocery amounts or changed batch quantities could still appear completed.

Recommended acceptance criteria:

- Preserve checkmarks for ingredients whose required quantities are unchanged.
- Require review when ingredient quantities change, including shared ingredients such as rice and oil; remove obsolete ingredient checks.
- Preserve completion for unchanged recipe batches; require review for batches whose quantities change, and remove obsolete batch IDs.
- Keep both people's portion targets and combined household totals correct.
- Preserve the resulting progress after save/reload.
- Test an unrelated breakfast, shared ingredients, both affected batches, and a two-person plan. Replace the current blanket-reset expectation.

The broader README promise is also ahead of the prototype: it describes independent macro goals and prep frequency, while the implementation scales calories and offers recipe variety. Protein/carbohydrate/fat targets, component-level reuse, and a prep-session scheduler are not implemented. The earlier exact FitPrep PRD was not available for a full requirements trace, so this is a README-to-code observation, not an attribution to an unseen PRD.

## Validation performed

- Fresh online `npm audit --json` for both lockfiles: **0 known vulnerabilities each**.
- Existing planner suite: **8/8 passed**.
- TypeScript check and Vite production build: **passed**.
- Isolated function reproductions: unrelated progress reset, inconsistent saved factor, invalid saved calendar date.
- Source review of all application files; tracked-file/history and generated-asset credential-pattern checks.
- Git ignore checks for common environment filenames.

No live-browser end-to-end test, production penetration test, database policy inspection, or hosted TLS/header verification was performed. Application source and dependencies remain unchanged; this report is the only file added by this review.

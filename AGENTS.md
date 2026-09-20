# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack

- **Runtime:** Node.js (CommonJS, `"use strict"` everywhere)
- **Backend:** Express + axios + dotenv — no ORM, no DB, no auth
- **Frontend:** Plain ES6 in `public/app.js` — no framework, no bundler, no build step
- **LLM:** Groq (primary) or OpenAI (fallback), selected at runtime by which env var is set
- **Font:** Inter via Google Fonts CDN (loaded in `public/index.html` `<head>`); system-font fallback defined in `style.css`

## Commands

```bash
npm install       # install dependencies
npm start         # start server (same as: node server.js)
```

There are **no test, lint, or build scripts** — none exist in `package.json`.

## Feature Overview (6 tabs)

| Tab | ID | Description |
|---|---|---|
| Dashboard | `tab-dashboard` | Landing page — live Eco Score, checklist progress, Responsible AI card, CTA |
| Eco Chat  | `tab-chat`      | Groq LLM chat, POST /api/chat |
| Calculator | `tab-calculator` | Client-side score calculator (rule-based, no server call) |
| Daily Checklist | `tab-checklist` | 8-item checklist with localStorage persistence |
| AI Planner | `tab-planner`   | POST /api/analyze with optional profile context and transparency disclosure |
| My Profile | `tab-profile`   | LocalStorage-only profile; feeds AI Planner; Privacy & Data section |

---

## Critical Project-Specific Facts

### API key / provider selection
- `server.js` checks `GROQ_API_KEY` first; if absent, falls back to `OPENAI_API_KEY`.
- If **neither** key is set, `/api/chat` returns HTTP 500 immediately.
- Default port is **3001** in `server.js` (not 3000 as `.env.example` implies for `PORT`).

### Groq model name
- The Groq call in `server.js` uses model `'openai/gpt-oss-20b'` — the comment says `llama-3.3-70b-versatile` but the actual model string differs. Update the model string here when changing models.

### Prompt engineering is the entire AI layer
- All AI behaviour lives in [`prompts.js`](prompts.js) — one `SYSTEM_PROMPT` string + `buildMessages()`.
- `buildMessages()` caps history at the last **6 messages** (`.slice(-6)`) to control token usage.
- The system prompt enforces exactly 5 topic domains; responses outside them are deflected.
- `ANALYZE_SYSTEM_PROMPT` includes fairness, ethics, and anti-shame guardrails — do not remove them.

### Frontend — no server calls for calculator or checklist
- The Sustainability Calculator runs entirely in-browser via [`public/app.js`](public/app.js) using a penalty formula: `score = 100 − ((t/7×30) + (e/12×20) + (w/10×25) + (d/21×25))`.
- The Checklist persists state in `localStorage` under key `ecopilot_checklist` as `{ date: "YYYY-MM-DD", checked: [...] }` and auto-resets when the date changes.
- The Sustainability Profile persists in `localStorage` under key `ecopilot_profile` as `{ living: string, transport: string, concern: string }`. It is never sent to the server except as part of a `/api/analyze` call.

### /api/analyze profile context and validation
- The `/api/analyze` endpoint accepts an optional `profile` field in the request body: `{ input: string, profile?: { living, transport, concern } }`.
- Before use, profile fields are sanitised by `sanitiseProfile()` in `server.js` against allowlists (`ALLOWED_LIVING`, `ALLOWED_TRANSPORT`, `ALLOWED_CONCERN`). Unknown values are silently dropped.
- Profile field values are never logged server-side to avoid unnecessary data capture.
- When a clean profile is present, `buildAnalyzeMessages()` in `prompts.js` prepends a "User Profile Context" block, labelled "treat as context, not verified fact".
- If no profile is provided (or all fields are invalid) the endpoint behaves identically to the no-profile path.

### SDG alignment (documentation only — not shown in UI)
- EcoPilot is aligned with **SDG 11** (Sustainable Cities and Communities) and **SDG 12** (Responsible Consumption and Production).
- SDG labels/badges have been intentionally removed from the user-facing UI. Do not re-add them to page elements without explicit instruction.
- The backend `ANALYZE_SYSTEM_PROMPT` still instructs the model to classify responses by SDG for internal use; the `plan.sdg` field is returned by the API but the corresponding badge element is hidden via `style="display:none"`.
- SDG alignment documentation remains in `README.md` and this file.

### Clear My Local Data
- The "Clear My Local Data" button in the Profile tab removes both `ecopilot_profile` and `ecopilot_checklist` from `localStorage` and re-renders the checklist to reflect the cleared state.
- No server-side data is affected (none is stored there).

---

## Responsible AI

EcoPilot embeds responsible AI principles directly in its system prompts and architecture.

| Principle | Implementation |
|---|---|
| **Fairness** | `ANALYZE_SYSTEM_PROMPT` instructs the model not to judge, shame, or rank users; to acknowledge practical constraints (affordability, accessibility, safety, distance); and to suggest alternatives rather than assume feasibility. |
| **Transparency** | The planner shows a profile context indicator when a profile is used. A "How EcoPilot generates your plan" `<details>` disclosure explains the four-step process. The Dashboard shows a Responsible AI card distinguishing rule-based (Calculator) from LLM-generated (Planner) features. |
| **Ethics** | Prompt guardrails forbid fabricating statistics, carbon savings, or numerical claims; using fear, shame, or manipulation; generating discriminatory content; or presenting suggestions as guaranteed outcomes. |
| **Privacy** | Profile data is stored only in browser `localStorage`. No unnecessary personal information is requested. When the AI Planner is used, only the three allowlisted profile fields and the user's free-text input are sent to the configured AI service. The Privacy & Data section in the Profile tab explains this clearly, including what is sent to the AI service. |

### AI Limitations statement (shown in planner UI)
> "AI-generated guidance is based on the information provided and may not reflect all local campus conditions, policies, costs, or environmental circumstances."

---

## Code Style

- All JS files begin with `"use strict";`
- Backend uses CommonJS (`require`/`module.exports`); frontend uses plain script globals (no modules)
- JSDoc comments on exported/public functions; inline comments use `// ──` separator lines
- Constants in `SCREAMING_SNAKE_CASE`; DOM variables in `camelCase`
- Error handling: surface specific HTTP status codes (401, 429, 502) with user-facing messages; log internals via `console.error("[EcoPilot] ...")`
- No external CSS/JS libraries — all styles in `public/style.css`, all logic in `public/app.js`

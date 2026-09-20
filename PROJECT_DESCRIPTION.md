# EcoPilot — Project Description

> **AI-Powered Campus Sustainability Assistant**  
> Version 1.0.0 · Node.js · Express · Groq / OpenAI · Plain ES6 Frontend

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Features & Tabs](#features--tabs)
6. [Backend API](#backend-api)
7. [Frontend Logic](#frontend-logic)
8. [AI Layer](#ai-layer)
9. [Data Storage](#data-storage)
10. [Responsible AI Principles](#responsible-ai-principles)
11. [SDG Alignment](#sdg-alignment)
12. [Configuration & Environment](#configuration--environment)
13. [Running the Project](#running-the-project)
14. [Code Conventions](#code-conventions)

---

## Overview

EcoPilot is a web application designed to help university students make more eco-friendly decisions in their daily campus life. It combines a rule-based sustainability calculator, a persistent daily checklist, a personalisable user profile, and two AI-powered features (a chat assistant and an eco action planner) — all served as a single-page app with no frontend framework and no build step.

The application is aligned with **UN Sustainable Development Goal 11** (Sustainable Cities and Communities) and **SDG 12** (Responsible Consumption and Production).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS, `"use strict"` everywhere) |
| Backend | Express 4, Axios, dotenv |
| Frontend | Plain ES6 — no framework, no bundler, no build step |
| AI Provider | Groq (primary) or OpenAI (fallback), selected at runtime |
| Font | Inter via Google Fonts CDN, system-font fallback |
| Persistence | Browser `localStorage` only — no database |

---

## Project Structure

```
EcoPilot/
├── server.js              # Express server — all backend routes
├── prompts.js             # AI system prompts + message builders
├── package.json           # Dependencies and start scripts
├── .env.example           # Environment variable template
├── public/
│   ├── index.html         # Single-page app shell (six tabs)
│   ├── app.js             # All frontend JavaScript (plain ES6)
│   ├── style.css          # All styles (no external CSS libraries)
│   └── favicon.svg        # Leaf SVG icon
├── AGENTS.md              # Project coding rules and architecture notes
└── ecopilot-upgrade-plan.md  # Detailed upgrade plan (Sustainability Profile + UI)
```

---

## Architecture

```
Browser (public/)
  ├── index.html      — static shell; six tab panels
  ├── app.js          — tab switching, calculator, checklist,
  │                     profile, planner, chat, dashboard
  └── style.css       — all styling

        │  fetch POST /api/chat
        │  fetch POST /api/analyze
        ▼

server.js (Express on port 3001)
  ├── GET  /api/health    — status check
  ├── POST /api/chat      — eco chat via LLM
  └── POST /api/analyze   — eco action planner via LLM

        │  axios POST (Groq or OpenAI)
        ▼

prompts.js
  ├── SYSTEM_PROMPT           — scoped to 5 campus sustainability topics
  ├── ANALYZE_SYSTEM_PROMPT   — structured JSON planner prompt
  ├── buildMessages()         — chat message array (history capped at 6)
  └── buildAnalyzeMessages()  — planner message array (with optional profile context)

        │
        ▼

Groq API  (model: openai/gpt-oss-20b)
   — or —
OpenAI API (model: gpt-4o-mini, fallback)
```

**Key architectural decisions:**
- No database — all user data lives in `localStorage`.
- No frontend build step — `public/` is served as static files directly.
- Provider selection is automatic: if `GROQ_API_KEY` is set it is used; otherwise `OPENAI_API_KEY` is tried. If neither is set, the API returns HTTP 500.
- Profile data is never logged server-side; profile field values are validated against allowlists before being forwarded to the LLM.

---

## Features & Tabs

### 1. Dashboard (`#tab-dashboard`)
The landing screen. Displays:
- EcoPilot branding — name, tagline, SDG alignment badges.
- **Live Eco Score** (`#dash-score`) — computed from the Calculator sliders in real time; defaults to 100 on page load (all sliders at zero = no penalty).
- **Checklist Progress** (`#dash-checklist-count`, `#dash-checklist-pct`) — read from `localStorage` on load; shows `X of 8 completed` and a percentage fill bar.
- A **Responsible AI card** — explains the difference between the rule-based Calculator and the LLM-driven Planner.
- A **CTA button** (`data-tab="planner"`) that switches directly to the AI Planner tab.

### 2. Eco Chat (`#tab-chat`)
Conversational AI chat scoped strictly to five campus sustainability domains:
1. Energy conservation
2. Water conservation
3. Waste reduction & recycling
4. Sustainable transportation
5. Environmental awareness

Features:
- Chat history rendered in a scrollable message list with role-based styling.
- Typing indicator shown while awaiting the AI response.
- Conversation history sent with each request (capped at the last 6 messages for token control).
- SDG tag (`[SDG 11]` or `[SDG 12]`) parsed from the AI response and rendered as a styled badge.
- Clear button resets the conversation and shows the welcome message.
- Off-topic questions are deflected by the AI with a redirecting reply.

### 3. Sustainability Calculator (`#tab-calculator`)
Fully client-side — no server call.

**Formula:**
```
score = 100 − ((transport/7 × 30) + (energy/12 × 20) + (waste/10 × 25) + (diet/21 × 25))
```

Four sliders (transport trips, energy hours, waste bags, meat/dairy meals per week) feed into the formula. The score updates live on slider input and is also pushed to the Dashboard's live Eco Score card. A score circle changes colour by tier (green → amber → red), a tier label is displayed, and contextual tips appear based on the weakest category.

### 4. Daily Checklist (`#tab-checklist`)
Eight built-in eco-action items plus user-defined custom actions.

- Each item is a card row with a checkbox, label, and SDG badge.
- Progress bar and counter update live as items are checked.
- State persists in `localStorage` under `ecopilot_checklist` as `{ date: "YYYY-MM-DD", checked: string[] }`.
- Automatically resets to all-unchecked when the stored date differs from today.
- Custom actions can be added via a text input; they persist separately under `ecopilot_custom_actions`.
- A manual Reset button clears all checks for the current day.
- Checklist progress is also reflected on the Dashboard summary card.

### 5. AI Planner (`#tab-planner`)
Sends the student's free-text sustainability input to `POST /api/analyze` and renders a structured plan card.

The returned plan JSON contains:
| Field | Description |
|---|---|
| `area` | Focus sustainability area (Energy, Water, Waste, Transportation, Consumption, General Sustainability) |
| `priority` | Low / Medium / High |
| `summary` | 2–3 sentence neutral situational summary |
| `recommendations` | Array of 3 practical suggestions |
| `actionForToday` | One specific action for today |
| `sdg` | SDG 11 or SDG 12 |
| `disclaimer` | Fixed AI-limitations statement |

**Profile context indicator:** when a profile is saved, a small banner above the result card shows `Analysing with your profile: [Living] | [Transport] | [Concern]`. If no profile is saved, the banner is hidden.

A `<details>` disclosure block explains how EcoPilot generates plans (four-step process) for full transparency.

### 6. My Profile (`#tab-profile`)
Stores three pieces of information in `localStorage`:

| Field | Options |
|---|---|
| Campus Living | Hostel, Day Scholar |
| Primary Transport | Walk, Bicycle, Bus, Two-wheeler, Car |
| Main Sustainability Concern | Energy, Water, Waste, Transportation, Responsible Consumption, General Sustainability |

- **Save Profile** — persists to `localStorage`; shows inline "Profile saved!" confirmation (no `alert()`).
- **Reset Profile** — removes the key and resets all form controls.
- **Clear My Local Data** — removes both `ecopilot_profile` and `ecopilot_checklist` from `localStorage` and re-renders the checklist.
- A Privacy & Data section explains exactly what is stored and what is sent to the AI service.

---

## Backend API

### `GET /api/health`
Returns `{ status: "ok", project: "EcoPilot" }`. Used to verify the server is running.

---

### `POST /api/chat`
**Request body:**
```json
{
  "message": "How can I save energy in my hostel room?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```

**Response:**
```json
{ "reply": "Here are some energy-saving tips... [SDG 12]" }
```

**Error codes:**
- `400` — message missing or empty
- `401` — invalid API key
- `429` — LLM rate limit hit
- `500` — no API key configured
- `502` — LLM service unreachable or unexpected response

---

### `POST /api/analyze`
**Request body:**
```json
{
  "input": "I drive to campus every day and leave my AC on all night.",
  "profile": {
    "living": "Hostel",
    "transport": "Two-wheeler",
    "concern": "Energy"
  }
}
```
`profile` is entirely optional. All three profile fields are validated against server-side allowlists (`ALLOWED_LIVING`, `ALLOWED_TRANSPORT`, `ALLOWED_CONCERN`) via `sanitiseProfile()` — unknown values are silently dropped. Profile values are never logged.

**Response:**
```json
{
  "plan": {
    "area": "Energy",
    "priority": "High",
    "summary": "...",
    "recommendations": ["...", "...", "..."],
    "actionForToday": "...",
    "sdg": "SDG 12",
    "disclaimer": "AI-generated guidance is based on..."
  }
}
```

**Error codes:** same as `/api/chat`, plus `502` for JSON parse failure.

---

## Frontend Logic

All frontend code lives in [`public/app.js`](public/app.js). Notable functions:

| Function | Purpose |
|---|---|
| `activateTab(target)` | Switches visible tab panel and active nav button |
| `appendMessage(role, text)` | Renders a chat bubble; parses `[SDG NN]` into a badge span |
| `sendMessage()` | Validates input, calls `POST /api/chat`, renders reply |
| `calculateScore(t, e, w, d)` | Applies the penalty formula; returns 0–100 |
| `updateCalculator()` | Reads sliders, computes score, updates circle/tier/tips/dashboard |
| `renderChecklist()` | Builds checklist DOM from actions + custom actions |
| `toggleItem(id)` | Checks/unchecks an item; saves to localStorage |
| `loadChecked()` / `saveChecked()` | localStorage read/write with date-reset logic |
| `loadCustomActions()` / `saveCustomActions()` | Custom actions persistence |
| `submitPlan()` | Reads profile, calls `POST /api/analyze`, renders plan card |
| `renderPlan(plan)` | Populates all plan card fields in the DOM |
| `loadProfile()` / `saveProfile()` | localStorage read/write for profile data |
| `renderProfileForm()` | Pre-fills profile form controls from stored data |
| `resetProfileForm()` | Clears form controls to defaults |
| `updateDashboardScore(score, tier)` | Updates the Dashboard's live score display |
| `updateDashboardChecklist(done, total, pct)` | Updates the Dashboard's checklist summary |

---

## AI Layer

All AI behaviour is defined in [`prompts.js`](prompts.js).

### `SYSTEM_PROMPT`
Used by `/api/chat`. Restricts EcoPilot to five campus sustainability topics, requires bullet-point answers with a "one action today" close, tags each response with an SDG label, and forbids fabricating data or generating off-topic content.

### `ANALYZE_SYSTEM_PROMPT`
Used by `/api/analyze`. Instructs the model to return a single strict JSON object (no prose, no markdown fences) matching a fixed seven-field schema. Embeds fairness guardrails (no shaming, acknowledge constraints), ethics guardrails (no fabricated statistics, no fear-based language), and SDG classification rules.

### `buildMessages(history, userMessage)`
Assembles the chat messages array: system prompt + last 6 history messages + current user message. The **6-message cap is intentional** for token budget control.

### `buildAnalyzeMessages(userInput, profile?)`
Assembles the planner messages array: system prompt + a single user message. When a valid `profile` is provided, a clearly-labelled "User Profile Context" block is prepended to the user message so the LLM can give more relevant advice. The block is explicitly labelled *"treat as context, not verified fact"*.

---

## Data Storage

All persistence is in browser `localStorage`. No server-side storage exists.

| Key | Schema | Description |
|---|---|---|
| `ecopilot_checklist` | `{ date: "YYYY-MM-DD", checked: string[] }` | Daily checklist state; auto-resets on date change |
| `ecopilot_custom_actions` | `string[]` | User-defined checklist actions |
| `ecopilot_profile` | `{ living: string, transport: string, concern: string }` | Sustainability profile; feeds AI Planner |

> ⚠️ **Schema stability note:** changing the shape of `ecopilot_checklist` will silently break persistence for existing users whose data is already stored under the old format.

---

## Responsible AI Principles

| Principle | Implementation |
|---|---|
| **Fairness** | `ANALYZE_SYSTEM_PROMPT` instructs the model not to judge, shame, or rank users; to acknowledge practical constraints (affordability, accessibility, safety, distance); and to suggest alternatives rather than assume feasibility. |
| **Transparency** | The Planner shows a profile-context indicator when a profile is active. A `<details>` disclosure explains the four-step plan generation process. The Dashboard shows a Responsible AI card distinguishing the rule-based Calculator from the LLM-driven Planner. |
| **Ethics** | Prompt guardrails forbid fabricating statistics, carbon savings, or numerical claims; using fear, shame, or manipulation; generating discriminatory content; or presenting suggestions as guaranteed outcomes. |
| **Privacy** | Profile data is stored only in `localStorage`. No unnecessary personal information is requested. When the AI Planner is used, only the three allowlisted profile fields and the user's free-text input are sent to the configured AI service. Profile field values are never logged server-side. |

**AI Limitations statement (shown in Planner UI):**
> *"AI-generated guidance is based on the information provided and may not reflect all local campus conditions, policies, costs, or environmental circumstances."*

---

## SDG Alignment

EcoPilot is aligned with two UN Sustainable Development Goals:

| SDG | Label | Relevance |
|---|---|---|
| SDG 11 | Sustainable Cities and Communities | Campus transport, green spaces, infrastructure |
| SDG 12 | Responsible Consumption and Production | Energy, water, waste, consumption habits |

SDG labels are used internally in AI responses and returned in the `plan.sdg` API field. The corresponding UI badge element is present in the DOM but hidden (`display: none`) — it is not shown in the current UI.

---

## Configuration & Environment

Copy `.env.example` to `.env` and fill in at least one API key:

```env
# Option A — Groq (free tier, recommended)
GROQ_API_KEY=your_groq_api_key_here

# Option B — OpenAI fallback
# OPENAI_API_KEY=your_openai_api_key_here

# Optional — port override (server defaults to 3001)
PORT=3001
```

> **Note:** `.env.example` shows `PORT=3000` but `server.js` defaults to `3001`. Set `PORT=3001` in your `.env` to keep them consistent.

**Provider selection logic** (in `server.js`):
1. If `GROQ_API_KEY` is set → use Groq (`openai/gpt-oss-20b`, max 512/768 tokens).
2. Else if `OPENAI_API_KEY` is set → use OpenAI (`gpt-4o-mini`, same limits).
3. Else → return HTTP 500 immediately.

---

## Running the Project

```bash
# Install dependencies
npm install

# Start the server
npm start
# → 🌿 EcoPilot is running at http://localhost:3001
```

No build step is required. Open `http://localhost:3001` in any modern browser.

---

## Code Conventions

- All `.js` files begin with `"use strict";`
- Backend uses **CommonJS** (`require` / `module.exports`); frontend uses plain script globals (no ES modules)
- **JSDoc comments** on all exported/public functions
- Inline comments use `// ──` separator lines
- Constants in `SCREAMING_SNAKE_CASE`; DOM variables in `camelCase`
- Error handling surfaces specific HTTP status codes (`401`, `429`, `502`) with user-facing messages; internals logged via `console.error("[EcoPilot] ...")`
- No external CSS or JS libraries — all styles in `public/style.css`, all logic in `public/app.js`
- No test framework — there are no automated tests; `package.json` has no `test` script
- No bundler, transpiler, or `npm run build` — the frontend must remain plain ES6

---

*EcoPilot is a campus sustainability tool built with Node.js, Express, and vanilla ES6. All AI behaviour is governed by responsible-AI prompt guardrails embedded directly in the system prompts.*

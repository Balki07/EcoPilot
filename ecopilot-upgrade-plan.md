# EcoPilot Upgrade Plan — Sustainability Profile + UI Redesign

## Overview

Two coordinated upgrades to the existing EcoPilot web application:

1. **Sustainability Profile** — A new "My Profile" tab that stores campus living, transport, and sustainability concern in `localStorage`. The saved profile is included as optional context when calling `/api/analyze`, so the AI Eco Action Planner can generate more relevant advice. When a profile is active, a small context indicator is shown above the result card in the planner.

2. **Professional UI Redesign** — A comprehensive visual overhaul of all **six** tabs (a new Dashboard is added as the first tab) using a polished, modern sustainability design language. No framework changes, no new back-end routes beyond what Upgrade 1 adds, and no changes to existing functionality or data flow.

**Files to modify:** `server.js`, `prompts.js`, `public/index.html`, `public/app.js`, `public/style.css`
**No new files required** — all additions fit within the existing file set.

### Confirmed Design Decisions
- **Dashboard tab** is the new first tab; it shows EcoPilot branding, live Eco Score (computed from calculator sliders, defaulting to 100 at page load since sliders start at 0), checklist progress (from localStorage), SDG badges, and a CTA button to the AI Planner.
- **Profile context indicator** — when a profile is saved, a small banner "Analysing with your profile: [Living] | [Transport] | [Concern]" appears above the planner result card each time an analysis is run.
- **Eco Score on Dashboard** — always computed and shown (default 100); updates live as the user adjusts Calculator sliders.
- **Checklist progress on Dashboard** — read from `localStorage` on page load; shows `X of 8` and percentage.

---

## Architecture Notes (from code research)

- `/api/analyze` currently accepts `{ input: string }`. It must be extended to also accept `{ input: string, profile?: { living, transport, concern } }` — profile is entirely optional.
- `buildAnalyzeMessages(userInput)` in `prompts.js` is the only place where the LLM context is assembled for the planner — this is the correct place to inject profile context.
- The Groq API key never reaches the browser; the profile data is sent only to the already-trusted `/api/analyze` endpoint, which is correct.
- The profile is stored in `localStorage` under a new key `ecopilot_profile` as a plain JSON object `{ living, transport, concern }`. It is read in `app.js` immediately before each `/api/analyze` call.
- Tab switching uses CSS `active` class toggled by `data-tab` attribute — adding a fifth "profile" tab requires one new `<button data-tab="profile">` and one new `<section id="tab-profile">`.
- `AGENTS.md` must be updated to document the new profile key and the new `profile` field on `/api/analyze`.

---

## Sub-Task 1 — Sustainability Profile: Data Layer and Server Integration

**Status:** [ ] pending

**Intent**  
Establish the profile's data contract end-to-end: localStorage key/schema, the `/api/analyze` body extension, and the server-side prompt injection. This is done first so the AI integration exists before the UI is built.

**Expected Outcomes**
- `prompts.js` exports an updated `buildAnalyzeMessages(userInput, profile)` that prepends a "User Profile Context" block to the user message when a profile is provided, and behaves identically to today when `profile` is `null`/`undefined`.
- `server.js`'s `/api/analyze` handler reads an optional `profile` field from `req.body` and forwards it to `buildAnalyzeMessages`.
- The profile context sent to the LLM is clearly labelled "User Profile Context (provided by the user, treat as context not verified fact)" and includes only the three fields.
- Existing behaviour with no profile is unchanged — no breaking change to the endpoint contract.

**Todo List**
1. In `prompts.js`: Update `buildAnalyzeMessages(userInput, profile)` to accept a second optional `profile` argument. When profile is present, prepend a structured context block to the `user` message content before the student's actual input. Export signature stays `buildAnalyzeMessages`.
2. In `server.js`: Destructure `profile` from `req.body` in the `/api/analyze` handler (no validation needed — undefined is safe). Pass it to `buildAnalyzeMessages(input.trim(), profile)`.
3. In `AGENTS.md`: Add a note documenting the new `profile` field on `/api/analyze` and the `ecopilot_profile` localStorage key.

**Relevant Context**
- `prompts.js` line 93: `function buildAnalyzeMessages(userInput)` — add second param here.
- `server.js` line 117–118: `const { input } = req.body` — add `profile` here.
- `server.js` line 131: `buildAnalyzeMessages(input.trim())` — pass profile here.

---

## Sub-Task 2 — Sustainability Profile + Dashboard: HTML Structure

**Status:** [x] done

**Intent**
Add the Dashboard as the new first tab and the Profile as the new sixth tab in `index.html`. No JS logic yet — just the static structure that the CSS and JS will target.

**Expected Outcomes**
- A new first tab button `<button class="tab-btn active" data-tab="dashboard">` and `<section id="tab-dashboard" class="tab-panel active">` are added. The existing "Eco Chat" tab loses its `active` default (Dashboard becomes the landing screen).
- The Dashboard section contains: EcoPilot hero block (name, tagline, SDG badges), a live Eco Score card (with `id="dash-score"` for JS to update), a checklist progress summary card (with `id="dash-checklist-progress"`), and a CTA `<button data-tab="planner">` that switches to the planner tab.
- A sixth tab button `<button class="tab-btn" data-tab="profile">` and `<section id="tab-profile" class="tab-panel">` are added with: campus living radio group (Hostel / Day Scholar), transport radio group (Walk / Bicycle / Bus / Two-wheeler / Car), sustainability concern select, Save Profile button, and Reset Profile button.
- All form controls have proper `id`, `name`, `aria-label`, and `<label>` elements for accessibility.
- A `<div id="planner-profile-context" hidden>` placeholder is added inside the planner section — it will display the active profile indicator.

**Relevant Context**
- `index.html` line 29–42: existing tab nav — Dashboard button prepended, Profile button appended.
- `index.html` line 50: `<section id="tab-chat">` currently has `active` — this moves to the new Dashboard section.
- `index.html` line 265–266: end of last `</section>` before `</main>` — Profile section appended here.

---

## Sub-Task 3 — Sustainability Profile + Dashboard: JavaScript Logic

**Status:** [x] done

**Intent**
Implement all profile frontend behaviour and Dashboard live-update logic in `app.js`.

**Expected Outcomes**
- `PROFILE_KEY = "ecopilot_profile"` constant defined.
- `loadProfile()` reads and parses the key; returns `null` if absent or invalid.
- `saveProfile(data)` persists `{ living, transport, concern }` to localStorage.
- `resetProfile()` removes the key and resets all form controls to their default state.
- `renderProfileForm()` pre-fills controls from the stored profile on page load.
- Dashboard score (`#dash-score`) is set to the current calculator score on page load and updated whenever sliders change.
- Dashboard checklist progress (`#dash-checklist-progress`) reads from localStorage on page load.
- `submitPlan()` reads the profile from localStorage and includes it as `profile` in the `fetch("/api/analyze")` body — only the three fields, no PII.
- After analysis, if a profile is active, `#planner-profile-context` is shown with "Analysing with your profile: [Living] | [Transport] | [Concern]"; it is hidden if no profile exists.
- A visible "Profile saved!" inline confirmation message appears after Save (no `alert()`).
- If no profile is saved, `/api/analyze` is called without a `profile` field — existing behaviour preserved.
- Tab switching still works for all six tabs including Dashboard.

**Relevant Context**
- `app.js` line 523–561: `submitPlan()` — add profile read and body injection here.
- `app.js` lines 257–308: `updateCalculator()` — call a `updateDashboardScore()` helper from here.
- `app.js` lines 345–363: `loadChecked()`/`saveChecked()` — pattern to follow for profile persistence.

---

## Sub-Task 4 — Professional UI Redesign: CSS

**Status:** [x] done

**Intent**
Replace the existing `style.css` with a complete redesign that achieves the visual goals while keeping all existing class names and IDs functional. All existing HTML element/class targets must continue to work — no class renames.

**Expected Outcomes**
- Google Fonts `Inter` loaded via `<link>` in `index.html` `<head>`, with system-font fallback in CSS.
- Refined CSS custom properties (`--green-dark`, `--green-mid`, etc.) with richer palette: deeper greens, warmer neutral background (#f8faf8), white card surfaces, refined shadow tokens.
- Header: taller, more typographically prominent, clean wordmark with leaf icon.
- Navigation: horizontal pill-style tabs with clear active state; collapses gracefully on mobile; all six tabs (Dashboard, Eco Chat, Calculator, Daily Checklist, AI Planner, My Profile) display cleanly.
- All tab panels rendered as white cards with consistent 24px padding, rounded corners (12px), and a subtle box shadow.
- **Dashboard**: hero section with large EcoPilot name, tagline, SDG badges; two stat cards side-by-side (Eco Score, Checklist Progress); CTA button prominent.
- Calculator: score circle is larger and more prominent; tier label is styled with colour-coded badges; tips section uses a clean list with left-accent border.
- Checklist: progress bar is taller with rounded ends and a green fill; each checklist item is a card row with checkbox, label, and SDG badge aligned cleanly; checked state uses a green background tint and strikethrough.
- AI Planner: result card has distinct section dividers; area/priority badges are pill-shaped; action-for-today box has a strong green left-border accent; disclaimer is styled in muted italics. Profile context indicator is styled as a small muted chip above the result.
- Profile: form controls use consistent bordered inputs/radio groups; Save button uses primary green; Reset uses a muted ghost style; inline "Profile saved!" confirmation styled in green.
- Footer: clean, centred, smaller.
- Full responsive support: single-column stacking below 680px; mobile nav wraps cleanly.
- Focus styles are visible (outline ring, not removed).
- No excessive animations; no emoji-only visual communication for meaning.

**Relevant Context**
- `style.css` — full replacement; all existing selector names must be preserved so JS class-manipulation (e.g., `score-circle.amber`, `planner-priority-badge.priority-high`) continues to work.
- `index.html` `<head>` — add `<link>` for Google Fonts Inter before `<link rel="stylesheet">`.

---

## Sub-Task 5 — Professional UI Redesign: HTML Updates

**Status:** [x] done

**Intent**  
Bring `index.html` structure in line with the redesign — improved semantic grouping, richer dashboard elements on the default landing view, and any structural additions needed by the new CSS (e.g., wrapper divs for the score card, profile badge in the header).

**Expected Outcomes**
- Header optionally shows a compact "Your Eco Score: N/A" or live score chip if the calculator has been used (JS-driven, not static).
- Navigation labels are clean text (emoji can be used sparingly for identification, not decoration overload).
- Calculator section: score circle wrapped with descriptive tier and SDG relationship text as specified.
- Checklist section: progress bar header shows `X of 8` count and `X%` clearly; footer note updated.
- Planner section: no structural changes needed beyond what Sub-Task 2 added.
- Profile section: complete HTML from Sub-Task 2 is in place.
- Footer text updated to include "My Profile" among the listed features.
- `lang` attribute on `<html>` confirmed as `en`.

**Relevant Context**
- `index.html` — targeted additions only; do not restructure existing working sections.

---

## Sub-Task 6 — Final Integration, Cross-Feature Wiring and AGENTS.md Update

**Status:** [x] done

**Intent**  
Verify all five features work together, wire up any remaining cross-feature touches (e.g., checklist progress shown in header or dashboard summary if planned), and update `AGENTS.md` to reflect the new feature set accurately.

**Expected Outcomes**
- All five tabs load and function correctly.
- Profile save/reset works end-to-end.
- AI Planner sends profile context to the server when a profile is saved; omits it when not.
- Calculator score and checklist progress display correctly with the new CSS.
- `AGENTS.md` updated: new localStorage key `ecopilot_profile`, new `profile` field on `/api/analyze`, updated feature list, note about the fifth tab.
- No console errors on clean page load.

**Relevant Context**
- `AGENTS.md` — update the architecture notes and feature list sections.
- `server.js` and `prompts.js` — confirm no regressions from Sub-Task 1 changes.

---

## Data Flow Diagram

```
[Browser localStorage]
  ecopilot_profile: { living, transport, concern }
         |
         | read on planner submit
         v
[app.js — submitPlan()]
  fetch POST /api/analyze
  body: { input: "...", profile: { living, transport, concern } | undefined }
         |
         v
[server.js — /api/analyze handler]
  buildAnalyzeMessages(input, profile)
         |
         v
[prompts.js — buildAnalyzeMessages()]
  system: ANALYZE_SYSTEM_PROMPT
  user:   [Profile Context block if profile present]
          [Student's free-text input]
         |
         v
[Groq / OpenAI LLM]
         |
         v
[server.js — returns { plan: {...} }]
         |
         v
[app.js — renderPlan()]
  Updates result card in DOM
```

---

## What Is NOT Changing

- Port (3001)
- `/api/chat` endpoint — unchanged
- `/api/health` endpoint — unchanged
- Groq model string — unchanged
- Calculator formula — unchanged
- Checklist `ecopilot_checklist` localStorage key and date-reset behaviour — unchanged
- SDG tag rendering in chat (`[SDG 11]` / `[SDG 12]` parsing) — unchanged
- `SCREAMING_SNAKE_CASE` constants, `"use strict"` pattern, JSDoc style — unchanged
- `.bob/` directory — untouched
- No new npm dependencies

---

## Testing Steps

1. **Server starts cleanly** — `npm start` shows `🌿 EcoPilot is running at http://localhost:3001`.
2. **Health check** — `GET /api/health` returns `{ status: "ok" }`.
3. **Eco Chat** — Send a message; confirm bot replies with SDG tag rendered as styled span.
4. **Calculator** — Move all sliders; confirm score updates, tier changes, tips appear.
5. **Checklist** — Check items; confirm progress bar and counter update; refresh page and confirm items persist; wait (or simulate) day change and confirm reset.
6. **AI Planner (no profile)** — Submit text; confirm plan card renders with all 7 fields.
7. **Profile — Save** — Select options, click Save; confirm localStorage `ecopilot_profile` key is set; refresh page and confirm form pre-fills.
8. **Profile — Reset** — Click Reset; confirm localStorage key is removed and form resets.
9. **AI Planner (with profile)** — With a profile saved, submit planner text; confirm the AI response reflects the profile context (e.g., hostel + two-wheeler yields energy/transport-aware advice).
10. **Responsive** — Resize browser to 375px wide; confirm all tabs, forms, and cards remain usable.
11. **Accessibility** — Tab through all controls; confirm focus rings are visible; confirm all inputs have labels.

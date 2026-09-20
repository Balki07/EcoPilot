# EcoPilot 🌿

**AI-Powered Campus Sustainability Assistant**

> An AI for Sustainability project aligned with **SDG 11: Sustainable Cities and Communities** and **SDG 12: Responsible Consumption and Production**.

---

## Overview

EcoPilot is a lightweight web application that helps university students make more sustainable decisions in their daily campus life. It uses conversational AI (prompt engineering — no model training), pure JavaScript logic, and browser storage to deliver practical sustainability tools.
---

## Features

| Feature | How it works |
|---------|-------------|
| 🏠 **Dashboard** | Landing screen with live Eco Score, checklist progress, Responsible AI principles, and a CTA to the AI Planner. |
| 💬 **Eco Chat Assistant** | Conversational AI powered by a scoped system prompt. Answers questions on energy, water, waste, transport, and environmental awareness. |
| 📊 **Sustainability Calculator** | Four sliders representing daily habits. A rule-based penalty formula produces a score (0–100) with context-aware tips. Runs entirely in the browser — no server call. |
| ✅ **Daily Eco Checklist** | Eight sustainable campus actions. Progress is saved in `localStorage` and resets automatically each day. |
| 🗺️ **AI Eco Action Planner** | Describe your campus habits and receive an AI-generated structured sustainability plan. Optionally uses your saved profile as context. |
| 👤 **My Profile** | Optional campus context (living, transport, concern). Stored only in browser `localStorage`. Feeds the AI Planner when present. Includes a Privacy & Data explanation and a Clear My Local Data control. |

---

## Architecture

```
Browser (HTML + CSS + JS)
│
├── Dashboard   → Rule-based score + localStorage read (no server call)
├── Eco Chat    → POST /api/chat   → Node.js/Express → LLM API (Groq / OpenAI)
├── Calculator  → Pure JavaScript (no server call)
├── Checklist   → localStorage only (no server call)
├── AI Planner  → POST /api/analyze → Node.js/Express → LLM API (Groq / OpenAI)
└── My Profile  → localStorage only (no server call)
```

---

## Project Structure

```
EcoPilot/
├── public/
│   ├── index.html          ← Single-page shell with six tab panels
│   ├── style.css           ← All styles; green-themed, responsive, Inter font
│   └── app.js              ← All frontend logic
├── server.js               ← Express server; /api/chat and /api/analyze routes
├── prompts.js              ← System prompts and message-builder functions
├── .env.example            ← Template for your API key
├── package.json
├── AGENTS.md               ← Developer/agent guidance
└── README.md
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API key

Copy `.env.example` to a new file called `.env`:

```bash
copy .env.example .env
```

Open `.env` and paste your API key.

**Option A – Groq (recommended, free tier):**
Get a key at [console.groq.com](https://console.groq.com)
```
GROQ_API_KEY=your_groq_api_key_here
```

**Option B – OpenAI:**
Get a key at [platform.openai.com](https://platform.openai.com)
```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start the server

```bash
npm start
```

### 4. Open in browser

```
http://localhost:3001
```

The Calculator, Checklist, and Dashboard work immediately. Chat and AI Planner require a valid API key in `.env`.

---

## How the AI Works (Prompt Engineering)

EcoPilot's AI behaviour is defined entirely by **system prompts** in [`prompts.js`](./prompts.js). There is no model training, fine-tuning, or dataset involved.

**Eco Chat system prompt:**
- Restricts EcoPilot to five sustainability domains only
- Explicitly forbids fabricating statistics
- Instructs polite deflection for off-topic queries

**AI Planner system prompt (`ANALYZE_SYSTEM_PROMPT`):**
- Returns a strict JSON object with seven fields
- Includes fairness guardrails — no judging, shaming, or ranking the user's choices
- Acknowledges real student constraints (affordability, accessibility, safety, distance)
- Forbids fabricated statistics, carbon claims, or guaranteed outcomes
- Forbids fear, shame, or manipulative framing
- Instructs the model to recommend verifying campus-specific details with the relevant authority

Conversation history (up to 6 messages) is sent with each chat request to maintain context within a session. History is cleared on page refresh — intentionally.

---

## Sustainability Calculator — Formula

```
penalty = (transport/7 × 30) + (energy/12 × 20) + (waste/10 × 25) + (diet/21 × 25)
score   = clamp(100 − penalty, 0, 100)
```

| Score | Tier |
|-------|------|
| 80–100 | Eco Champion |
| 60–79  | On Track |
| 40–59  | Needs Work |
| 0–39   | High Impact |

The Calculator is a **rule-based** tool — it is not AI-generated. The score is a simplified indicator of sustainability habits, not a verified environmental measurement.

---

## Responsible AI

| Principle | How EcoPilot addresses it |
|-----------|--------------------------|
| **Fairness** | AI recommendations respect the student's context without judging choices. Practical constraints (cost, distance, availability, safety) are acknowledged. Alternatives are offered rather than infeasible switches assumed. |
| **Transparency** | AI-generated content is clearly labelled. The planner shows what profile context is being used. A "How EcoPilot generates your plan" disclosure explains the four-step process. The Dashboard distinguishes rule-based (Calculator) from LLM-generated (Planner) features. |
| **Ethics** | The AI prompt forbids fabricating statistics, carbon savings, or environmental claims. It forbids using fear, shame, or manipulation. Recommendations are framed as suggestions — not requirements or guaranteed outcomes. |
| **Privacy** | Profile data is stored only in browser `localStorage`. No server-side user data is stored. Only the three allowlisted profile fields and the user's free-text input are sent to the AI service. A "Clear My Local Data" control removes all EcoPilot localStorage data. |
| **AI Limitations** | *"AI-generated guidance is based on the information provided and may not reflect all local campus conditions, policies, costs, or environmental circumstances."* |

---

## SDG Alignment

EcoPilot is aligned with:

- **SDG 11 – Sustainable Cities and Communities:** Campus transport, energy infrastructure, green spaces, waste facilities
- **SDG 12 – Responsible Consumption and Production:** Recycling habits, plastic reduction, sustainable diet choices, consumption awareness

> SDG labels are not shown in the user-facing interface in order to keep the UI clean and professional. SDG alignment is documented here and in `AGENTS.md`.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and static file serving |
| `axios` | HTTP client for LLM API calls |
| `dotenv` | Loads API key from `.env` file |

No frontend dependencies. No build tools. No bundler.

---

## License

MIT — free to use, modify, and share.

# 🌿 EcoPilot

## AI-Powered Campus Sustainability Assistant

> A practical AI-powered web application that helps university students turn sustainability awareness into simple, realistic everyday actions.

**Primary SDG:** SDG 12 – Responsible Consumption and Production  
**Secondary SDG:** SDG 11 – Sustainable Cities and Communities

---

## 🚀 Live Demo

**Live Application:**  
https://ecopilot-vufo.onrender.com

**GitHub Repository:**  
https://github.com/Balki07/EcoPilot

---

## 📌 Project Overview

EcoPilot is a lightweight web application designed to help college and university students make more responsible sustainability choices in their everyday campus life.

The project focuses on a common gap:

> Students may understand that sustainability is important, but often need practical, personalized and achievable guidance to turn that awareness into consistent action.

EcoPilot combines:

- 🤖 Prompt-engineered AI
- 📊 Rule-based sustainability scoring
- ✅ Daily sustainability actions
- 👤 Optional campus-context personalization
- 🔐 Privacy-conscious browser storage
- ♻️ Responsible AI principles

The application does not train or fine-tune an AI model. Instead, it uses structured prompting and server-side AI integration to generate practical sustainability guidance.

---

# 🎯 Problem Statement

College students make many everyday decisions involving:

- Energy consumption
- Water usage
- Transportation
- Plastic and waste
- Food and consumption
- Electronic device usage

Although sustainability awareness is increasing, students may not always know:

- What actions they can realistically take
- Which changes should be prioritized
- How to adapt sustainability practices to their living situation
- How to maintain sustainable habits consistently

### EcoPilot addresses this gap by helping students move from:

**Awareness → Understanding → Practical Action**

---

# 🌍 SDG Alignment

## Primary: SDG 12 – Responsible Consumption and Production

EcoPilot supports responsible consumption through:

- Reducing single-use plastic
- Encouraging waste-conscious habits
- Promoting responsible purchasing
- Supporting sustainable everyday consumption decisions
- Encouraging students to reduce unnecessary resource use

## Secondary: SDG 11 – Sustainable Cities and Communities

EcoPilot also supports sustainable campus communities through:

- Sustainable transportation choices
- Energy-conscious campus habits
- Water conservation
- Waste awareness
- Community-oriented sustainability practices

---

# ✨ Key Features

| Feature | Description |
|---|---|
| 🏠 **Dashboard** | Displays Eco Score, checklist progress and sustainability guidance |
| 💬 **Eco Chat Assistant** | Conversational AI for sustainability questions |
| 📊 **Sustainability Calculator** | Rule-based behavioral sustainability indicator |
| ✅ **Daily Eco Checklist** | Helps students build consistent sustainable habits |
| 🤖 **AI Eco Action Planner** | Generates structured, personalized sustainability plans |
| 👤 **Sustainability Profile** | Provides optional campus context to the AI Planner |
| 🔐 **Privacy Controls** | Browser-only profile storage and local-data deletion |
| ♻️ **Responsible AI** | Fairness, transparency, ethics and privacy guardrails |

---

# 🤖 How the AI Works

EcoPilot uses prompt engineering rather than model training.

### AI Architecture

```text
User
 │
 ▼
EcoPilot Web Interface
 │
 ├───────────────┐
 │               │
 ▼               ▼
Eco Chat       AI Planner
 │               │
 ▼               ▼
/api/chat      /api/analyze
 │               │
 └───────┬───────┘
         ▼
   Node.js / Express
         │
         ▼
      Groq API
         │
         ▼
   AI-generated guidance

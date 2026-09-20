"use strict";

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const { buildMessages, buildAnalyzeMessages } = require("./prompts");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", project: "EcoPilot" });
});

// ─── Chat Endpoint ─────────────────────────────────────────────────────────────
// POST /api/chat
// Body: { message: string, history: [{role, content}, ...] }
// Returns: { reply: string }
app.post("/api/chat", async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "message is required" });
  }

  // Detect which provider to use based on available env variables
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return res.status(500).json({
      error:
        "No LLM API key configured. Please set GROQ_API_KEY or OPENAI_API_KEY in your .env file.",
    });
  }

  const messages = buildMessages(history, message.trim());

  try {
    let reply;

    if (groqKey) {
      // ── Groq (llama-3.3-70b-versatile — fast, free tier) ────────────────────
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: 'openai/gpt-oss-20b',
          messages,
          max_tokens: 512,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      reply = response.data.choices[0].message.content;
    } else {
      // ── OpenAI (gpt-4o-mini — affordable fallback) ───────────────────────────
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages,
          max_tokens: 512,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      reply = response.data.choices[0].message.content;
    }

    return res.json({ reply });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;

    if (status === 401) {
      return res
        .status(401)
        .json({ error: "Invalid API key. Check your .env file." });
    }
    if (status === 429) {
      return res
        .status(429)
        .json({ error: "Rate limit reached. Please wait a moment and try again." });
    }

    console.error("[EcoPilot] LLM API error:", detail);
    return res
      .status(502)
      .json({ error: "Could not reach the AI service. Please try again shortly." });
  }
});

// ─── Profile allowlists ────────────────────────────────────────────────────────
const ALLOWED_LIVING    = new Set(["Hostel", "Day Scholar"]);
const ALLOWED_TRANSPORT = new Set(["Walk", "Bicycle", "Bus", "Two-wheeler", "Car"]);
const ALLOWED_CONCERN   = new Set([
  "Energy", "Water", "Waste", "Transportation",
  "Responsible Consumption", "General Sustainability",
]);

/**
 * Sanitise the optional profile object from req.body.
 * Returns only fields with expected values; drops unknown or missing values silently.
 * Never logs profile field values to avoid unnecessary data capture.
 * @param {any} raw
 * @returns {{ living?: string, transport?: string, concern?: string } | null}
 */
function sanitiseProfile(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  if (typeof raw.living    === "string" && ALLOWED_LIVING.has(raw.living))       out.living    = raw.living;
  if (typeof raw.transport === "string" && ALLOWED_TRANSPORT.has(raw.transport)) out.transport = raw.transport;
  if (typeof raw.concern   === "string" && ALLOWED_CONCERN.has(raw.concern))     out.concern   = raw.concern;
  return Object.keys(out).length ? out : null;
}

// ─── Analyze Endpoint ──────────────────────────────────────────────────────────
// POST /api/analyze
// Body: { input: string, profile?: { living, transport, concern } }
// Returns: { plan: object }
app.post("/api/analyze", async (req, res) => {
  const { input, profile } = req.body;

  if (!input || typeof input !== "string" || input.trim() === "") {
    return res.status(400).json({ error: "input is required" });
  }

  const groqKey  = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return res.status(500).json({
      error: "No LLM API key configured. Please set GROQ_API_KEY or OPENAI_API_KEY in your .env file.",
    });
  }

  // Validate and sanitise profile — only allowlisted values pass through
  const safeProfile = sanitiseProfile(profile);

  const messages = buildAnalyzeMessages(input.trim(), safeProfile);

  try {
    let raw;

    if (groqKey) {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: 'openai/gpt-oss-20b',
          messages,
          max_tokens: 768,
          temperature: 0.4,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      raw = response.data.choices[0].message.content;
    } else {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages,
          max_tokens: 768,
          temperature: 0.4,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      raw = response.data.choices[0].message.content;
    }

    // Strip markdown code fences if the model wraps the JSON
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch (_) {
      console.error("[EcoPilot] analyze: JSON parse failed:", jsonStr);
      return res.status(502).json({ error: "The AI returned an unexpected format. Please try again." });
    }

    return res.json({ plan });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;

    if (status === 401) {
      return res.status(401).json({ error: "Invalid API key. Check your .env file." });
    }
    if (status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
    }

    console.error("[EcoPilot] analyze API error:", detail);
    return res.status(502).json({ error: "Could not reach the AI service. Please try again shortly." });
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 EcoPilot is running at http://localhost:${PORT}`);
  console.log(
    `   LLM provider: ${process.env.GROQ_API_KEY ? "Groq" : process.env.OPENAI_API_KEY ? "OpenAI" : "⚠️  None configured"}\n`
  );
});

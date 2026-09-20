/* ════════════════════════════════════════════════════════════════════════════
   EcoPilot – app.js
   All frontend logic: tab switching, chat, calculator, checklist, profile, dashboard.
   No framework. No build step. Plain ES6.
   ════════════════════════════════════════════════════════════════════════════ */

"use strict";

// ════════════════════════════════════════════════════════════════════════════
// 1. TAB SWITCHING
// ════════════════════════════════════════════════════════════════════════════

const tabBtns   = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

/** Activate the tab with the given data-tab value. */
function activateTab(target) {
  tabBtns.forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  tabPanels.forEach((p) => p.classList.remove("active"));

  const targetBtn = document.querySelector(`.tab-btn[data-tab="${target}"]`);
  const targetPanel = document.getElementById(`tab-${target}`);

  if (targetBtn) {
    targetBtn.classList.add("active");
    targetBtn.setAttribute("aria-selected", "true");
  }
  if (targetPanel) {
    targetPanel.classList.add("active");
  }
}

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

// Dashboard CTA button also acts as a tab switch
document.querySelector(".dash-cta-btn").addEventListener("click", function () {
  activateTab(this.dataset.tab);
});

// ════════════════════════════════════════════════════════════════════════════
// 2. ECO CHAT ASSISTANT
// ════════════════════════════════════════════════════════════════════════════

const chatMessages = document.getElementById("chat-messages");
const chatInput    = document.getElementById("chat-input");
const chatSend     = document.getElementById("chat-send");
const chatClear    = document.getElementById("chat-clear");

// In-memory conversation history (cleared on page refresh — by design)
let chatHistory = [];

// ── Render helpers ──────────────────────────────────────────────────────────

/**
 * Append a message bubble to the chat window.
 * @param {"user"|"bot"} role
 * @param {string} text
 * @returns {HTMLElement} the bubble element (so we can remove loading state)
 */
function appendMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg msg-${role}`;

  const sender = document.createElement("div");
  sender.className = "msg-sender";
  sender.textContent = role === "user" ? "You" : "EcoPilot AI";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (role === "bot") {
    // Strip trailing SDG tag from chat response text (not shown in UI)
    const cleaned = text.replace(/\[(SDG\s*1[12])\]\s*$/i, "").trim();
    bubble.textContent = cleaned;
  } else {
    bubble.textContent = text;
  }

  wrapper.appendChild(sender);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrapper;
}

/** Show an animated typing indicator while waiting for the API response. */
function showTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "msg msg-bot typing-indicator";
  wrapper.id = "typing";

  const sender = document.createElement("div");
  sender.className = "msg-sender";
  sender.textContent = "EcoPilot AI";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

  wrapper.appendChild(sender);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById("typing");
  if (el) el.remove();
}

// ── Send message ────────────────────────────────────────────────────────────

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  chatSend.disabled = true;

  appendMessage("user", text);
  chatHistory.push({ role: "user", content: text });

  showTypingIndicator();

  try {
    const res = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: text, history: chatHistory }),
    });

    removeTypingIndicator();

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      appendMessage("bot", `⚠️ ${err.error || "Something went wrong. Please try again."}`);
      // Don't push failed response to history
    } else {
      const data = await res.json();
      appendMessage("bot", data.reply);
      chatHistory.push({ role: "assistant", content: data.reply });
    }
  } catch (_) {
    removeTypingIndicator();
    appendMessage(
      "bot",
      "⚠️ Could not reach EcoPilot's server. Make sure the server is running (npm start)."
    );
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
  }
}

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) sendMessage();
});

chatClear.addEventListener("click", () => {
  chatMessages.innerHTML = "";
  chatHistory = [];
  renderWelcomeMessage();
});

// ── Welcome message ─────────────────────────────────────────────────────────

function renderWelcomeMessage() {
  appendMessage(
    "bot",
    "Hi! I'm EcoPilot 🌿\n\nI'm here to help you make more sustainable choices on campus.\n\nAsk me about energy saving, water conservation, recycling, green transport, or anything else related to campus sustainability.\n\n[SDG 11]"
  );
}

renderWelcomeMessage();

// ════════════════════════════════════════════════════════════════════════════
// 3. SUSTAINABILITY CALCULATOR
// ════════════════════════════════════════════════════════════════════════════

const sliders = {
  transport: document.getElementById("calc-transport"),
  energy:    document.getElementById("calc-energy"),
  waste:     document.getElementById("calc-waste"),
  diet:      document.getElementById("calc-diet"),
};

const valueLabels = {
  transport: document.getElementById("val-transport"),
  energy:    document.getElementById("val-energy"),
  waste:     document.getElementById("val-waste"),
  diet:      document.getElementById("val-diet"),
};

const scoreNumber = document.getElementById("score-number");
const scoreTier   = document.getElementById("score-tier");
const scoreCircle = document.getElementById("score-circle");
const tipsList    = document.getElementById("tips-list");


const dashScore          = document.getElementById("dash-score");
const dashScoreTier      = document.getElementById("dash-score-tier");
const dashChecklistCount = document.getElementById("dash-checklist-count");
const dashChecklistPct   = document.getElementById("dash-checklist-pct");
const dashChecklistFill  = document.getElementById("dash-checklist-fill");

/** All improvement tips, keyed by input name. Shown when that input is high. */
const TIPS = {
  transport: [
    "Try cycling or walking to campus — it's free and carbon-zero.",
    "Check if your campus runs a shuttle or bus service.",
    "Organise a carpool with classmates who live nearby.",
  ],
  energy: [
    "Plug devices into a power strip and switch it off when you leave your room.",
    "Enable sleep mode or auto-shutdown on your laptop and monitor.",
    "Unplug phone chargers when not in use — they draw power even when idle.",
  ],
  waste: [
    "Carry a reusable water bottle and say no to single-use cups.",
    "Bring a reusable bag to the campus shop.",
    "Choose products with minimal packaging when possible.",
  ],
  diet: [
    "Try swapping one meat meal per week for a plant-based option.",
    "Visit your campus canteen's veggie or vegan section.",
    "Reducing beef consumption is one of the highest-impact dietary changes you can make.",
  ],
};

/** Score tiers definition (evaluated highest first). */
const TIERS = [
  { min: 80, label: "Eco Champion", cls: ""      },
  { min: 60, label: "On Track",     cls: "lime"  },
  { min: 40, label: "Needs Work",   cls: "amber" },
  { min:  0, label: "High Impact",  cls: "red"   },
];

/**
 * Calculate a sustainability score from 0–100 based on the four slider values.
 * Higher inputs = higher environmental impact = lower score.
 *
 * Penalty weights are normalised against each input's maximum:
 *   transport: 0–7   → up to 30 pts penalty
 *   energy:    0–12  → up to 20 pts penalty
 *   waste:     0–10  → up to 25 pts penalty
 *   diet:      0–21  → up to 25 pts penalty
 *   Total max penalty = 100
 */
function calculateScore(transport, energy, waste, diet) {
  const penalty =
    (transport / 7)  * 30 +
    (energy    / 12) * 20 +
    (waste     / 10) * 25 +
    (diet      / 21) * 25;

  return Math.round(Math.max(0, Math.min(100, 100 - penalty)));
}

function updateCalculator() {
  const vals = {
    transport: parseInt(sliders.transport.value, 10),
    energy:    parseInt(sliders.energy.value,    10),
    waste:     parseInt(sliders.waste.value,     10),
    diet:      parseInt(sliders.diet.value,      10),
  };

  // Update live value labels
  Object.keys(vals).forEach((k) => {
    valueLabels[k].textContent = vals[k];
  });

  const score = calculateScore(vals.transport, vals.energy, vals.waste, vals.diet);
  scoreNumber.textContent = score;

  // Apply tier styling
  const tier = TIERS.find((t) => score >= t.min);
  scoreTier.textContent = tier.label;
  scoreCircle.className = `score-circle ${tier.cls}`;

  // Build improvement tips: show one tip per high-impact area
  // "High" thresholds: transport ≥ 3, energy ≥ 5, waste ≥ 4, diet ≥ 10
  const thresholds = { transport: 3, energy: 5, waste: 4, diet: 10 };
  const activeTips = [];

  Object.keys(thresholds).forEach((k) => {
    if (vals[k] >= thresholds[k]) {
      // Pick the tip corresponding to current value for variety
      const tip = TIPS[k][vals[k] % TIPS[k].length];
      activeTips.push(tip);
    }
  });

  tipsList.innerHTML = "";

  if (activeTips.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Great habits! Keep it up and encourage others on campus. 🌱";
    tipsList.appendChild(li);
  } else {
    activeTips.forEach((tip) => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.appendChild(li);
    });
  }

  // Update dashboard score live
  updateDashboardScore(score, tier.label);
}

// Attach listeners and run initial render
Object.values(sliders).forEach((s) => s.addEventListener("input", updateCalculator));
updateCalculator();

// ════════════════════════════════════════════════════════════════════════════
// 4. ECO ACTION CHECKLIST
// ════════════════════════════════════════════════════════════════════════════

const CHECKLIST_KEY = "ecopilot_checklist";
const CUSTOM_ACTIONS_KEY = "ecopilot_custom_actions";

/** The full list of daily eco actions students can complete. */
const ACTIONS = [
  { id: "a1", label: "Used a reusable water bottle today",                   sdg: 12 },
  { id: "a2", label: "Switched off lights when leaving a room",              sdg: 11 },
  { id: "a3", label: "Used campus recycling bins correctly",                  sdg: 12 },
  { id: "a4", label: "Walked or cycled instead of taking a vehicle",         sdg: 11 },
  { id: "a5", label: "Avoided single-use plastic packaging today",           sdg: 12 },
  { id: "a6", label: "Reported a water leak or energy waste to staff",       sdg: 11 },
  { id: "a7", label: "Ate a plant-based or vegetarian meal today",           sdg: 12 },
  { id: "a8", label: "Turned off devices and chargers when not in use",      sdg: 11 },
];

const checklistEl       = document.getElementById("checklist-items");
const progressText      = document.getElementById("progress-text");
const progressPct       = document.getElementById("progress-pct");
const progressFill      = document.getElementById("progress-fill");
const checklistReset    = document.getElementById("checklist-reset");

const customActionInput = document.getElementById("custom-action-input");
const customActionAdd   = document.getElementById("custom-action-add");

function loadCustomActions() {
  try {
    const raw = localStorage.getItem(CUSTOM_ACTIONS_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveCustomActions(actions) {
  localStorage.setItem(
    CUSTOM_ACTIONS_KEY,
    JSON.stringify(actions)
  );
}

let customActions = loadCustomActions();

function getAllActions() {
  return [...ACTIONS, ...customActions];
}

/** Return today's date string in YYYY-MM-DD format (local time). */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Load checked item IDs from localStorage.
 * Automatically resets if the stored date differs from today.
 * @returns {string[]} Array of checked action IDs
 */
function loadChecked() {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.date !== todayStr()) return []; // New day — fresh start
    return Array.isArray(data.checked) ? data.checked : [];
  } catch (_) {
    return [];
  }
}

/** Persist the current checked state to localStorage. */
function saveChecked(checked) {
  localStorage.setItem(
    CHECKLIST_KEY,
    JSON.stringify({ date: todayStr(), checked })
  );
}

let checkedIds = loadChecked();

/** Re-render the progress bar and counters. */
function updateProgress() {
  const allActions = getAllActions();
  const total      = allActions.length;
  const done       = checkedIds.filter((id) =>
    allActions.some((action) => action.id === id)
  ).length;

  const pct = total > 0
    ? Math.round((done / total) * 100)
    : 0;

  progressText.textContent = `${done} of ${total} actions completed`;
  progressPct.textContent  = `${pct}%`;
  progressFill.style.width = `${pct}%`;

  // Keep ARIA progressbar in sync
  const track = progressFill.parentElement;
  if (track) track.setAttribute("aria-valuenow", pct);

  // Keep dashboard checklist card in sync
  updateDashboardChecklist(done, total, pct);
}

/** Toggle a single checklist item. */
function toggleItem(id) {
  if (checkedIds.includes(id)) {
    checkedIds = checkedIds.filter((i) => i !== id);
  } else {
    checkedIds.push(id);
  }
  saveChecked(checkedIds);

  // Update the individual item's visual state
  const itemEl = document.querySelector(`[data-action-id="${id}"]`);
  if (itemEl) {
    const cb = itemEl.querySelector("input[type='checkbox']");
    cb.checked = checkedIds.includes(id);
    itemEl.classList.toggle("checked", checkedIds.includes(id));
  }

  updateProgress();
}

/** Build and insert all checklist items into the DOM. */
function renderChecklist() {
  checklistEl.innerHTML = "";

  const allActions = getAllActions();

  allActions.forEach((action) => {
    const isChecked = checkedIds.includes(action.id);

    const li = document.createElement("li");
    li.className = `checklist-item${isChecked ? " checked" : ""}`;
    li.dataset.actionId = action.id;
    li.setAttribute("role", "listitem");

    const cb = document.createElement("input");
    cb.type    = "checkbox";
    cb.checked = isChecked;
    cb.id      = `cb-${action.id}`;
    cb.setAttribute("aria-label", action.label);

    const content = document.createElement("div");
    content.className = "item-content";

    const labelEl = document.createElement("label");
    labelEl.className = "item-label";
    labelEl.htmlFor   = cb.id;
    labelEl.textContent = action.label;

    content.appendChild(labelEl);

    li.appendChild(cb);
    li.appendChild(content);

    // Clicking anywhere on the row toggles the item
    li.addEventListener("click", (e) => {
      // Avoid double-firing when clicking directly on the checkbox
      if (e.target !== cb) toggleItem(action.id);
    });
    cb.addEventListener("change", () => toggleItem(action.id));

    checklistEl.appendChild(li);
  });

  updateProgress();
}

checklistReset.addEventListener("click", () => {
  checkedIds = [];
  saveChecked(checkedIds);
  renderChecklist();
});

customActionAdd.addEventListener("click", () => {
  const label = customActionInput.value.trim();

  if (!label) {
    customActionInput.focus();
    return;
  }

  const newAction = {
    id: `custom-${Date.now()}`,
    label: label,
    sdg: 12,
  };

  customActions.push(newAction);
  saveCustomActions(customActions);

  customActionInput.value = "";

  renderChecklist();
  customActionInput.focus();
});

customActionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    customActionAdd.click();
  }
});

renderChecklist();

// ════════════════════════════════════════════════════════════════════════════
// 5. AI ECO ACTION PLANNER
// ════════════════════════════════════════════════════════════════════════════

const plannerInput          = document.getElementById("planner-input");
const plannerSubmit         = document.getElementById("planner-submit");
const plannerCharCount      = document.getElementById("planner-char-count");
const plannerLoading        = document.getElementById("planner-loading");
const plannerError          = document.getElementById("planner-error");
const plannerResult         = document.getElementById("planner-result");
const plannerProfileContext = document.getElementById("planner-profile-context");

// ── Character counter ────────────────────────────────────────────────────────
plannerInput.addEventListener("input", () => {
  plannerCharCount.textContent = `${plannerInput.value.length} / 1000`;
});

// ── Priority badge colour helper ─────────────────────────────────────────────
const PRIORITY_CLASS = { Low: "priority-low", Medium: "priority-medium", High: "priority-high" };

// ── Render the plan returned by /api/analyze ─────────────────────────────────

/**
 * Populate the result card with data from the API response.
 * @param {object} plan
 */
function renderPlan(plan) {
  // Area badge
  const areaBadge = document.getElementById("plan-area-badge");
  areaBadge.textContent = plan.area || "General Sustainability";

  // Priority badge
  const priorityBadge = document.getElementById("plan-priority-badge");
  priorityBadge.textContent = `Priority: ${plan.priority || "—"}`;
  priorityBadge.className = `planner-priority-badge ${PRIORITY_CLASS[plan.priority] || ""}`;

  // Summary
  document.getElementById("plan-summary").textContent = plan.summary || "";

  // Recommendations
  const recList = document.getElementById("plan-recommendations");
  recList.innerHTML = "";
  const recs = Array.isArray(plan.recommendations) ? plan.recommendations : [];
  recs.forEach((rec) => {
    const li = document.createElement("li");
    li.textContent = rec;
    recList.appendChild(li);
  });

  // Action for today
  document.getElementById("plan-action-today").textContent = plan.actionForToday || "";

  // SDG badge
  const sdgBadge = document.getElementById("plan-sdg-badge");
  const sdgText  = (plan.sdg || "").trim();
  sdgBadge.textContent = sdgText;
  sdgBadge.className = sdgText.includes("12") ? "badge badge-sdg12" : "badge badge-sdg11";

  // Disclaimer
  document.getElementById("plan-disclaimer").textContent = plan.disclaimer || "";

  plannerResult.hidden = false;
}

// ── Submit handler ────────────────────────────────────────────────────────────

async function submitPlan() {
  const text = plannerInput.value.trim();
  if (!text) {
    plannerError.textContent = "Please describe your habits or concern before analysing.";
    plannerError.hidden = false;
    return;
  }

  // Build request body — include profile if saved
  const profile = loadProfile();
  const body = { input: text };
  if (profile) body.profile = profile;

  // Show profile context indicator
  if (profile) {
    const parts = [profile.living, profile.transport, profile.concern].filter(Boolean);
    plannerProfileContext.textContent = `Analysing with your profile: ${parts.join(" | ")}`;
    plannerProfileContext.hidden = false;
  } else {
    plannerProfileContext.hidden = true;
  }

  // Reset state
  plannerResult.hidden = true;
  plannerError.hidden  = true;
  plannerLoading.hidden = false;
  plannerSubmit.disabled = true;

  try {
    const res = await fetch("/api/analyze", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    plannerLoading.hidden = true;

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      plannerError.textContent = `⚠️ ${err.error || "Something went wrong. Please try again."}`;
      plannerError.hidden = false;
    } else {
      const data = await res.json();
      renderPlan(data.plan);
    }
  } catch (_) {
    plannerLoading.hidden = true;
    plannerError.textContent = "⚠️ Could not reach EcoPilot's server. Make sure the server is running (npm start).";
    plannerError.hidden = false;
  } finally {
    plannerSubmit.disabled = false;
  }
}

plannerSubmit.addEventListener("click", submitPlan);

// ════════════════════════════════════════════════════════════════════════════
// 6. SUSTAINABILITY PROFILE
// ════════════════════════════════════════════════════════════════════════════

const PROFILE_KEY = "ecopilot_profile";

const profileSave    = document.getElementById("profile-save");
const profileReset   = document.getElementById("profile-reset");
const profileConfirm = document.getElementById("profile-confirm");
const profConcern    = document.getElementById("prof-concern");

/**
 * Load profile from localStorage.
 * @returns {{ living: string, transport: string, concern: string } | null}
 */
function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data === "object" && data !== null) return data;
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Persist profile data to localStorage.
 * @param {{ living: string, transport: string, concern: string }} data
 */
function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

/** Pre-fill the profile form from the stored profile (if any). */
function renderProfileForm() {
  const profile = loadProfile();
  if (!profile) return;

  if (profile.living) {
    const livingRadio = document.querySelector(`input[name="prof-living"][value="${profile.living}"]`);
    if (livingRadio) livingRadio.checked = true;
  }
  if (profile.transport) {
    const transportRadio = document.querySelector(`input[name="prof-transport"][value="${profile.transport}"]`);
    if (transportRadio) transportRadio.checked = true;
  }
  if (profile.concern) {
    profConcern.value = profile.concern;
  }
}

/** Reset all profile form controls to default state and remove from localStorage. */
function resetProfileForm() {
  document.querySelectorAll('input[name="prof-living"], input[name="prof-transport"]').forEach((r) => {
    r.checked = false;
  });
  profConcern.value = "";
  localStorage.removeItem(PROFILE_KEY);
}

// ── Save handler ─────────────────────────────────────────────────────────────
profileSave.addEventListener("click", () => {
  const livingEl    = document.querySelector('input[name="prof-living"]:checked');
  const transportEl = document.querySelector('input[name="prof-transport"]:checked');

  const data = {
    living:    livingEl    ? livingEl.value    : "",
    transport: transportEl ? transportEl.value : "",
    concern:   profConcern.value,
  };

  saveProfile(data);

  // Show inline confirmation and auto-hide after 3 s
  profileConfirm.hidden = false;
  clearTimeout(profileConfirm._timer);
  profileConfirm._timer = setTimeout(() => {
    profileConfirm.hidden = true;
  }, 3000);
});

// ── Reset handler ─────────────────────────────────────────────────────────────
profileReset.addEventListener("click", () => {
  resetProfileForm();
  profileConfirm.hidden = true;
});

// ── Clear My Local Data handler ───────────────────────────────────────────────
const profileClearData    = document.getElementById("profile-clear-data");
const profileClearConfirm = document.getElementById("profile-clear-confirm");

profileClearData.addEventListener("click", () => {
  // Remove all EcoPilot-owned localStorage keys
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(CHECKLIST_KEY);
  localStorage.removeItem(CUSTOM_ACTIONS_KEY);

  // Reset the profile form
  resetProfileForm();
  profileConfirm.hidden = true;

  // Reset the checklist in-memory state and re-render
  checkedIds = [];
  customActions = [];
  renderChecklist();

  // Show confirmation, auto-hide after 4 s
  profileClearConfirm.hidden = false;
  clearTimeout(profileClearConfirm._timer);
  profileClearConfirm._timer = setTimeout(() => {
    profileClearConfirm.hidden = true;
  }, 4000);
});

// Pre-fill form on page load
renderProfileForm();

// ════════════════════════════════════════════════════════════════════════════
// 7. DASHBOARD — live score + checklist progress
// ════════════════════════════════════════════════════════════════════════════



/**
 * Update the Dashboard Eco Score card.
 * Called by updateCalculator() on every slider change and on initial load.
 * @param {number} score
 * @param {string} tierLabel
 */
function updateDashboardScore(score, tierLabel) {
  dashScore.textContent     = score;
  dashScoreTier.textContent = tierLabel;
}

/**
 * Update the Dashboard checklist progress card.
 * Called by updateProgress() whenever checklist state changes.
 * @param {number} done
 * @param {number} total
 * @param {number} pct
 */
function updateDashboardChecklist(done, total, pct) {
  dashChecklistCount.textContent = `${done} / ${total}`;
  dashChecklistPct.textContent   = `${pct}% complete`;
  dashChecklistFill.style.width  = `${pct}%`;
}

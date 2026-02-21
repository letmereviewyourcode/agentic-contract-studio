# Enterprise Demo Script

> **Audience**: Enterprise platform teams, agent developers, SEs  
> **Duration**: 5–7 minutes (deterministic demo) or 8–10 minutes (with local polish)  
> **Goal**: Show the tool reliability problem and how deterministic scoring + auto-fix solves it

---

## Setup

- Open `http://localhost:3000` (or deployed URL)
- Browser zoomed to ~100%, dark backgrounds look best on projector/screen share
- For the deterministic demo: no setup needed — works without any API key
- For the polish demo: confirm `OPENAI_API_KEY` and `ENABLE_POLISH=true` in `.env.local`

---

## Demo A: Deterministic (Public Demo Safe)

### 1. The Problem (30 seconds)

> *"When agents call tools, the quality of the tool specification directly impacts reliability. A bad spec — missing descriptions, wrong types, no examples — causes the LLM to guess, hallucinate parameters, or retry. Each retry costs tokens and time. There's no standard way to lint these specs before they go live."*

### 2. Import a Tool Spec (30 seconds)

**Action**: In the left panel, click **"Load paste sample (single tool)"**.

The textarea fills with a `searchUsers` tool — a realistic but flawed spec.

**Action**: Click **Import**.

### 3. Review Imported Spec (15 seconds)

**Action**: Look at the Results panel, which defaults to the **Imported** tab.

> *"Before we even score it, we can see exactly what was imported. The app normalizes the input into a standard semantic wrapper."*

### 4. Score It (1 minute)

**Action**: Click **Score** in the bottom action bar.

**Expected result**:

| What you'll see | Value |
|---|---|
| Overall score | **65** |
| Grade | **D — Poor** |
| Errors | 1 |
| Warnings | 5 |
| Info | 5 |

> *"65 out of 100. Grade D. The rubric is fully deterministic — no LLM, no randomness. It checks five categories: naming conventions, description quality, parameter completeness, examples, and MCP best practices."*

**Pause on the category breakdown**:
- Naming: 80 (camelCase instead of snake_case)
- Description: 65 (too short, no action verb)
- Parameters: 65 (missing descriptions)
- Examples: 60 (none provided)
- Best Practices: 55 (no annotations, no error docs)

### 4. Show Issues (30 seconds)

**Action**: Click the **Issues** tab in the results panel.

> *"Each issue has a severity — error, warning, or info — and a suggested fix. This is the audit trail you'd want before shipping a tool to production."*

### 5. Auto-Fix (1 minute)

**Action**: Click **Auto-Fix** in the bottom action bar.

**Expected**: Score jumps from **65 → 88** (Grade D → B).

> *"The auto-fix is also fully deterministic. It normalized the name to snake_case, added a verb prefix, generated parameter descriptions, created realistic examples, and added MCP annotation stubs."*

### 6. Show the Diff (1 minute)

**Action**: Click the **Diff** tab.

> *"Here's exactly what changed. Green lines are additions, red with strikethrough are removals."*

### 8. Export (15 seconds)

**Action**: Click **Export Fixed JSON**.

> *"The fixed spec downloads as JSON in a strict canonical wrapper, ready to commit. Notice you couldn't export this until after Auto-fix ran, guaranteeing you're saving the corrected output."*

### 9. The Close (30 seconds)

> *"This is deterministic CI linting for agent tool contracts. The scoring rubric is transparent and customizable. The auto-fix handles the mechanical work. No LLM, no API key, zero cost for the core pipeline."*

---

## Demo B: Local Polish Add-On (Requires OPENAI_API_KEY)

> **Only run this on your local machine, never on a public URL.**

### Prerequisites

```bash
# .env.local must have:
OPENAI_API_KEY=sk-your-key
ENABLE_POLISH=true
# PUBLIC_DEMO must NOT be set to true
```

### Steps (add ~2 minutes to Demo A)

After completing Auto-Fix in Demo A:

**9. Polish with LLM (1 minute)**

**Action**: Click **Polish (LLM)** — the button is gold/warning colored.

> *"This calls GPT-4o-mini on the server side to rewrite descriptions and add richer examples. The key never leaves the server."*

**Expected**: Chat shows *"LLM polish complete!"*

**Action**: Click the **Diff** tab again to see the polish changes.

> *"Notice the descriptions are more human-readable now, but the parameter names, types, and required fields are untouched. Polish only improves wording — it never changes schema semantics."*

**10. Re-Score (30 seconds)**

**Action**: Click **Score** again.

> *"The score may improve slightly if descriptions are now more detailed. But the big jump (65 → 88) came from the deterministic auto-fix, not the LLM."*

### ChatKit vs Polish — Clarification

If asked about ChatKit:

> *"ChatKit is a separate feature — it's the chat widget UI from OpenAI. Currently it's in Local Mode because no Agent Builder backend is configured. ChatKit and Polish are completely independent. Polish uses GPT-4o-mini server-side for description rewriting; ChatKit would provide a richer conversational UI when connected to an Agent Builder workflow."*

---

## Public Demo Caveat

If demoing the deployed public URL:

> *"On the public link, LLM polish is disabled to protect the API key. The Polish button appears disabled with a tooltip explaining why. Everything else — scoring, auto-fix, import, export — works identically. To try polish, run locally with your own OpenAI key."*

---

## Troubleshooting During Demo

| Issue | Fix |
|---|---|
| Polish button disabled | Expected in PUBLIC_DEMO mode; enable locally |
| Polish button missing entirely | Check ENABLE_POLISH=true and OPENAI_API_KEY in .env.local |
| "Local Mode" badge | Expected; ChatKit backend not configured |
| Score doesn't appear | Ensure Import was clicked first |
| GitHub import fails | Only works with public repos; use paste/upload instead |

---

## Key Talking Points

- **No LLM required** for scoring and auto-fix — fully deterministic, zero-cost
- **CI-ready** — `POST /api/score` in a pipeline, fail builds below threshold
- **Transparent rubric** — every point is explainable
- **Score 65 → 88** without any LLM
- **Polish is optional** — local-only, server-side, never changes schema semantics
- **Security** — key never in client, 403 enforcement in PUBLIC_DEMO

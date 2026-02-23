# Agent Contract Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Built by Zishan Ali Khan** · [LinkedIn](https://www.linkedin.com/in/zishanalikhan)
>
> **Tool Credit Score** — Deterministic scoring + auto-fix for MCP tool specifications.  
> Optional LLM polish (local-only).

## Why this exists
Agents fail in production because tool specs are underspecified. This studio scores your MCP tools and auto-fixes them so agents call tools reliably.

## What It Does

You paste (or upload, or fetch from GitHub) an MCP tool spec, and the studio:

1. **Previews** imported JSON in the new "Imported" tab
2. **Scores** it against a 5-category deterministic rubric (0–100)
3. **Auto-fixes** naming, descriptions, parameter types, examples, and annotations
4. *(Optional)* **Polishes** descriptions with GPT-4o-mini (local-only, requires key)
5. **Exports** the strictly formatted `tools.fixed.json` (canonical `{ tools: [...] }` wrapper)

No LLM is required for scoring or auto-fix — those are fully deterministic.

**Note**: v0.1 supports Paste JSON, Upload, and GitHub import. Connecting to a live MCP Server URL is planned for v0.2.

---

## Quick Start

```bash
# Install
npm install

# Run
npm run dev
# → http://localhost:3000
```

### Enable LLM Polish (OpenAI-compatible endpoints)

```bash
cp .env.example .env.local
# Add your OPENAI_API_KEY
# Set ENABLE_POLISH=true
# Set POLISH_MODEL=gpt-4o-mini (or your preferred model)
# Restart dev server
```

Polish requires all three conditions:
1. `ENABLE_POLISH=true`
2. `OPENAI_API_KEY` is set (or user provides BYOK)
3. `PUBLIC_DEMO` is NOT `true` (unless overridden by BYOK)

You can point the Studio at **any** OpenAI-compatible endpoint (like LiteLLM, vLLM, Ollama, etc.) by supplying a custom Base URL and Model name in the UI's BYOK settings.

See [`docs/POLISH_MODE.md`](docs/POLISH_MODE.md) for details.

### Public Demo Mode

For public-facing deployments where server-side polish must be off:

```bash
PUBLIC_DEMO=true    # Central polish is disabled; users MUST Provide a BYOK API Key.
```

---

## Architecture

| Layer | Stack | Notes |
|---|---|---|
| Frontend | Next.js 16 App Router, React, TypeScript | Header → 3-column → Footer |
| Styling | Tailwind CSS + custom design tokens | Enterprise audit aesthetic (charcoal + muted teal) |
| API | Next.js route handlers (server-side) | `/api/score`, `/api/fix`, `/api/polish`, `/api/import/github`, `/api/config` |
| Chat UI | Standard React components | ChatKit probed on mount; falls back to local mode |
| Scoring | Deterministic (no LLM) | 5 weighted categories, JSON rubric |
| Auto-Fix | Deterministic (no LLM) | snake_case, verb prefix, param types, examples |
| Polish | Any OpenAI-compatible LLM | Three-gate enforcement; Provider-neutral BYOK via UI |

### Deterministic Pipeline vs LLM Polish

The **core pipeline** (Score + Auto-Fix) is 100% deterministic — no LLM, no randomness, no API key needed. It runs identically every time.

**LLM Polish** is an optional enhancement that rewrites descriptions and examples for clarity. It explains its reasoning directly in the chat UI, but it only changes wording — never parameter names, types, or schema structure. It is architected to be **Provider-Neutral** via the OpenAI-compatible API standard. See [`docs/POLISH_MODE.md`](docs/POLISH_MODE.md).

### ChatKit

The app imports `@openai/chatkit-react` and probes `/api/chatkit/session` on mount. If a ChatKit backend is configured (Agent Builder workflow), the center panel shows "ChatKit Live" and uses the full ChatKit widget. Otherwise it falls back to standard React chat components — labeled "Local Mode." ChatKit and Polish are **independent features**.

### Security

- **`OPENAI_API_KEY`** is never sent to the client. Server-side only in `/api/polish`.
- **BYOK Keys** are kept locally in React State and passed per request. They are NEVER logged or persisted to DB by the server.
- `/api/config` exposes only: `{ polishEnabled: boolean, publicDemo: boolean, version: string }`
- **`PUBLIC_DEMO=true`** makes the polish endpoint require a BYOK config payload or else it returns `400` with `MISSING_API_KEY`.

---

## Testing

```bash
# Install Playwright browsers (first time)
npx playwright install --with-deps

# Run all E2E tests (7 tests, runs in PUBLIC_DEMO mode)
npm run test:e2e

# Run with Playwright UI
npm run test:e2e:ui
```

### Test Scenarios (7 total)

| # | Scenario | What it tests |
|---|---|---|
| 1 | Paste → Score → Auto-Fix → Export | Full deterministic happy path |
| 2 | Upload → Score → Auto-Fix | File input pipeline |
| 3 | GitHub → Score (fixture) | E2E fixture fallback (`E2E=1`) |
| 4 | MCP tab disabled | Visible + disabled + "Coming soon" |
| 5 | Header + About modal | Branding, LinkedIn link, modal open/close |
| 6 | Polish button disabled | Disabled + tooltip in PUBLIC_DEMO |
| 7 | /api/polish → 403 | `POLISH_DISABLED` code enforcement |

### E2E Fixture Fallback

When `E2E=1` is set, the GitHub import route serves from `public/examples/tools.json` instead of fetching from GitHub. Tests also run with `PUBLIC_DEMO=true` to verify polish enforcement.

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — | Enables LLM polish (server-side only) |
| `ENABLE_POLISH` | `false` | Explicit opt-in for polish |
| `PUBLIC_DEMO` | `false` | Set `true` to disable polish (403) |
| `POLISH_MODEL` | `gpt-4o-mini` | Model for polish |
| `E2E` | — | Set by Playwright; enables GitHub fixture fallback |

---

## Docs

| Document | Path |
|---|---|
| Architecture & plan | [`docs/PLAN.md`](docs/PLAN.md) |
| Polish mode | [`docs/POLISH_MODE.md`](docs/POLISH_MODE.md) |
| QA checklist | [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) |
| Current status | [`docs/HANDOFF.md`](docs/HANDOFF.md) |
| Changelog | [`docs/CHANGELOG.md`](docs/CHANGELOG.md) |
| Deployment guide | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Demo script | [`docs/DEMO_SCRIPT_ENTERPRISE.md`](docs/DEMO_SCRIPT_ENTERPRISE.md) |



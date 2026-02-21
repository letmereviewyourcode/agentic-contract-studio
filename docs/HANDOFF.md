# Handoff — 2026-02-21

## Current Status: ✅ Functional, Not Yet Deployed

The app builds, runs, and passes all 7 Playwright E2E tests locally (including polish enforcement). It has not been pushed to GitHub or deployed.

---

## What's Built

### Core Pipeline (deterministic, no LLM required)
- **Scorer** (`src/lib/rubric.ts`): 5-category weighted rubric, 0–100, grades A–F
- **Auto-Fixer** (`src/lib/autofix.ts`): snake_case, verb prefix, param descriptions, examples, annotations
- **Parser** (`src/lib/parser.ts`): JSON paste, file upload, GitHub URL. Normalizes all inputs into canonical `{ "tools": [...] }` wrapper
- **Export**: Strictly exports fixed state only via JSON download using the canonical wrapper

### LLM Polish (local-only, optional)
- **Polish** (`src/lib/polish.ts`): GPT-4o-mini (configurable via `POLISH_MODEL`)
- Three-gate enforcement: `ENABLE_POLISH=true` + `OPENAI_API_KEY` + `PUBLIC_DEMO !== true`
- Returns 403 with `{ ok: false, error: { code: "POLISH_DISABLED" } }` when disabled
- System prompt explicitly prohibits changing schema semantics

### API Routes
- `POST /api/score` — deterministic scoring
- `POST /api/fix` — deterministic auto-fix
- `POST /api/polish` — LLM polish (403 in PUBLIC_DEMO or when ENABLE_POLISH=false)
- `POST /api/import/github` — GitHub import (E2E fixture fallback when `E2E=1`)
- `GET /api/config` — returns `{ polishEnabled, publicDemo, version }`
- `POST /api/chatkit/session` — ChatKit session endpoint

### UI
- **Header**: "Tool Credit Score" + "by Zishan Ali Khan" + "Open-source lab project" pill + "ⓘ About" button
- **3-column layout**: Import | Chat | Audit Results
- **Results Panel**: Auto-switches between Imported (preview), Scorecard, Issues, Diff, and Fixed JSON tabs.
- **Export Button**: Explicitly named "Export Fixed JSON" and is only enabled after Auto-Fix.
- **About modal**: LinkedIn link, GitHub placeholder, version, mode note
- **Footer**: Attribution + LinkedIn link + version
- **Polish button**: Disabled with tooltip in PUBLIC_DEMO, enabled when `polishEnabled=true`
- Enterprise audit aesthetic (charcoal + muted teal)
- Stable `data-testid` selectors on all key elements

### Testing (7 E2E tests, all passing)
1. Paste → Score → Auto-Fix → Export
2. Upload → Score → Auto-Fix
3. GitHub → Score (fixture)
4. MCP tab disabled
5. Header branding + About modal
6. Polish button disabled in PUBLIC_DEMO
7. /api/polish returns 403 with POLISH_DISABLED

### Documentation
- README.md, PLAN.md, HANDOFF.md, CHANGELOG.md, DEPLOYMENT.md
- DEMO_SCRIPT_ENTERPRISE.md (deterministic + local polish paths)
- POLISH_MODE.md, QA_CHECKLIST.md

---

## ChatKit vs Polish

These are **independent features**:
- **ChatKit**: Chat widget UI from `@openai/chatkit-react`. Currently in Local Mode (standard React chat). Requires Agent Builder backend for Live mode.
- **Polish**: Server-side GPT-4o-mini call to rewrite descriptions. Requires `OPENAI_API_KEY` + `ENABLE_POLISH=true`.

---

## What's NOT Done

1. **GitHub/Vercel deployment** — documented in DEPLOYMENT.md, not executed
2. **Full ChatKit widget rendering** — requires Agent Builder backend
3. **YAML import** — parser only handles JSON
4. **MCP Server URL discovery** — tab visible but disabled

---

## Key Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Main orchestration, header, About modal, footer |
| `src/components/ChatPanel.tsx` | Chat + action buttons + polish tooltip |
| `src/components/ResultsPanel.tsx` | Scorecard, issues, diff |
| `src/lib/rubric.ts` | Scoring engine |
| `src/lib/autofix.ts` | Auto-fix transforms |
| `src/lib/polish.ts` | LLM polish (configurable model) |
| `src/app/api/polish/route.ts` | Three-gate enforcement |
| `src/app/api/config/route.ts` | polishEnabled, publicDemo, version |
| `e2e/studio.spec.ts` | 7 Playwright E2E tests |
| `.env.example` | Env var documentation |

---

## Next Steps (Ordered)

1. Push to private GitHub repo
2. Deploy to Vercel with `PUBLIC_DEMO=true` (see `docs/DEPLOYMENT.md`)
3. Repo hygiene: license, badges, screenshots

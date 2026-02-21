# Architecture & Plan

## Problem Statement

MCP tool specifications are handwritten and inconsistent. Missing descriptions, wrong parameter types, no examples, and non-standard naming cause agent retries, hallucinations, and unnecessary LLM cost. There is no standard linting tool.

## Solution

A deterministic scoring engine + auto-fixer that runs without any LLM, with an optional LLM polish layer.

---

## Pipeline

```
Input (JSON)  →  Parser  →  Scorer (deterministic)  →  Auto-Fixer (deterministic)  →  [Polish (LLM)]  →  Export
```

### 1. Parser (`src/lib/parser.ts`)

Accepts multiple input formats:
- Single tool object `{ name, description, inputSchema }`
- Array of tools `[{ ... }, { ... }]`
- Wrapper objects `{ tools: [...] }` or `{ functions: [...] }`
- GitHub URLs → searches well-known paths (`mcp.json`, `tools.json`, `openapi.json`)

### 2. Scorer (`src/lib/rubric.ts`) — Deterministic

Five weighted categories, each scored 0–100:

| Category | Weight | Checks |
|---|---|---|
| Naming | 15% | snake_case format, verb prefix (get/search/create/...), length 3–40 chars |
| Description | 25% | Present, 10+ words, starts with action verb, mentions return values |
| Parameters | 25% | All have `type`, all have `description`, `required` array present |
| Examples | 15% | At least 1 valid example with realistic values |
| Best Practices | 20% | `annotations` object, error documentation, `additionalProperties: false` |

Final score = weighted average. Grades: A (90+), B (80+), C (70+), D (60+), F (<60).

### 3. Auto-Fixer (`src/lib/autofix.ts`) — Deterministic

Normalization transforms (no LLM):
- Name → snake_case with verb prefix
- Missing description → generated from name + parameter names
- Missing parameter types → inferred as `"string"`
- Missing parameter descriptions → generated from key name
- Missing `required` array → all parameters marked required
- Missing examples → generated from parameter schema
- Missing annotations → stub added

### 4. Polish (`src/lib/polish.ts`) — Optional LLM

Calls GPT-4o-mini to rewrite descriptions and examples for clarity. **Only runs when:**
- `OPENAI_API_KEY` is set
- `ENABLE_POLISH=true` (or key present)
- `PUBLIC_DEMO` is NOT `true`

---

## API Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/score` | None | Score tool specs (deterministic) |
| `POST` | `/api/fix` | None | Auto-fix tool specs (deterministic) |
| `POST` | `/api/polish` | Server-side key | LLM polish; returns 403 in public demo |
| `POST` | `/api/import/github` | None | Fetch tools from GitHub URL |
| `GET` | `/api/config` | None | Returns `{ polishAvailable, publicDemo }` |
| `POST` | `/api/chatkit/session` | Server-side key | ChatKit session token (when configured) |

---

## UI Architecture

3-column grid layout:

```
┌──────────┬──────────────┬─────────────┐
│  IMPORT  │   CHAT/LOG   │   RESULTS   │
│  TOOLS   │              │   (Audit)   │
│          │              │             │
│ Paste    │ Welcome msg  │ Scorecard   │
│ Upload   │ Score msg    │ Issues      │
│ GitHub   │ Fix msg      │ Diff        │
│ MCP(soon)│ Polish msg   │ Fixed JSON  │
│          │              │             │
│          │ [Actions]    │ [Download]  │
└──────────┴──────────────┴─────────────┘
```

### ChatKit Integration

- `@openai/chatkit-react` is imported for the `ChatKit` component and `useChatKit` hook
- On mount, the app probes `/api/chatkit/session` — if 200, it shows "ChatKit Live"; otherwise "Local Mode"
- Local Mode: standard React chat UI (custom message bubbles, action buttons)
- ChatKit capabilities available when backend is configured: dark theme, custom theming, starter prompts, composer tools, history, feedback, retry, entity tags, widgets, file attachments

---

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | No | — | Enables LLM polish (server-side only) |
| `ENABLE_POLISH` | No | `true` if key set | Explicit opt-in for polish |
| `PUBLIC_DEMO` | No | `false` | Set `true` to disable polish (403) |
| `E2E` | No | — | Set by Playwright; enables GitHub fixture fallback |

---

## Next Steps

- [ ] GitHub repo creation + CI/CD pipeline
- [ ] Vercel deployment
- [ ] Full ChatKit widget integration (requires Agent Builder workflow backend)
- [ ] YAML import support
- [ ] MCP Server URL discovery
- [ ] Before/after score comparison

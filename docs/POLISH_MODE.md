# Polish Mode

> LLM-powered description rewriting for MCP tool specs. Local-only by default.

## What Polish Does

Polish calls GPT-4o-mini (configurable via `POLISH_MODEL`) to:

1. Rewrite tool descriptions to be clear and action-oriented
2. Improve parameter descriptions for unambiguity
3. Add or improve examples with realistic values

## What Polish Does NOT Do

- ❌ Change parameter names, types, or required fields
- ❌ Add or remove parameters
- ❌ Modify the core schema structure
- ❌ Change semantic behavior of the tool

The system prompt explicitly instructs: *"Do NOT change core schema semantics."*

---

## Enabling Polish (Local Only)

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
OPENAI_API_KEY=sk-your-key-here
ENABLE_POLISH=true
```

Then restart the dev server. The Polish button in the UI will become active.

---

## Three-Gate Enforcement

The `/api/polish` endpoint only runs if **all three** conditions are met:

| Gate | Check | Fail response |
|---|---|---|
| `PUBLIC_DEMO !== 'true'` | Not a public deployment | 403 `POLISH_DISABLED` |
| `ENABLE_POLISH === 'true'` | Explicitly opted in | 403 `POLISH_DISABLED` |
| `OPENAI_API_KEY` is set | Key present server-side | 403 `POLISH_DISABLED` |

### 403 Response Format

```json
{
  "ok": false,
  "error": {
    "code": "POLISH_DISABLED",
    "message": "Polish is disabled in the public demo. Run locally to enable."
  }
}
```

---

## Security

- **`OPENAI_API_KEY` is never sent to the client.** It is only used server-side in `/api/polish`.
- The `/api/config` endpoint exposes only: `{ polishEnabled: boolean, publicDemo: boolean, version: string }`
- In PUBLIC_DEMO mode, the Polish button appears disabled with the tooltip: *"Disabled on public demo. Run locally to enable."*

---

## Configuring the Model

```bash
# Default: gpt-4o-mini (cheap, fast, good enough for rewrites)
POLISH_MODEL=gpt-4o-mini

# Or use a different model:
POLISH_MODEL=gpt-4o
```

---

## How Polish Integrates with the Pipeline

```
Import → Score (deterministic) → Auto-Fix (deterministic) → [Polish (LLM)] → Export
```

- Polish operates on the already-fixed tools (if Auto-Fix has been run) or the original tools
- After polish, you can re-score to verify descriptions improved without semantic changes
- Polish is completely optional — the core value (score + auto-fix) is 100% deterministic

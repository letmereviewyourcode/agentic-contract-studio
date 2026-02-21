# Polish Mode

> LLM-powered description rewriting for MCP tool specs. Local-only by default.

## What Polish Does

Polish calls an OpenAI-compatible LLM (configurable via `POLISH_MODEL` and Base URL) to:

1. Rewrite tool descriptions to be clear and action-oriented
2. Improve parameter descriptions for unambiguity
3. Add or improve examples with realistic values
4. Provide a brief explanation of its reasoning directly in the chat UI

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
| `PUBLIC_DEMO !== 'true'` | Not a public deployment | 400 `MISSING_API_KEY` (unless user provides a BYOK key) |
| `ENABLE_POLISH === 'true'` | Explicitly opted in | 400 `MISSING_API_KEY` |
| `OPENAI_API_KEY` is set | Key present server-side | 400 `MISSING_API_KEY` |

### 400 Response Format

```json
{
  "ok": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "Central LLM polish is disabled in the public demo. Provide your own OpenAI-compatible API key."
  }
}
```

---

## Security

- **`OPENAI_API_KEY` is never sent to the client.** It is only used server-side in `/api/polish`.
- The `/api/config` endpoint exposes only: `{ polishEnabled: boolean, publicDemo: boolean, version: string }`
- In PUBLIC_DEMO mode, the Polish button appears disabled with the tooltip: *"Disabled on public demo. Run locally to enable."*

---

## Configuring the Model and Provider (BYOK)

Because the Studio uses the OpenAI SDK underneath, it can be repointed at **any API that conforms to the OpenAI chat completions specification** (such as LiteLLM, vLLM, Ollama, Groq, etc.). 

Users can override these dynamically in the About Menu BYOK inputs:

- **Base URL**: e.g. `http://localhost:4000/v1`
- **Model Name**: e.g. `claude-3-5-sonnet-20241022` or `llama3.1`

Server defaults can be set in `.env.local`:
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
